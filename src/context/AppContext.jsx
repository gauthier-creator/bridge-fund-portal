import { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { generateDocumentURLs, getDocumentURL } from "../utils/generateDocument";
import * as orderService from "../services/orderService";
import * as collateralService from "../services/collateralService";

const AppContext = createContext(null);

// ─── Fallback local data (used when Supabase is not configured) ───
const localFallback = {
  orders: [],
  collateralPositions: [],
};

// ─── Reducer (same logic, works for both local and Supabase modes) ───

function reducer(state, action) {
  switch (action.type) {
    case "SET_DATA":
      return { ...state, ...action.payload, loading: false };
    case "SUBMIT_ORDER":
      return { ...state, orders: [...state.orders, action.payload] };
    case "VALIDATE_ORDER":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id
            ? { ...o, status: "validated", validatedAt: action.payload.validatedAt }
            : o
        ),
      };
    case "REJECT_ORDER":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id
            ? { ...o, status: "rejected", rejectedAt: action.payload.rejectedAt, rejectReason: action.payload.reason }
            : o
        ),
      };
    case "UPDATE_ORDER_DOCS":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id ? { ...o, documents: action.payload.documents } : o
        ),
      };
    case "ADD_COLLATERAL":
      return { ...state, collateralPositions: [...state.collateralPositions, action.payload] };
    case "REMOVE_COLLATERAL":
      return { ...state, collateralPositions: state.collateralPositions.filter((p) => p.id !== action.payload) };
    default:
      return state;
  }
}

const emptyState = { orders: [], collateralPositions: [], loading: true };

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, emptyState);
  const isSupabase = !!supabase;

  // ─── Load data on mount ───
  useEffect(() => {
    let cancelled = false;

    async function loadFromSupabase() {
      try {
        const [orders, positions] = await Promise.all([
          orderService.fetchOrders(),
          collateralService.fetchCollateralPositions(),
        ]);
        if (!cancelled) {
          // Resolve document URLs: signed URL for stored docs, generated PDF for others
          const enrichedOrders = await Promise.all(
            orders.map(async (order) => ({
              ...order,
              documents: await Promise.all(
                (order.documents || []).map(async (d) => {
                  if (d.storagePath) {
                    const url = await getDocumentURL(d.storagePath);
                    return { ...d, url };
                  }
                  return { ...d, url: generateDocumentURLs([d], order.lpName, order.id)[0]?.url };
                })
              ),
            }))
          );
          dispatch({ type: "SET_DATA", payload: { orders: enrichedOrders, collateralPositions: positions } });
        }
      } catch (err) {
        console.error("Supabase load failed, using fallback:", err?.message || err?.code || JSON.stringify(err));
        if (!cancelled) loadLocal();
      }
    }

    function loadLocal() {
      const orders = localFallback.orders.map((order) => ({
        ...order,
        documents: order.documents ? generateDocumentURLs(order.documents, order.lpName, order.id) : [],
      }));
      dispatch({ type: "SET_DATA", payload: { orders, collateralPositions: localFallback.collateralPositions } });
    }

    if (isSupabase) {
      loadFromSupabase();
    } else {
      loadLocal();
    }

    return () => { cancelled = true; };
  }, [isSupabase]);

  // ─── Actions ───

  const submitOrder = useCallback(async (order) => {
    if (isSupabase) {
      try {
        // Inject current user ID into the order
        const { data: { user } } = await supabase.auth.getUser();
        const enrichedOrder = { ...order };
        if (user) {
          enrichedOrder.userId = enrichedOrder.userId || user.id;
        }
        await orderService.createOrder(enrichedOrder);
        dispatch({ type: "SUBMIT_ORDER", payload: enrichedOrder });
        return;
      } catch (err) {
        console.error("Failed to persist order:", err);
      }
    }
    dispatch({ type: "SUBMIT_ORDER", payload: order });
  }, [isSupabase]);

  const validateOrder = useCallback(async (orderId) => {
    let validatedAt = new Date().toISOString();
    if (isSupabase) {
      try {
        const result = await orderService.validateOrder(orderId);
        validatedAt = result.validatedAt;
      } catch (err) {
        console.error("Failed to validate order:", err);
      }
    }
    dispatch({ type: "VALIDATE_ORDER", payload: { id: orderId, validatedAt } });
  }, [isSupabase]);

  const rejectOrder = useCallback(async (orderId, reason) => {
    let rejectedAt = new Date().toISOString();
    if (isSupabase) {
      try {
        const result = await orderService.rejectOrder(orderId, reason);
        rejectedAt = result.rejectedAt;
      } catch (err) {
        console.error("Failed to reject order:", err);
      }
    }
    dispatch({ type: "REJECT_ORDER", payload: { id: orderId, reason, rejectedAt } });
  }, [isSupabase]);

  const addCollateral = useCallback(async (position) => {
    let finalPosition = { ...position, id: Date.now() };
    if (isSupabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const enriched = { ...position };
        if (user) enriched.userId = enriched.userId || user.id;
        finalPosition = await collateralService.addCollateralPosition(enriched);
      } catch (err) {
        console.error("Failed to persist collateral:", err);
      }
    }
    dispatch({ type: "ADD_COLLATERAL", payload: finalPosition });
  }, [isSupabase]);

  const removeCollateral = useCallback(async (positionId) => {
    if (isSupabase) {
      try {
        await collateralService.removeCollateralPosition(positionId);
      } catch (err) {
        console.error("Failed to remove collateral:", err);
      }
    }
    dispatch({ type: "REMOVE_COLLATERAL", payload: positionId });
  }, [isSupabase]);

  // ─── Loading screen ───
  if (state.loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-navy/60 text-sm font-medium">Chargement des données…</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ ...state, submitOrder, validateOrder, rejectOrder, addCollateral, removeCollateral }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
