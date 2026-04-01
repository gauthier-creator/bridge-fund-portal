import { useState, useEffect, useRef } from "react";
import { listFunds, getFund } from "../services/fundService";
import { shortenHash, getExplorerUrl } from "../services/cardanoService";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* ═══════════════════════════════════════════════════════
   CONSTELLATION CANVAS
   ═══════════════════════════════════════════════════════ */

function ConstellationCanvas() {
  const canvasRef = useRef(null);
  const scaleRef = useRef(1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Scroll-driven zoom
  useEffect(() => {
    const onScroll = () => {
      const s = 1 + Math.min(window.scrollY / 500, 0.5) * 1;
      if (canvasRef.current) canvasRef.current.style.transform = `scale(${s})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.width) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const particles = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
      });
    }

    let raf;
    const draw = () => {
      ctx.fillStyle = "rgba(5, 5, 5, 0.05)";
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > dimensions.width) p.vx *= -1;
        if (p.y < 0 || p.y > dimensions.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const o = particles[j];
          const dx = p.x - o.x;
          const dy = p.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [dimensions]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: dimensions.width, height: dimensions.height, transformOrigin: "center center" }}
      className="absolute inset-0"
    />
  );
}

/* ═══════════════════════════════════════════════════════
   COUNT UP HOOK
   ═══════════════════════════════════════════════════════ */

function useCountUp(end, duration = 2000, delay = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const t0 = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        const val = Math.floor(eased * end);
        if (val !== ref.current) { ref.current = val; setCount(val); }
        if (p < 1) requestAnimationFrame(tick);
      };
      tick();
    }, delay);
    return () => clearTimeout(timer);
  }, [end, duration, delay]);
  return count;
}

/* ═══════════════════════════════════════════════════════
   METRIC CARD
   ═══════════════════════════════════════════════════════ */

function MetricCard({ value, suffix = "", label, delay = 0 }) {
  const count = useCountUp(value, 2000, delay);
  return (
    <div
      className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">
        {count}{suffix}
      </div>
      <div className="text-sm text-white/50 font-light tracking-wide">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FUND CARD
   ═══════════════════════════════════════════════════════ */

function FundCard({ fund, onClick }) {
  return (
    <button
      onClick={() => onClick(fund.slug)}
      className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden text-left hover:border-[#D1D5DB] transition-all group"
    >
      <div className="bg-[#F7F8FA] p-6 relative overflow-hidden">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF2FF] text-[#4F7DF3] text-[11px] font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />
            {fund.regulatoryStatus || "CSSF regulated"}
          </div>
          <h3 className="text-lg font-bold text-[#0D0D12] mb-1">{fund.fundName}</h3>
          <p className="text-sm text-[#5F6B7A] line-clamp-2">{fund.fundSubtitle}</p>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><p className="text-[13px] text-[#9AA4B2] font-medium">Rendement</p><p className="text-lg font-bold text-[#0D0D12] mt-0.5 tabular-nums">{fund.targetReturn || "—"}</p></div>
          <div><p className="text-[13px] text-[#9AA4B2] font-medium">NAV / Part</p><p className="text-lg font-bold text-[#0D0D12] mt-0.5 tabular-nums">{fund.navPerShare ? fmt(fund.navPerShare) : "—"}</p></div>
          <div><p className="text-[13px] text-[#9AA4B2] font-medium">Invest. min.</p><p className="text-sm font-medium text-[#0D0D12] mt-0.5 tabular-nums">{fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"}</p></div>
          <div><p className="text-[13px] text-[#9AA4B2] font-medium">Taille</p><p className="text-sm font-medium text-[#0D0D12] mt-0.5 tabular-nums">{fund.fundSize ? fmt(fund.fundSize) : "—"}</p></div>
        </div>
        {fund.cardanoPolicyId && (
          <div className="flex items-center gap-2 bg-[#ECFDF5] rounded-xl px-3 py-2 text-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
            <span className="text-[#5F6B7A]">Registre Cardano</span>
            <span className="font-mono text-[#9AA4B2] ml-auto">{shortenHash(fund.cardanoPolicyId, 6)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0F2F5]">
          <span className="text-xs text-[#9AA4B2]">{fund.jurisdiction} · {fund.legalForm}</span>
          <span className="text-sm font-medium text-[#4F7DF3] group-hover:translate-x-1 transition-transform">Voir le fonds →</span>
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   PUBLIC FUND DETAIL
   ═══════════════════════════════════════════════════════ */

function PublicFundDetail({ fundSlug, onBack, onInvest }) {
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fundSlug) return;
    setLoading(true);
    getFund(fundSlug).then(setFund).finally(() => setLoading(false));
  }, [fundSlug]);

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center"><div className="w-10 h-10 border-4 border-[#E8ECF1] border-t-[#0D0D12] rounded-full animate-spin mx-auto mb-4" /></div>;
  if (!fund) return <div className="max-w-7xl mx-auto px-6 py-20 text-center"><p className="text-[#9AA4B2] text-sm mb-4">Fonds introuvable</p><button onClick={onBack} className="text-sm text-[#4F7DF3] font-medium">← Retour</button></div>;

  const highlights = Array.isArray(fund.highlights) ? fund.highlights : [];
  const shareClasses = Array.isArray(fund.shareClasses) ? fund.shareClasses : [];
  const structureItems = [
    { label: "Juridiction", value: fund.jurisdiction },
    { label: "Forme juridique", value: fund.legalForm },
    { label: "AIFM", value: fund.aifm },
    { label: "Dépositaire", value: fund.custodian },
    { label: "Auditeur", value: fund.auditor },
    { label: "Administrateur", value: fund.administrator },
    { label: "Régulation", value: fund.regulatoryStatus },
  ].filter((i) => i.value);

  return (
    <>
      <section className="bg-[#0D0D12] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15]">
          <svg width="100%" height="100%"><defs><pattern id="hero-dots-detail" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity="0.3" /></pattern></defs><rect width="100%" height="100%" fill="url(#hero-dots-detail)" /></svg>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 relative">
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Tous les fonds
          </button>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 text-[#93A3F8] text-[11px] font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#93A3F8]" />
              {fund.regulatoryStatus}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">{fund.fundName}</h1>
            <p className="text-lg text-white/70 mb-8">{fund.fundSubtitle}</p>
            <p className="text-base text-white/50 mb-10 leading-relaxed max-w-2xl">{fund.description}</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onInvest(fund)} className="px-8 py-3.5 bg-white text-[#0D0D12] font-medium rounded-xl hover:bg-white/90 transition-colors text-sm">Commencer à investir</button>
              {fund.cardanoTxHash && (
                <a href={getExplorerUrl(fund.cardanoTxHash, fund.blockchainNetwork)} target="_blank" rel="noopener noreferrer" className="px-6 py-3.5 bg-transparent border border-white/20 text-white/80 rounded-xl hover:border-white/40 transition-colors text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
                  Voir sur Cardano
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-[#E8ECF1]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              ["Rendement cible", fund.targetReturn || "—"],
              ["NAV / Part", fund.navPerShare ? fmt(fund.navPerShare) : "—"],
              ["Investissement min.", fund.minimumInvestment ? fmt(fund.minimumInvestment) : "—"],
              ["Taille du fonds", fund.fundSize ? fmt(fund.fundSize) : "—"],
            ].map(([label, val]) => (
              <div key={label} className="text-center">
                <p className="text-[13px] text-[#9AA4B2] font-medium mb-1">{label}</p>
                <p className="text-2xl font-bold text-[#0D0D12] tabular-nums">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {fund.cardanoPolicyId && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl border border-[#E8ECF1] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
              <h3 className="text-sm font-semibold text-[#0D0D12]">Registre Blockchain Cardano</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-[#F7F8FA] rounded-xl p-4"><p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Policy ID</p><p className="font-mono text-[#0D0D12] text-xs break-all">{fund.cardanoPolicyId}</p></div>
              <div className="bg-[#F7F8FA] rounded-xl p-4"><p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Script Address</p><p className="font-mono text-[#0D0D12] text-xs break-all">{shortenHash(fund.cardanoScriptAddress, 12)}</p></div>
              <div className="bg-[#F7F8FA] rounded-xl p-4"><p className="text-[13px] text-[#9AA4B2] font-medium mb-1">Transaction</p><p className="font-mono text-[#0D0D12] text-xs break-all">{shortenHash(fund.cardanoTxHash, 12)}</p></div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {fund.strategy && <div><h2 className="text-2xl font-bold text-[#0D0D12] mb-4">Stratégie d'investissement</h2><p className="text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.strategy}</p></div>}
          {fund.investmentThesis && <div><h2 className="text-2xl font-bold text-[#0D0D12] mb-4">Thèse d'investissement</h2><p className="text-[#5F6B7A] leading-relaxed whitespace-pre-line">{fund.investmentThesis}</p></div>}
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="bg-[#F7F8FA]">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-bold text-[#0D0D12] mb-8 text-center">Points clés</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-5 border border-[#E8ECF1]">
                  <div className="w-8 h-8 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#00C48C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm text-[#0D0D12] font-medium">{h}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {shareClasses.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#0D0D12] mb-8 text-center">Classes de parts</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {shareClasses.map((sc) => (
              <div key={sc.id} className="bg-white rounded-2xl border border-[#E8ECF1] p-6 hover:border-[#D1D5DB] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${sc.id === 1 ? "bg-[#0D0D12] text-white" : "bg-[#EEF2FF] text-[#4F7DF3]"}`}>{sc.id}</div>
                  <h4 className="text-sm font-semibold text-[#0D0D12]">{sc.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Rendement cible</span><span className="font-medium text-[#0D0D12] tabular-nums">{sc.targetReturn}</span></div>
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Durée</span><span className="font-medium text-[#0D0D12]">{sc.duration}</span></div>
                  <div className="flex justify-between"><span className="text-[#5F6B7A]">Risque</span><span className="font-medium text-[#0D0D12]">{sc.risk}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {structureItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#0D0D12] mb-8 text-center">Structure du fonds</h2>
          <div className="bg-white rounded-2xl border border-[#E8ECF1] overflow-hidden max-w-2xl mx-auto">
            {structureItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 hover:bg-[#FAFBFC] ${i < structureItems.length - 1 ? "border-b border-[#F0F2F5]" : ""}`}>
                <span className="text-sm text-[#5F6B7A]">{item.label}</span>
                <span className="text-sm font-medium text-[#0D0D12]">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[#0D0D12] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15]">
          <svg width="100%" height="100%"><defs><pattern id="cta-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity="0.3" /></pattern></defs><rect width="100%" height="100%" fill="url(#cta-dots)" /></svg>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center relative">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à investir ?</h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">Accédez à {fund.fundName} avec un rendement cible de {fund.targetReturn || "8-12%"} net annuel.</p>
          <button onClick={() => onInvest(fund)} className="px-10 py-4 bg-white text-[#0D0D12] font-semibold rounded-xl hover:bg-white/90 transition-colors text-base">Commencer à investir</button>
          <p className="text-white/30 text-xs mt-4 tabular-nums">Investissement minimum : {fund.minimumInvestment ? fmt(fund.minimumInvestment) : "125 000 €"}</p>
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PUBLIC PAGE
   ═══════════════════════════════════════════════════════ */

export default function FundPublicPage({ onInvest, onSignup }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState(null);

  useEffect(() => {
    listFunds().then(setFunds).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ─── Header ─── */}
      <header className="absolute top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedSlug(null)} className="w-9 h-9 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
              <span className="text-white font-bold text-sm">BF</span>
            </button>
            <span className="text-[15px] font-semibold text-white tracking-[-0.01em]">Bridge Fund</span>
          </div>
          <div className="flex items-center gap-3">
            {onSignup && (
              <button onClick={onSignup} className="px-5 py-2.5 bg-white text-[#0D0D12] text-sm font-semibold rounded-full hover:bg-white/90 transition-colors">
                S'inscrire
              </button>
            )}
            <button onClick={() => onInvest()} className="px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-medium rounded-full hover:bg-white/20 transition-colors">
              Se connecter
            </button>
          </div>
        </div>
      </header>

      {selectedSlug ? (
        <PublicFundDetail
          fundSlug={selectedSlug}
          onBack={() => setSelectedSlug(null)}
          onInvest={(fund) => onInvest(fund)}
        />
      ) : (
        <>
          {/* ─── HERO with Constellation ─── */}
          <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#050505]">
            {/* Constellation Background */}
            <div className="absolute inset-0 z-0">
              <ConstellationCanvas />
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-transparent to-[#050505] pointer-events-none z-[1]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] z-[1]" />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 md:px-6 py-20">
              <div className="max-w-5xl mx-auto">
                {/* Badge */}
                <div className="flex justify-center mb-8 stagger-hero">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] pulse-dot" />
                    <span className="text-sm text-white/70 font-light tracking-wide">
                      Plateforme d'investissement tokenisée
                    </span>
                  </div>
                </div>

                {/* Headline */}
                <div className="text-center mb-6 animate-fade-in-up" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
                  <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]">
                    <span className="bg-gradient-to-b from-white via-white/95 to-white/80 bg-clip-text text-transparent">
                      Investissez dans des
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      fonds tokenisés
                    </span>
                  </h1>
                </div>

                {/* Subtitle */}
                <div className="text-center mb-12 animate-fade-in-up" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
                  <p className="text-base sm:text-lg md:text-xl text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
                    Accédez à des opportunités d'investissement alternatif régulées, tokenisées et transparentes sur la blockchain Cardano.
                  </p>
                </div>

                {/* CTA */}
                <div className="flex justify-center mb-20 animate-fade-in-up" style={{ animationDelay: "600ms", animationFillMode: "both" }}>
                  <a
                    href="#funds"
                    className="group relative overflow-hidden inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium text-base px-8 py-4 rounded-xl shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] transition-all duration-300 border border-white/10"
                  >
                    <span className="relative z-10">Découvrir les fonds</span>
                    <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </a>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
                  <MetricCard value={42} suffix="M€" label="Valeur totale verrouillée" delay={600} />
                  <MetricCard value={18} suffix="M€" label="Tokens émis" delay={750} />
                  <MetricCard value={99} suffix=".9%" label="Disponibilité on-chain" delay={900} />
                </div>
              </div>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none z-[2]" />
          </section>

          {/* ─── Fund Catalog ─── */}
          <section id="funds" className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[#0D0D12]">Fonds disponibles</h2>
              <p className="text-sm text-[#9AA4B2] mt-2">Sélectionnez un fonds pour voir les détails et investir</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-[#E8ECF1] border-t-[#0D0D12] rounded-full animate-spin mx-auto mb-4" />
              </div>
            ) : funds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#9AA4B2] text-sm">Aucun fonds disponible pour le moment</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {funds.map((fund) => (
                  <FundCard key={fund.id} fund={fund} onClick={setSelectedSlug} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#E8ECF1] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-[#9AA4B2]">
          <span>Bridge Fund · CSSF regulated · Luxembourg</span>
          <span>Portail sécurisé · Données en temps réel</span>
        </div>
      </footer>
    </div>
  );
}
