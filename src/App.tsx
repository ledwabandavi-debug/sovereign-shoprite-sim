import { useEffect, useMemo, useRef, useState } from "react";
import heroStudents from "@/assets/hero-students.jpg";
import imgMaize from "@/assets/maize.png";
import imgMilk from "@/assets/milk.png";
import imgBread from "@/assets/bread.png";
import imgPads from "@/assets/pads.png";
import imgChoc from "@/assets/choc.png";

/* ============ TYPES & DATA ============ */
type Bucket = "VAULT" | "FLEX";
type SKU = {
  id: string;
  name: string;
  short: string;
  price: number;
  bucket: Bucket;
  img: string;
  accent: string;
};

const INVENTORY: SKU[] = [
  { id: "SKU_BAV_001", name: "Ritebrand Super Maize Meal 10kg", short: "Ritebrand Maize Meal 10kg", price: 79.99, bucket: "VAULT", img: imgMaize, accent: "#f5c518" },
  { id: "SKU_BAV_002", name: "Ritebrand Full Cream Milk 1L", short: "Ritebrand Milk 1L", price: 16.99, bucket: "VAULT", img: imgMilk, accent: "#1f4ea1" },
  { id: "SKU_BAV_003", name: "Albany Superior Sliced White Bread", short: "Albany Superior White Bread", price: 19.99, bucket: "VAULT", img: imgBread, accent: "#1a4a8a" },
  { id: "SKU_BAV_004", name: "Stayfree Maxi Scented Pads", short: "Stayfree Maxi Pads", price: 22.99, bucket: "VAULT", img: imgPads, accent: "#2aa57f" },
  { id: "SKU_BAV_005", name: "Cadbury Dairy Milk Slab 150g", short: "Cadbury Slab 150g", price: 24.99, bucket: "FLEX", img: imgChoc, accent: "#6b3a8f" },
  { id: "SKU_BAV_006", name: "2GB Campus Mobile Data Bundle", short: "2GB Data Bundle", price: 149.0, bucket: "FLEX", img: "", accent: "#5a3aa8" },
];

const TOTAL_POOL = 1650;
const VAULT_INIT = 1155;
const FLEX_INIT = 495;

/* ============ AUDIO ============ */
function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const ctx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current!;
  };
  const beep = () => {
    const ac = ctx();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine"; o.frequency.value = 1380;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.09);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.1);
  };
  const buzz = () => {
    const ac = ctx();
    [220, 160].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.35, ac.currentTime + i * 0.15 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.15 + 0.25);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + i * 0.15); o.stop(ac.currentTime + i * 0.15 + 0.27);
    });
  };
  return { beep, buzz };
}

/* ============ HELPERS ============ */
type ReceiptLine = { sku: SKU; qty: number };
type LedgerRow = {
  ts: string;
  node: string;
  sku: string;
  desc: string;
  value: number;
  whitelist: "WHITELIST" | "VALIDATED" | "VALVE_LOCK";
  hash: string;
};
type PulseRow = { valve: string; tx: string; latency: number; hash: string };

function timeNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")} -2000`;
}
function shortHash() {
  return "Sa" + Array.from({ length: 14 }, () => Math.floor(Math.random() * 16).toString(16)).join("") + "...";
}

