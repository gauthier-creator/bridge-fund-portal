import { createContext, useContext, useReducer, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { generateDocumentURLs } from "../utils/generateDocument";
import * as orderService from "../services/orderService";
import * as collateralService from "../services/collateralService";

const AppContext = createContext(null);

// ─── Fallback local data (used when Supabase is not configured) ───
const localFallback = {
  orders: [
    {
      id: "BF-2026-0001", type: "direct", lpName: "Fontaine Élise", societe: "Fontaine Capital",
      shareClass: 1, montant: 800000, date: "2025-10-12", status: "pending", kycStatus: "Validé",
      paymentStatus: "Reçu", personType: "morale", pays: "France", typeInvestisseur: "Professionnel",
      signatureDate: "2025-10-12 14:22:00", origineFonds: "Cession d'actifs financiers / entreprise",
      adresse: "15 rue de la Paix, 75002 Paris", pepStatus: "non",
      documents: [
        { name: "kbis_fontaine_capital.pdf", type: "K-bis", size: "1.8 Mo", date: "2025-10-10" },
        { name: "passeport_fontaine.pdf", type: "Pièce d'identité", size: "2.3 Mo", date: "2025-10-10" },
        { name: "attestation_fonds_fontaine.pdf", type: "Justificatif origine des fonds", size: "890 Ko", date: "2025-10-11" },
      ],
    },
    {
      id: "BF-2026-0002", type: "intermediated", intermediaire: "SwissLife Banque Privée",
      lpName: "Martin Olivier", societe: null, shareClass: 2, montant: 100000, date: "2025-12-15",
      status: "pending", kycStatus: "Validé", paymentStatus: "Reçu", personType: "physique",
      pays: "France", typeInvestisseur: "Averti (well-informed)", signatureDate: "2025-12-15 09:45:00",
      origineFonds: "Épargne accumulée", adresse: "8 boulevard Haussmann, 75009 Paris", pepStatus: "non",
      documents: [
        { name: "cni_martin_olivier.pdf", type: "Pièce d'identité", size: "1.5 Mo", date: "2025-12-14" },
        { name: "justificatif_domicile_martin.pdf", type: "Justificatif de domicile", size: "720 Ko", date: "2025-12-14" },
        { name: "avis_imposition_martin.pdf", type: "Justificatif origine des fonds", size: "1.1 Mo", date: "2025-12-14" },
      ],
    },
    {
      id: "BF-2026-0003", type: "intermediated", intermediaire: "SwissLife Banque Privée",
      lpName: "Weber Thomas", societe: "Weber Holding AG", shareClass: 1, montant: 500000,
      date: "2026-01-20", status: "pending", kycStatus: "Validé", paymentStatus: "Reçu",
      personType: "morale", pays: "Suisse", typeInvestisseur: "Professionnel",
      signatureDate: "2026-01-20 11:10:00", origineFonds: "Revenus d'activité professionnelle",
      adresse: "Bahnhofstrasse 42, 8001 Zürich", pepStatus: "non",
      documents: [
        { name: "handelsregister_weber.pdf", type: "Registre de commerce", size: "2.1 Mo", date: "2026-01-18" },
        { name: "passeport_weber.pdf", type: "Pièce d'identité", size: "1.9 Mo", date: "2026-01-18" },
        { name: "statuts_weber_holding.pdf", type: "Statuts société", size: "3.2 Mo", date: "2026-01-19" },
        { name: "ubo_declaration_weber.pdf", type: "Déclaration UBO", size: "540 Ko", date: "2026-01-19" },
      ],
    },
  ],
  collateralPositions: [
    { id: 1, owner: "Dupont Patrimoine SAS", tokens: 200, type: "Staking", pool: "BF/ADA", apy: 8.2, date: "2026-02-15" },
    { id: 2, owner: "VDB Family Office", tokens: 500, type: "Staking", pool: "BF/ADA", apy: 8.2, date: "2026-02-20" },
    { id: 3, owner: "Schneider Wealth AG", tokens: 300, type: "Staking", pool: "BF/ADA", apy: 8.2, date: "2026-03-01" },
    { id: 4, owner: "Catherine Lefèvre", tokens: 100, type: "Collatéral", pool: "Lending", apy: 5.5, date: "2026-03-05" },
  ],
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
          // Generate placeholder doc URLs for documents without storage paths
          const enrichedOrders = orders.map((order) => ({
            ...order,
            documents: order.documents?.map((d) => ({
              ...d,
              url: d.storagePath ? null : generateDocumentURLs([d], order.lpName, order.id)[0]?.url,
            })) || [],
          }));
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
        await orderService.createOrder(order);
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
        finalPosition = await collateralService.addCollateralPosition(position);
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
