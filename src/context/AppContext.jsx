import { createContext, useContext, useReducer, useCallback } from "react";
import { generateDocumentURLs } from "../utils/generateDocument";

const AppContext = createContext(null);

const initialState = {
  orders: [
    {
      id: "BF-2026-0001",
      type: "direct",
      lpName: "Fontaine Élise",
      societe: "Fontaine Capital",
      shareClass: 1,
      montant: 800000,
      date: "2025-10-12",
      status: "pending",
      kycStatus: "Validé",
      paymentStatus: "Reçu",
      personType: "morale",
      pays: "France",
      typeInvestisseur: "Professionnel",
      signatureDate: "2025-10-12 14:22:00",
      origineFonds: "Cession d'actifs financiers / entreprise",
      adresse: "15 rue de la Paix, 75002 Paris",
      pepStatus: "non",
      documents: [
        { name: "kbis_fontaine_capital.pdf", type: "K-bis", size: "1.8 Mo", date: "2025-10-10" },
        { name: "passeport_fontaine.pdf", type: "Pièce d'identité", size: "2.3 Mo", date: "2025-10-10" },
        { name: "attestation_fonds_fontaine.pdf", type: "Justificatif origine des fonds", size: "890 Ko", date: "2025-10-11" },
      ],
    },
    {
      id: "BF-2026-0002",
      type: "intermediated",
      intermediaire: "SwissLife Banque Privée",
      lpName: "Martin Olivier",
      societe: null,
      shareClass: 2,
      montant: 100000,
      date: "2025-12-15",
      status: "pending",
      kycStatus: "Validé",
      paymentStatus: "Reçu",
      personType: "physique",
      pays: "France",
      typeInvestisseur: "Averti (well-informed)",
      signatureDate: "2025-12-15 09:45:00",
      origineFonds: "Épargne accumulée",
      adresse: "8 boulevard Haussmann, 75009 Paris",
      pepStatus: "non",
      documents: [
        { name: "cni_martin_olivier.pdf", type: "Pièce d'identité", size: "1.5 Mo", date: "2025-12-14" },
        { name: "justificatif_domicile_martin.pdf", type: "Justificatif de domicile", size: "720 Ko", date: "2025-12-14" },
        { name: "avis_imposition_martin.pdf", type: "Justificatif origine des fonds", size: "1.1 Mo", date: "2025-12-14" },
      ],
    },
    {
      id: "BF-2026-0003",
      type: "intermediated",
      intermediaire: "SwissLife Banque Privée",
      lpName: "Weber Thomas",
      societe: "Weber Holding AG",
      shareClass: 1,
      montant: 500000,
      date: "2026-01-20",
      status: "pending",
      kycStatus: "Validé",
      paymentStatus: "Reçu",
      personType: "morale",
      pays: "Suisse",
      typeInvestisseur: "Professionnel",
      signatureDate: "2026-01-20 11:10:00",
      origineFonds: "Revenus d'activité professionnelle",
      adresse: "Bahnhofstrasse 42, 8001 Zürich",
      pepStatus: "non",
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

function reducer(state, action) {
  switch (action.type) {
    case "SUBMIT_ORDER":
      return { ...state, orders: [...state.orders, action.payload] };
    case "VALIDATE_ORDER":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload ? { ...o, status: "validated", validatedAt: new Date().toISOString() } : o
        ),
      };
    case "REJECT_ORDER":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id
            ? { ...o, status: "rejected", rejectedAt: new Date().toISOString(), rejectReason: action.payload.reason }
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

function initState() {
  return {
    ...initialState,
    orders: initialState.orders.map((order) => ({
      ...order,
      documents: order.documents ? generateDocumentURLs(order.documents, order.lpName, order.id) : [],
    })),
  };
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, initState);

  const submitOrder = useCallback((order) => {
    dispatch({ type: "SUBMIT_ORDER", payload: order });
  }, []);

  const validateOrder = useCallback((orderId) => {
    dispatch({ type: "VALIDATE_ORDER", payload: orderId });
  }, []);

  const rejectOrder = useCallback((orderId, reason) => {
    dispatch({ type: "REJECT_ORDER", payload: { id: orderId, reason } });
  }, []);

  const addCollateral = useCallback((position) => {
    dispatch({ type: "ADD_COLLATERAL", payload: { ...position, id: Date.now() } });
  }, []);

  const removeCollateral = useCallback((positionId) => {
    dispatch({ type: "REMOVE_COLLATERAL", payload: positionId });
  }, []);

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
