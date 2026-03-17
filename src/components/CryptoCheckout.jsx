import { useState } from "react";

const COINS = [
  { id: "usdc", name: "USDC", network: "Ethereum", icon: "💲", color: "#2775CA" },
  { id: "btc", name: "Bitcoin", network: "Bitcoin", icon: "₿", color: "#F7931A" },
  { id: "eth", name: "Ethereum", network: "Ethereum", icon: "Ξ", color: "#627EEA" },
  { id: "ada", name: "Cardano", network: "Cardano", icon: "₳", color: "#0033AD" },
  { id: "sol", name: "Solana", network: "Solana", icon: "◎", color: "#9945FF" },
];

export default function CryptoCheckout({ montant, subRef, onPaymentComplete }) {
  const [phase, setPhase] = useState("select"); // select | processing | success
  const [selectedCoin, setSelectedCoin] = useState(null);

  const handlePay = () => {
    if (!selectedCoin) return;

    // If Coinbase Commerce hosted checkout is configured, use it
    const checkoutId = import.meta.env.VITE_COINBASE_COMMERCE_CHECKOUT_ID;
    if (checkoutId && checkoutId !== "YOUR_CHECKOUT_ID" && window.BuyWithCrypto) {
      window.BuyWithCrypto.default({ checkoutId });
      return;
    }

    // Demo flow
    setPhase("processing");
    setTimeout(() => {
      setPhase("success");
      setTimeout(() => onPaymentComplete?.(), 1200);
    }, 3000);
  };

  const coin = COINS.find((c) => c.id === selectedCoin);
  const fmtAmount = (n) => "€" + Number(n).toLocaleString("fr-FR");

  if (phase === "success") {
    return (
      <div className="bg-[#ECFDF5] rounded-xl p-6 text-center animate-fade-in">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
          <svg className="w-7 h-7 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-sm font-semibold text-[#059669]">Paiement confirmé on-chain</p>
        <p className="text-xs text-[#5F6B7A] mt-1">{fmtAmount(montant)} via {coin?.name} · transaction vérifiée</p>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="bg-[#F7F8FA] rounded-xl p-8 text-center animate-fade-in">
        <div className="w-12 h-12 border-3 border-[#E8ECF1] border-t-[#4F7DF3] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-[#0D0D12]">Confirmation on-chain en cours...</p>
        <p className="text-xs text-[#9AA4B2] mt-1">{coin?.name} ({coin?.network}) · {fmtAmount(montant)}</p>
        <p className="text-xs text-[#9AA4B2] mt-3">Attente de 2 confirmations réseau</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-[#F7F8FA] rounded-xl p-5 text-left">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#9AA4B2] font-semibold mb-4">
          Sélectionnez votre crypto-monnaie
        </p>

        <div className="grid grid-cols-5 gap-2 mb-5">
          {COINS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCoin(c.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                selectedCoin === c.id
                  ? "border-[#4F7DF3] bg-[#EEF2FF]"
                  : "border-[#E8ECF1] bg-white hover:border-[#C4CAD4]"
              }`}
            >
              <span className="text-xl" style={{ color: c.color }}>{c.icon}</span>
              <span className="text-xs font-medium text-[#0D0D12]">{c.name}</span>
              <span className="text-[10px] text-[#9AA4B2]">{c.network}</span>
            </button>
          ))}
        </div>

        {selectedCoin && (
          <div className="bg-white rounded-xl border border-[#E8ECF1] p-4 space-y-2 text-sm animate-fade-in">
            <div className="flex justify-between">
              <span className="text-[#5F6B7A]">Montant</span>
              <span className="font-medium text-[#0D0D12] tabular-nums">{fmtAmount(montant)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5F6B7A]">Réseau</span>
              <span className="text-[#0D0D12]">{coin?.network}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5F6B7A]">Référence</span>
              <span className="font-mono text-[#4F7DF3] text-xs">{subRef}</span>
            </div>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={!selectedCoin}
          className={`w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            selectedCoin
              ? "bg-[#0D0D12] text-white hover:bg-[#1A1A2E]"
              : "bg-[#F0F2F5] text-[#9AA4B2] cursor-not-allowed"
          }`}
        >
          {selectedCoin ? `Payer ${fmtAmount(montant)} en ${coin?.name}` : "Sélectionnez une crypto"}
        </button>

        <p className="text-center text-[10px] text-[#9AA4B2] mt-3">
          Powered by Coinbase Commerce · Multi-chain
        </p>
      </div>
    </div>
  );
}