/* ============ MAIN APP ============ */
export default function App() {
  const { beep, buzz } = useAudio();
  const [vault, setVault] = useState(VAULT_INIT);
  const [flex, setFlex] = useState(FLEX_INIT);
  const [grit, setGrit] = useState(840);
  const [receipt, setReceipt] = useState<ReceiptLine[]>([
    { sku: INVENTORY[0], qty: 1 },
    { sku: INVENTORY[1], qty: 1 },
    { sku: INVENTORY[2], qty: 1 },
    { sku: INVENTORY[3], qty: 1 },
  ]);
  const [latency, setLatency] = useState(138);
  const [pulse, setPulse] = useState(false);
  const [beam, setBeam] = useState(false);
  const [violation, setViolation] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>(INVENTORY.slice(0, 4).map((s): LedgerRow => ({
    ts: timeNow(), node: "BAV_ST_001", sku: s.id, desc: `${s.short} — R${s.price.toFixed(2)}`,
    value: s.price, whitelist: s.id === "SKU_BAV_002" ? "VALIDATED" : "WHITELIST", hash: `Compliance Hashing(${shortHash()}`,
  })));
  const [telemetry, setTelemetry] = useState<PulseRow[]>([
    { valve: "WHITELIST_APPROVED", tx: "transaction3", latency: 138, hash: "" },
    { valve: "WHITELIST_APPROVED", tx: "transaction1", latency: 136, hash: "" },
    { valve: "WHITELIST_APPROVED", tx: "transaction2", latency: 126, hash: "" },
    { valve: "WHITELIST_APPROVED", tx: "transaction2", latency: 133, hash: "" },
  ]);
  const [tab, setTab] = useState<"Home" | "Shop" | "Sixty60" | "Merit" | "Audit">("Home");

  const total = useMemo(() => receipt.reduce((s, l) => s + l.sku.price * l.qty, 0), [receipt]);

  function flashFX() {
    setPulse(true); setBeam(true);
    const newLat = 128 + Math.floor(Math.random() * 18);
    setLatency(newLat);
    setTimeout(() => setPulse(false), 700);
    setTimeout(() => setBeam(false), 700);
    return newLat;
  }

  function scan(sku: SKU) {
    const flexSpend = receipt.filter((l) => l.sku.bucket === "FLEX").reduce((s, l) => s + l.sku.price * l.qty, 0);
    if (sku.bucket === "FLEX" && flex - flexSpend - sku.price < 0) {
      buzz();
      setViolation(true);
      const lat = flashFX();
      setLedger((L) => [{
        ts: timeNow(), node: "BAV_ST_001", sku: sku.id, desc: sku.short,
        value: sku.price, whitelist: "VALVE_LOCK", hash: `Compliance Hashing(${shortHash()}`,
      }, ...L].slice(0, 60));
      setTelemetry((T) => [{ valve: "VALVE_LOCK", tx: `tx${Math.floor(Math.random()*99)}`, latency: lat, hash: "" }, ...T].slice(0, 12));
      setTimeout(() => setViolation(false), 2200);
      return;
    }
    beep();
    const lat = flashFX();
    setReceipt((r) => {
      const existing = r.find((l) => l.sku.id === sku.id);
      if (existing) return r.map((l) => (l.sku.id === sku.id ? { ...l, qty: l.qty + 1 } : l));
      return [...r, { sku, qty: 1 }];
    });
    setLedger((L) => [{
      ts: timeNow(), node: "BAV_ST_001", sku: sku.id, desc: `${sku.short} — R${sku.price.toFixed(2)}`,
      value: sku.price, whitelist: "WHITELIST", hash: `Compliance Hashing(${shortHash()}`,
    }, ...L].slice(0, 60));
    setTelemetry((T) => [{ valve: "WHITELIST_APPROVED", tx: `tx${Math.floor(Math.random()*99)}`, latency: lat, hash: "" }, ...T].slice(0, 12));
  }

  function finalize() {
    if (receipt.length === 0) return;
    const vaultSpend = receipt.filter((l) => l.sku.bucket === "VAULT").reduce((s, l) => s + l.sku.price * l.qty, 0);
    const flexSpend = receipt.filter((l) => l.sku.bucket === "FLEX").reduce((s, l) => s + l.sku.price * l.qty, 0);
    setVault((v) => Math.max(0, v - vaultSpend));
    setFlex((f) => Math.max(0, f - flexSpend));
    setGrit((g) => g + Math.min(8, receipt.length * 2));
    beep();
    flashFX();
    setReceipt([]);
  }

  function resetAll() {
    setVault(VAULT_INIT); setFlex(FLEX_INIT); setReceipt([]); setGrit(840);
  }

  // Animate small latency jitter
  useEffect(() => {
    const id = setInterval(() => setLatency((l) => 128 + Math.floor(Math.random() * 18)), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen obsidian text-white">
      <MasterHeader />

      <div className="grid grid-cols-12 gap-4 px-4 py-4">
        {/* LEFT 35% — Student Wallet */}
        <section className="col-span-12 lg:col-span-4 flex justify-center">
          <div className="w-full max-w-[360px] relative">
            <StudentPhone
              tab={tab} setTab={setTab}
              vault={vault} flex={flex} grit={grit}
              onScan={scan} onFinalize={finalize}
              receiptCount={receipt.length} total={total}
              ledger={ledger}
            />
            {beam && (
              <div className="absolute top-1/2 -right-6 h-1 w-32 bg-gradient-to-r from-sovereign-goldlite via-sovereign-gold to-transparent rounded-full beam pointer-events-none z-30 shadow-[0_0_20px_rgba(232,201,122,0.9)]" />
            )}
          </div>
        </section>

        {/* RIGHT 65% — Fiduciary Sidecar Console */}
        <section className="col-span-12 lg:col-span-8 space-y-3">
          <SidecarHeader />
          {violation && (
            <div className="bg-shoprite-red text-white text-center mono font-black text-sm py-2 rounded flash-red border-y-2 border-sovereign-gold">
              ⚠ ERR_70_30_RATIO_VIOLATION : FIDUCIARY VALVE LOCKED ⚠
            </div>
          )}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 xl:col-span-5">
              <CashierInventoryGrid receipt={receipt} pulse={pulse} />
            </div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-4">
              <LatencyGauge latency={latency} pulse={pulse} />
            </div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-3">
              <LiveReceiptList receipt={receipt} total={total} onFinalize={finalize} onReset={resetAll} />
            </div>
          </div>
          <CioAuditLedger rows={ledger} />
          <TelemetryPulse rows={telemetry} />
        </section>
      </div>

      <footer className="border-t border-white/5 mt-4 py-3 px-6 flex justify-between items-center text-[11px] mono text-white/60">
        <span>BAV™ SOVEREIGN FIDUCIARY ENGINE · Terminal #042 · 70/30 STATUTORY VALVE ENFORCED</span>
        <span className="italic gold-text font-black">'Principal Architect: Refilwe David Ledwaba'</span>
      </footer>
    </div>
  );
}

/* ============ MASTER HEADER ============ */
function MasterHeader() {
  return (
    <header className="border-b border-sovereign-gold/30 bg-gradient-to-r from-[#0b0c10] via-[#14161b] to-[#0b0c10] px-6 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-black tracking-tight">
          <span className="gold-text">BAV™ Sovereign Fiduciary Engine</span>
        </h1>
        <p className="text-[10px] mono text-white/50 mt-0.5">Fiduciary Sidecar Engine Core &amp; CIO Governance Console</p>
      </div>
      <div className="flex items-center gap-5">
        <StatusLED label="POS_LINK" />
        <StatusLED label="SIDECAR" />
        <StatusLED label="ISO8583" />
      </div>
    </header>
  );
}

function StatusLED({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="led inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
      <span className="text-[10px] mono text-emerald-300 tracking-wider">{label}</span>
    </div>
  );
}

/* ============ STUDENT PHONE ============ */
function StudentPhone({
  tab, setTab, vault, flex, grit, onScan, onFinalize, receiptCount, total, ledger,
}: {
  tab: any; setTab: (t: any) => void;
  vault: number; flex: number; grit: number;
  onScan: (s: SKU) => void; onFinalize: () => void;
  receiptCount: number; total: number;
  ledger: LedgerRow[];
}) {
  return (
    <div className="phone-frame rounded-[44px] p-[5px] mx-auto">
      <div className="rounded-[40px] p-[2px] bg-gradient-to-b from-[#3a3a3e] via-[#0a0a0c] to-[#2a2a2e]">
        <div className="rounded-[38px] overflow-hidden bg-white h-[720px] flex flex-col relative">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />

          {/* Status bar */}
          <div className="bg-shoprite-red text-white pt-3 pb-1 px-5 flex justify-between text-[10px] mono">
            <span>9:41</span><span className="opacity-0">.</span><span>5G ●●●●○ 87%</span>
          </div>

          {/* App header */}
          <div className="bg-shoprite-red text-white px-4 py-2 flex items-center justify-between">
            <span className="text-lg">☰</span>
            <div className="font-black text-base">Student App</div>
            <span className="text-lg">🔔</span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin bg-white">
            {tab === "Home" && <HomeTab vault={vault} flex={flex} grit={grit} />}
            {tab === "Shop" && <ShopTab onScan={onScan} />}
            {tab === "Sixty60" && <Sixty60Tab onScan={onScan} />}
            {tab === "Merit" && <MeritTab grit={grit} />}
            {tab === "Audit" && <AuditTab ledger={ledger} />}
          </div>

          {/* Cart bar */}
          {receiptCount > 0 && tab !== "Home" && (
            <button onClick={onFinalize}
              className="bg-sovereign-gold text-black font-black uppercase text-xs tracking-wider py-2 px-4 flex justify-between items-center hover:brightness-110">
              <span>Finalize / Pay · {receiptCount} item{receiptCount > 1 ? "s" : ""}</span>
              <span>R{total.toFixed(2)} →</span>
            </button>
          )}

          {/* Tab bar */}
          <nav className="bg-white border-t border-neutral-200 grid grid-cols-5">
            {(["Home", "Shop", "Sixty60", "Merit", "Audit"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-1.5 text-[9px] font-bold uppercase tracking-wide ${tab === t ? "text-shoprite-red" : "text-neutral-400"}`}>
                <div className="text-sm leading-none mb-0.5">
                  {t === "Home" ? "🏠" : t === "Shop" ? "🛒" : t === "Sixty60" ? "⚡" : t === "Merit" ? "🏆" : "📊"}
                </div>
                {t}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

/* ---------- Home Tab ---------- */
function HomeTab({ vault, flex, grit }: { vault: number; flex: number; grit: number }) {
  return (
    <div className="space-y-0">
      {/* Hero — campus students photo */}
      <div className="relative h-44 overflow-hidden">
        <img src={heroStudents} alt="South African university students on campus" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {/* Grit Score circular gauge floating on hero */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
          <GritGauge value={grit} />
          <div className="text-[9px] mono text-white mt-1 font-black drop-shadow">Value:</div>
          <div className="text-[9px] mono text-sovereign-goldlite font-black">AAA-Sovereign</div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* NSFAS breakdown */}
        <div className="bg-white rounded-xl p-3 space-y-3 border border-neutral-200">
          <div className="text-center">
            <div className="text-[9px] mono uppercase text-neutral-500">Official NSFAS Statutory Monthly</div>
            <div className="text-[9px] mono uppercase text-neutral-500 mb-1">Living Allowance</div>
            <div className="text-2xl font-black text-black">R{TOTAL_POOL.toFixed(2)}</div>
            <div className="text-[9px] mono uppercase text-neutral-500">Total Monthly Pool:</div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] mono uppercase text-neutral-600">
              <span className="font-black text-black">Vault</span>
              <span className="font-black text-black">(Locked: R{vault.toFixed(2)})</span>
            </div>
            <div className="h-2.5 bg-neutral-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sovereign-gold to-sovereign-goldlite" style={{ width: `${(vault / VAULT_INIT) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mono uppercase text-neutral-600">
              <span className="font-black text-black">Flex</span>
              <span className="font-black text-black">(Wallet: R{flex.toFixed(2)})</span>
            </div>
            <div className="h-2.5 bg-neutral-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sovereign-gold to-sovereign-goldlite" style={{ width: `${(flex / FLEX_INIT) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GritGauge({ value }: { value: number }) {
  const pct = Math.min(1, value / 1000);
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="relative inline-block">
      <svg viewBox="0 0 80 80" className="w-20 h-20 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
        <defs>
          <linearGradient id="gritG" x1="0" x2="1">
            <stop offset="0" stopColor="#e8c97a" />
            <stop offset="1" stopColor="#c5a059" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="rgba(0,0,0,0.55)" stroke="#1f2127" strokeWidth="5" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="url(#gritG)" strokeWidth="5"
          strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round"
          transform="rotate(-90 40 40)" />
        <text x="40" y="36" textAnchor="middle" fontSize="8" fontWeight="700" fill="#e8c97a" fontFamily="JetBrains Mono">Grit Score™</text>
        <text x="40" y="52" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily="JetBrains Mono">{value}</text>
      </svg>
    </div>
  );
}

/* ---------- Shop Tab ---------- */
function ShopTab({ onScan }: { onScan: (s: SKU) => void }) {
  return (
    <div className="p-3 space-y-3 bg-[#F4F4F4]">
      <div className="bg-white rounded-full px-3 py-2 flex items-center gap-2 border border-neutral-200">
        <span className="text-neutral-400 text-sm">🔍</span>
        <span className="text-[11px] text-neutral-400">Search Shoprite...</span>
      </div>
      <div className="bg-shoprite-yellow text-black rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide flex items-center justify-between">
        <span>⚡ All Specials · Xtra Savings</span>
        <span className="bg-shoprite-red text-white text-[9px] px-1.5 py-0.5 rounded">NEW</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {INVENTORY.map(s => <ProductCard key={s.id} s={s} onScan={onScan} />)}
      </div>
    </div>
  );
}

function ProductCard({ s, onScan }: { s: SKU; onScan: (s: SKU) => void }) {
  return (
    <button onClick={() => onScan(s)}
      className="bg-white border border-neutral-200 rounded-lg p-2 text-left hover:shadow-md transition relative overflow-hidden">
      <div className="absolute top-1 right-1 bg-shoprite-red text-white text-[7px] font-black px-1 py-0.5 rounded mono z-10">
        Sixty<span className="text-shoprite-yellow">60</span>
      </div>
      <div className="aspect-square rounded mb-2 flex items-center justify-center bg-white overflow-hidden">
        {s.img ? (
          <img src={s.img} alt={s.short} className="w-full h-full object-contain p-1" loading="lazy" />
        ) : (
          <div className="text-4xl">📶</div>
        )}
      </div>
      <div className="text-[10px] font-black text-black leading-tight line-clamp-2 min-h-[26px]">{s.short}</div>
      <div className="flex items-baseline gap-0.5 mt-1">
        <span className="text-shoprite-red text-base font-black">R{Math.floor(s.price)}</span>
        <span className="text-shoprite-red text-[9px] font-black">.{s.price.toFixed(2).split(".")[1]}</span>
      </div>
      <div className={`text-[8px] font-black uppercase mt-0.5 inline-block px-1 py-0.5 rounded ${s.bucket === "VAULT" ? "bg-sovereign-gold/20 text-amber-800" : "bg-neutral-200 text-neutral-700"}`}>
        {s.bucket === "VAULT" ? "🔒 VAULT" : "💳 FLEX"}
      </div>
    </button>
  );
}

function Sixty60Tab({ onScan }: { onScan: (s: SKU) => void }) {
  return (
    <div className="bg-sixty60 min-h-full text-white p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-white text-sixty60 font-black px-2 py-1 rounded text-sm">Sixty<span className="text-shoprite-red">60</span></div>
        <div className="text-[10px] opacity-80">Delivered in 60 minutes</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {INVENTORY.filter(s => s.bucket === "VAULT").map(s => (
          <button key={s.id} onClick={() => onScan(s)} className="bg-white text-black rounded-lg p-2 text-left">
            <div className="aspect-square rounded mb-1 bg-white overflow-hidden flex items-center justify-center">
              <img src={s.img} alt={s.short} className="w-full h-full object-contain p-1" loading="lazy" />
            </div>
            <div className="text-[10px] font-black">{s.short}</div>
            <div className="text-sm font-black text-shoprite-red">R{s.price.toFixed(2)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MeritTab({ grit }: { grit: number }) {
  return (
    <div className="p-3 space-y-3">
      <div className="obsidian gold-border rounded-2xl p-4 text-center">
        <div className="text-[9px] mono uppercase text-sovereign-goldlite">Merit Standing</div>
        <div className="text-4xl gold-text font-black mt-1">{grit}</div>
        <div className="text-[10px] mono text-white/60">AAA-SOVEREIGN BAND</div>
      </div>
      {["Statutory Compliance · 100%", "Vault Discipline · A+", "Flex Restraint · A", "Audit Streak · 26 days"].map((t) => (
        <div key={t} className="bg-white border border-neutral-200 rounded-lg p-3 text-[11px] font-black text-black flex justify-between">
          <span>{t}</span><span className="text-emerald-600">✓</span>
        </div>
      ))}
    </div>
  );
}

function AuditTab({ ledger }: { ledger: LedgerRow[] }) {
  return (
    <div className="bg-[#0b0c10] text-white min-h-full p-3 mono">
      <div className="text-[10px] uppercase tracking-widest mb-2 gold-text font-black">Spending Compliance Ledger</div>
      <div className="text-[9px] opacity-50 mb-2">Read-only · Verified by BAV™ Secure Link</div>
      <div className="space-y-1">
        {ledger.slice(0, 14).map((r, i) => (
          <div key={i} className="border-b border-white/10 py-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="opacity-70">{r.ts.slice(11, 19)}</span>
              <span className={r.whitelist === "VALVE_LOCK" ? "text-shoprite-red font-black" : "text-emerald-400 font-black"}>{r.whitelist}</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate pr-2">{r.desc}</span>
              <span className="font-black">R{r.value.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ SIDECAR HEADER ============ */
function SidecarHeader() {
  return (
    <div className="bg-shoprite-red text-white px-4 py-2.5 rounded-md border-b-2 border-sovereign-gold flex items-center justify-center shadow-lg">
      <div className="font-black text-sm tracking-wide mono">SHOPRITE TILL #042 — BAV™ SIDE-CAR INTEGRITY CHECK</div>
    </div>
  );
}

/* ============ CASHIER INVENTORY GRID ============ */
function CashierInventoryGrid({ receipt, pulse }: { receipt: ReceiptLine[]; pulse: boolean }) {
  return (
    <div className="bg-[#1b1d22] rounded-lg border border-sovereign-gold/40 overflow-hidden shadow-2xl h-full">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30">
        <div className="mono text-[10px] text-sovereign-goldlite font-black tracking-widest">▾ CASHIER INVENTORY GRID</div>
      </div>
      <div className="p-2 space-y-1.5">
        {receipt.length === 0 && (
          <div className="text-center text-white/30 italic py-10 text-xs mono">— awaiting scan from student wallet —</div>
        )}
        {receipt.map((l, i) => (
          <div key={i}
            className={`bg-white rounded-md flex items-center gap-2 p-1.5 border-l-4 ${pulse && i === receipt.length - 1 ? "ring-2 ring-sovereign-gold" : ""}`}
            style={{ borderLeftColor: l.sku.accent }}>
            <div className="w-12 h-12 bg-white rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
              {l.sku.img && <img src={l.sku.img} alt={l.sku.short} className="w-full h-full object-contain" loading="lazy" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-black text-black truncate">
                {l.sku.short} — <span className="text-shoprite-red">R{l.sku.price.toFixed(2)}</span>
              </div>
              <div className="text-[9px] mono text-neutral-600">[Vault Whitelisted{l.sku.id === "SKU_BAV_004" ? " · Priority Dignity Item" : ""}]</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ LIVE RECEIPT LIST (paper) ============ */
function LiveReceiptList({ receipt, total, onFinalize, onReset }: {
  receipt: ReceiptLine[]; total: number; onFinalize: () => void; onReset: () => void;
}) {
  return (
    <div className="bg-[#1b1d22] rounded-lg border border-sovereign-gold/40 overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30">
        <div className="mono text-[10px] text-sovereign-goldlite font-black tracking-widest">LIVE RECEIPT LIST</div>
      </div>
      <div className="p-2 flex-1">
        <div className="bg-[#f7f3e8] text-black p-2.5 mono text-[9px] leading-tight shadow-inner h-full">
          <div className="text-center font-black">
            <div className="text-shoprite-red text-lg">SHOPRITE</div>
            <div className="text-[10px]">CHECKERS (PTY) LTD</div>
            <div className="text-[8px]">Store Receipt List</div>
            <div className="text-[8px]">Terminal #042</div>
          </div>
          <div className="border-t border-dashed border-black/40 my-1.5" />
          <div className="grid grid-cols-12 font-black text-[8px]">
            <div className="col-span-7">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-3 text-right">Price</div>
          </div>
          <div className="border-t border-dashed border-black/40 my-1" />
          {receipt.length === 0 && <div className="text-center italic text-[8px] py-4 opacity-60">— empty —</div>}
          {receipt.map((l, i) => (
            <div key={i} className="text-[8px] mb-1">
              <div className="grid grid-cols-12">
                <div className="col-span-7 truncate">{l.sku.short}</div>
                <div className="col-span-2 text-center">{l.qty}</div>
                <div className="col-span-3 text-right">R{(l.sku.price * l.qty).toFixed(2)}</div>
              </div>
              <div className="text-[7px] opacity-70">{l.sku.id} [{l.sku.bucket}]</div>
            </div>
          ))}
          <div className="border-t border-dashed border-black/40 my-1" />
          <div className="grid grid-cols-12 font-black text-[9px]">
            <div className="col-span-9">Total:</div>
            <div className="col-span-3 text-right">R{total.toFixed(2)}</div>
          </div>
          <div className="grid grid-cols-12 text-[9px]">
            <div className="col-span-9">Sub-Total:</div>
            <div className="col-span-3 text-right">R{total.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 p-2 pt-0">
        <button onClick={onFinalize} disabled={!receipt.length}
          className="bg-sovereign-gold disabled:bg-neutral-700 disabled:text-white/40 text-black font-black py-1.5 rounded uppercase tracking-wider text-[10px] hover:brightness-110">
          Finalize
        </button>
        <button onClick={onReset}
          className="bg-neutral-800 text-white font-black py-1.5 rounded uppercase tracking-wider text-[10px]">
          Reset
        </button>
      </div>
    </div>
  );
}

/* ============ CENTRAL SPEEDOMETER ============ */
function LatencyGauge({ latency, pulse }: { latency: number; pulse: boolean }) {
  const pct = Math.min(100, (latency / 200) * 100);
  const angle = (pct / 100) * 270 - 135;
  return (
    <div className={`bg-[#1b1d22] border border-sovereign-gold/40 rounded-lg p-3 ${pulse ? "gold-pulse" : ""} h-full flex flex-col`}>
      <div className="text-center mono text-[10px] text-sovereign-goldlite font-black tracking-widest">Shoprite POS Till Mirror (Terminal #042)</div>
      <div className="relative aspect-square max-w-[200px] mx-auto flex-1">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <radialGradient id="bgGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#1a1d22" />
              <stop offset="1" stopColor="#000" />
            </radialGradient>
            <linearGradient id="lg1" x1="0" x2="1">
              <stop offset="0" stopColor="#e8c97a" />
              <stop offset="0.6" stopColor="#c5a059" />
              <stop offset="1" stopColor="#E30613" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#bgGlow)" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#1a1d22" strokeWidth="14" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="url(#lg1)" strokeWidth="14"
            strokeDasharray={`${(pct / 100) * 377} 999`} strokeLinecap="round"
            transform="rotate(135 100 100)" />
          {/* tick marks */}
          {Array.from({ length: 11 }).map((_, i) => {
            const a = (i / 10) * 270 - 135;
            const rad = (a * Math.PI) / 180;
            const x1 = 100 + Math.cos(rad) * 65, y1 = 100 + Math.sin(rad) * 65;
            const x2 = 100 + Math.cos(rad) * 72, y2 = 100 + Math.sin(rad) * 72;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c5a059" strokeWidth="1.5" opacity="0.7" />;
          })}
          <line x1="100" y1="100" x2="100" y2="40" stroke="#e8c97a" strokeWidth="3"
            transform={`rotate(${angle} 100 100)`} strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill="#e8c97a" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[9px] mono uppercase text-sovereign-goldlite mt-2">T_RESPONSE</div>
          <div className="text-[9px] mono text-white/60 -mt-0.5">150ms Speedometer Gauge</div>
          <div className="mt-auto mb-3 text-center">
            <div className={`text-[10px] mono ${pulse ? "text-sovereign-goldlite" : "text-white"}`}>{latency}ms / SLA &lt; 150ms</div>
            <div className="text-emerald-400 font-black mono text-base">PASS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ CIO AUDIT LEDGER ============ */
function CioAuditLedger({ rows }: { rows: LedgerRow[] }) {
  return (
    <div className="obsidian gold-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-black/40 border-b border-sovereign-gold/30 flex justify-between items-center">
        <div className="mono text-[11px] tracking-widest gold-text font-black">CIO INSTITUTIONAL AUDIT LEDGER</div>
        <div className="mono text-[9px] text-emerald-400">● LIVE · {rows.length} VERIFIED ROWS</div>
      </div>
      <div className="overflow-x-auto max-h-[220px] overflow-y-auto scrollbar-thin">
        <table className="w-full mono text-[10px]">
          <thead className="sticky top-0 bg-[#14161b]">
            <tr className="text-left text-sovereign-goldlite uppercase tracking-widest text-[9px] border-b border-sovereign-gold/30">
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-2 py-2">Edge Node ID<br/><span className="text-white/40 normal-case">(BAV_ST_001)</span></th>
              <th className="px-2 py-2">SKU_ID</th>
              <th className="px-2 py-2">Item Desc</th>
              <th className="px-2 py-2 text-right">Value</th>
              <th className="px-2 py-2">Whitelist<br/>Status</th>
              <th className="px-2 py-2">Compliance Hashing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-1.5 text-white/70">{r.ts}</td>
                <td className="px-2 py-1.5 text-white/80">{r.node}</td>
                <td className="px-2 py-1.5 text-sovereign-goldlite">{r.sku}</td>
                <td className="px-2 py-1.5 text-white">{r.desc}</td>
                <td className="px-2 py-1.5 text-right font-black text-white">R{r.value.toFixed(2)}</td>
                <td className={`px-2 py-1.5 font-black ${r.whitelist === "VALVE_LOCK" ? "text-shoprite-red" : r.whitelist === "VALIDATED" ? "text-amber-300" : "text-emerald-400"}`}>
                  {r.whitelist}
                </td>
                <td className="px-2 py-1.5 text-white/50 truncate max-w-[200px]">{r.hash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ TELEMETRY PULSE ============ */
function TelemetryPulse({ rows }: { rows: PulseRow[] }) {
  return (
    <div className="obsidian gold-border rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30 flex justify-between items-center">
        <div className="mono text-[10px] tracking-widest text-sovereign-goldlite font-black">LIVE TELEMETRY PULSE (SHA-256 JSON)</div>
        <div className="mono text-[9px] text-emerald-400">● STREAMING</div>
      </div>
      <div className="p-2 bg-black/60 max-h-[120px] overflow-y-auto scrollbar-thin">
        {rows.map((r, i) => (
          <div key={i} className="mono text-[10px] text-emerald-300 whitespace-nowrap">
            {`{"fiduciary_valve": "`}<span className={r.valve === "VALVE_LOCK" ? "text-shoprite-red" : "text-emerald-400"}>{r.valve}</span>{`", "${r.tx}", "handshake_latency": "`}<span className="text-sovereign-goldlite">{r.latency}ms</span>{`"},`}
          </div>
        ))}
      </div>
    </div>
  );
}
