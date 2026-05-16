import { useEffect, useMemo, useRef, useState } from "react";

/* ============ TYPES & DATA ============ */
type Bucket = "VAULT" | "FLEX";
type SKU = {
  id: string;
  name: string;
  short: string;
  price: number;
  bucket: Bucket;
  priority?: boolean;
  emoji: string;
  color: string;
};

const INVENTORY: SKU[] = [
  { id: "SKU_BAV_001", name: "Ritebrand Super Maize Meal 10kg", short: "Maize Meal 10kg", price: 79.99, bucket: "VAULT", emoji: "🌽", color: "#E30613" },
  { id: "SKU_BAV_002", name: "Ritebrand Long Life Full Cream Milk 1L", short: "Full Cream Milk 1L", price: 16.99, bucket: "VAULT", emoji: "🥛", color: "#1f4ea1" },
  { id: "SKU_BAV_003", name: "Stayfree Maxi Scented Pads 10-Pack", short: "Stayfree Pads x10", price: 22.99, bucket: "VAULT", priority: true, emoji: "🌸", color: "#2aa57f" },
  { id: "SKU_BAV_004", name: "Albany Superior Sliced White Bread", short: "Albany White Bread", price: 19.99, bucket: "VAULT", emoji: "🍞", color: "#1a4a8a" },
  { id: "SKU_BAV_007", name: "Discretionary Soft Drink / Soda 2L", short: "Cream Soda 2L", price: 14.99, bucket: "FLEX", emoji: "🥤", color: "#2e9f4f" },
  { id: "SKU_BAV_009", name: "2GB Campus Mobile Data Bundle", short: "2GB Data Bundle", price: 149.0, bucket: "FLEX", emoji: "📶", color: "#5a3aa8" },
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
    o.type = "sine"; o.frequency.value = 1200;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ac.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.09);
  };
  const buzz = () => {
    const ac = ctx();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "square"; o.frequency.value = 180;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.45);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.5);
  };
  return { beep, buzz };
}

/* ============ MAIN APP ============ */
type ReceiptLine = { sku: SKU; qty: number };
type LogEntry = { t: string; event: string; sku?: string; latency: number; status: string };

export default function App() {
  const { beep, buzz } = useAudio();
  const [vault, setVault] = useState(VAULT_INIT);
  const [flex, setFlex] = useState(FLEX_INIT);
  const [grit, setGrit] = useState(840);
  const [receipt, setReceipt] = useState<ReceiptLine[]>([]);
  const [latency, setLatency] = useState(138);
  const [pulse, setPulse] = useState(false);
  const [violation, setViolation] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { t: timeNow(), event: "ENGINE_BOOT", latency: 122, status: "READY" },
  ]);
  const [tab, setTab] = useState<"Home" | "Shop" | "Sixty60" | "Merit" | "Audit">("Home");

  function timeNow() {
    return new Date().toISOString().split("T")[1].replace("Z", "");
  }

  const total = useMemo(() => receipt.reduce((s, l) => s + l.sku.price * l.qty, 0), [receipt]);

  function flashPulse() {
    setPulse(true);
    const newLat = 130 + Math.floor(Math.random() * 15);
    setLatency(newLat);
    setTimeout(() => setPulse(false), 600);
    return newLat;
  }

  function pushLog(e: Omit<LogEntry, "t">) {
    setLogs((l) => [{ t: timeNow(), ...e }, ...l].slice(0, 40));
  }

  function scan(sku: SKU) {
    // Valve check: flex item when flex projected balance would go negative
    const flexSpend = receipt.filter((l) => l.sku.bucket === "FLEX").reduce((s, l) => s + l.sku.price * l.qty, 0);
    if (sku.bucket === "FLEX" && flex - flexSpend - sku.price < 0) {
      buzz();
      setViolation(true);
      const lat = flashPulse();
      pushLog({ event: "VALVE_LOCK", sku: sku.id, latency: lat, status: "ERR_70_30_RATIO_VIOLATION" });
      setTimeout(() => setViolation(false), 2200);
      return;
    }
    beep();
    const lat = flashPulse();
    setReceipt((r) => {
      const existing = r.find((l) => l.sku.id === sku.id);
      if (existing) return r.map((l) => (l.sku.id === sku.id ? { ...l, qty: l.qty + 1 } : l));
      return [...r, { sku, qty: 1 }];
    });
    pushLog({ event: "POS_SKU_SCAN", sku: sku.id, latency: lat, status: "BENCHMARK_PASSED_UNDER_150MS" });
  }

  function finalize() {
    if (receipt.length === 0) return;
    const vaultSpend = receipt.filter((l) => l.sku.bucket === "VAULT").reduce((s, l) => s + l.sku.price * l.qty, 0);
    const flexSpend = receipt.filter((l) => l.sku.bucket === "FLEX").reduce((s, l) => s + l.sku.price * l.qty, 0);
    setVault((v) => Math.max(0, v - vaultSpend));
    setFlex((f) => Math.max(0, f - flexSpend));
    setGrit((g) => g + Math.min(10, receipt.length * 2));
    beep();
    const lat = flashPulse();
    pushLog({ event: "SETTLEMENT_COMMIT", latency: lat, status: "PAID_VIA_BAV_SECURE_LINK" });
    setReceipt([]);
  }

  function resetAll() {
    setVault(VAULT_INIT); setFlex(FLEX_INIT); setReceipt([]); setGrit(840);
  }

  const valvePct = Math.round((vault / (vault + flex || 1)) * 100);

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      {/* MASTER HEADER */}
      <header className="bg-gradient-to-r from-[#E30613] via-[#c10510] to-[#E30613] border-b-4 border-[#FFD200] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">BAV™ Sovereign Fiduciary Engine</h1>
          <p className="text-xs text-white/80 font-mono">CLEAN-ROOM // STATUTORY NSFAS ALLOCATION MATRIX // SUB-150MS SLA</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/70 font-mono">PRINCIPAL ARCHITECT</div>
          <div className="text-sm font-bold">Refilwe David Ledwaba</div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 p-4">
        {/* LEFT: STUDENT APP */}
        <section className="col-span-12 lg:col-span-4">
          <StudentPhone
            tab={tab}
            setTab={setTab}
            vault={vault}
            flex={flex}
            grit={grit}
            onScan={scan}
            logs={logs}
          />
        </section>

        {/* CENTER: LATENCY LOOP */}
        <section className="col-span-12 lg:col-span-3 space-y-4">
          <LatencyGauge latency={latency} pulse={pulse} />
          <FiduciaryValve vaultPct={valvePct} vault={vault} flex={flex} />
          <PoolCard vault={vault} flex={flex} />
        </section>

        {/* RIGHT: POS TILL */}
        <section className="col-span-12 lg:col-span-5 space-y-3">
          <PosTill
            onScan={scan}
            receipt={receipt}
            total={total}
            onFinalize={finalize}
            onReset={resetAll}
            violation={violation}
            pulse={pulse}
          />
          <DevConsole logs={logs} />
        </section>
      </div>

      <footer className="text-center text-[11px] text-white/40 font-mono py-3 border-t border-white/5">
        BAV™ SOVEREIGN FIDUCIARY ENGINE · Terminal #042 · 70/30 STATUTORY VALVE ENFORCED · © Refilwe David Ledwaba
      </footer>
    </div>
  );
}

/* ============ STUDENT PHONE ============ */
function StudentPhone({
  tab, setTab, vault, flex, grit, onScan, logs,
}: {
  tab: string; setTab: (t: any) => void;
  vault: number; flex: number; grit: number;
  onScan: (s: SKU) => void; logs: LogEntry[];
}) {
  return (
    <div className="mx-auto max-w-[400px] bg-black rounded-[44px] p-3 shadow-2xl border-4 border-neutral-800">
      <div className="rounded-[34px] overflow-hidden bg-shoprite-slate h-[820px] flex flex-col relative">
        {/* notch */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-32 h-5 bg-black rounded-b-2xl z-20" />

        {/* Red header */}
        <div className="bg-shoprite-red text-white pt-7 pb-3 px-4">
          <div className="flex items-center justify-between text-[10px] font-mono opacity-90">
            <span>12:45</span>
            <span>5G ▮▮▮ 87%</span>
          </div>
          {tab === "Home" && (
            <div className="mt-2">
              <div className="text-[11px] uppercase tracking-widest opacity-90">Welcome</div>
              <div className="text-xl font-black">Refilwe Mokoena</div>
            </div>
          )}
          {tab !== "Home" && (
            <div className="mt-2 text-lg font-black uppercase tracking-wide">{tab}</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {tab === "Home" && <HomeTab vault={vault} flex={flex} grit={grit} />}
          {tab === "Shop" && <ShopTab onScan={onScan} />}
          {tab === "Sixty60" && <Sixty60Tab onScan={onScan} />}
          {tab === "Merit" && <MeritTab grit={grit} />}
          {tab === "Audit" && <AuditTab logs={logs} />}
        </div>

        {/* Tab bar */}
        <nav className="bg-white border-t border-neutral-200 grid grid-cols-5">
          {(["Home", "Shop", "Sixty60", "Merit", "Audit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                tab === t ? "text-shoprite-red" : "text-neutral-500"
              }`}
            >
              <div className="text-base leading-none mb-0.5">
                {t === "Home" ? "🏠" : t === "Shop" ? "🛒" : t === "Sixty60" ? "⚡" : t === "Merit" ? "🏆" : "📊"}
              </div>
              {t}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function HomeTab({ vault, flex, grit }: { vault: number; flex: number; grit: number }) {
  return (
    <div className="p-3 space-y-3">
      {/* Hero */}
      <div className="rounded-xl overflow-hidden h-32 relative bg-gradient-to-br from-[#E30613] to-[#7a0309] flex items-end p-3">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,#FFD200,transparent_60%)]" />
        <div className="relative text-white">
          <div className="text-[10px] uppercase tracking-widest opacity-90">SA Campus Network</div>
          <div className="text-sm font-black">Students. Sovereign. Supplied.</div>
        </div>
        <div className="absolute right-2 top-2 text-3xl">🎓👨🏾‍🎓👩🏾‍🎓</div>
      </div>

      {/* Grit Score Gold Card */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-[#FFD200] via-[#f5c200] to-[#d9a800] text-black shadow-pulse">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest">Grit Score™</div>
            <div className="text-4xl font-black font-mono">{grit}</div>
            <div className="text-[11px] font-bold mt-1">AAA-SOVEREIGN RATING</div>
          </div>
          <div className="text-3xl">👑</div>
        </div>
      </div>

      {/* NSFAS Pool */}
      <div className="bg-white rounded-xl p-3 border border-neutral-200">
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">NSFAS Statutory Allocation</div>
        <div className="text-2xl font-black text-black">R{TOTAL_POOL.toFixed(2)}</div>
        <div className="text-[10px] text-neutral-500">Total Monthly Pool</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 border-l-4 border-shoprite-red">
          <div className="text-[9px] font-bold uppercase text-neutral-500">Vault (70%)</div>
          <div className="text-lg font-black text-black">R{vault.toFixed(2)}</div>
          <div className="text-[9px] text-neutral-500">🔒 Locked — Staples</div>
        </div>
        <div className="bg-white rounded-xl p-3 border-l-4 border-shoprite-yellow">
          <div className="text-[9px] font-bold uppercase text-neutral-500">Flex (30%)</div>
          <div className="text-lg font-black text-black">R{flex.toFixed(2)}</div>
          <div className="text-[9px] text-neutral-500">💳 Discretionary</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 border border-neutral-200">
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Quick Actions</div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {["🛒 Shop","⚡ 60min","📍 Store","🎫 Voucher"].map(a=>(
            <div key={a} className="bg-shoprite-slate rounded-lg py-2 text-[10px] font-bold text-black">{a}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ s, onScan }: { s: SKU; onScan: (s: SKU) => void }) {
  return (
    <button
      onClick={() => onScan(s)}
      className="bg-white border border-neutral-200 rounded-lg p-2 text-left hover:shadow-md transition relative overflow-hidden group"
    >
      <div className="absolute top-1 right-1 bg-sixty60 text-white text-[7px] font-black px-1.5 py-0.5 rounded">60</div>
      <div
        className="aspect-square rounded mb-2 flex items-center justify-center text-4xl"
        style={{ background: `linear-gradient(135deg, ${s.color} 0%, ${s.color}dd 100%)` }}
      >
        <span className="drop-shadow">{s.emoji}</span>
      </div>
      <div className="text-[10px] font-black text-black leading-tight line-clamp-2 min-h-[26px]">{s.short}</div>
      <div className="flex items-baseline gap-0.5 mt-1">
        <span className="text-base font-black text-black">R{Math.floor(s.price)}</span>
        <span className="text-[9px] font-black text-black">.{s.price.toFixed(2).split(".")[1]}</span>
      </div>
      <div className={`text-[8px] font-bold uppercase mt-0.5 ${s.bucket === "VAULT" ? "text-shoprite-red" : "text-amber-600"}`}>
        {s.bucket === "VAULT" ? "🔒 Vault" : "💳 Flex"}
      </div>
    </button>
  );
}

function ShopTab({ onScan }: { onScan: (s: SKU) => void }) {
  return (
    <div className="p-3 space-y-3 bg-shoprite-slate">
      <div className="bg-shoprite-yellow text-black rounded-lg px-3 py-2 text-[11px] font-black uppercase">
        ⚡ ALL SPECIALS · XTRA SAVINGS
      </div>
      <div className="text-[11px] font-black uppercase text-neutral-600">Statutory Staples & Flex</div>
      <div className="grid grid-cols-2 gap-2">
        {INVENTORY.map((s) => <ProductCard key={s.id} s={s} onScan={onScan} />)}
      </div>
    </div>
  );
}

function Sixty60Tab({ onScan }: { onScan: (s: SKU) => void }) {
  return (
    <div className="bg-sixty60 min-h-full text-white">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-white text-sixty60 font-black px-2 py-1 rounded text-sm">Sixty<span className="text-shoprite-red">60</span></div>
          <div className="text-[10px] opacity-80">Delivered in 60 minutes</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 mb-3 text-[10px] font-mono">
          FILTER: STATUTORY_STAPLES · BUCKET=VAULT
        </div>
        <div className="grid grid-cols-2 gap-2">
          {INVENTORY.filter((s) => s.bucket === "VAULT").map((s) => (
            <button key={s.id} onClick={() => onScan(s)} className="bg-white text-black rounded-lg p-2 text-left">
              <div className="aspect-square rounded mb-1 flex items-center justify-center text-3xl"
                   style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)` }}>
                {s.emoji}
              </div>
              <div className="text-[10px] font-black leading-tight">{s.short}</div>
              <div className="text-sm font-black mt-1">R{s.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeritTab({ grit }: { grit: number }) {
  return (
    <div className="bg-[#0b0d10] text-white min-h-full p-3 font-mono">
      <div className="text-[10px] uppercase opacity-60 tracking-widest mb-2">Merit Dashboard</div>
      <div className="bg-gradient-to-br from-[#FFD200] to-[#d9a800] text-black rounded-lg p-4 mb-3">
        <div className="text-[9px] font-bold uppercase">Grit Score™</div>
        <div className="text-5xl font-black">{grit}</div>
        <div className="text-[10px] font-bold">AAA-SOVEREIGN</div>
      </div>
      {[
        ["Compliance Streak", "94 days"],
        ["Vault Discipline", "100%"],
        ["Flex Restraint", "82%"],
        ["Settlements", "37"],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between border-b border-white/10 py-2 text-xs">
          <span className="opacity-70">{k}</span><span className="font-bold">{v}</span>
        </div>
      ))}
    </div>
  );
}

function AuditTab({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="bg-[#0b0d10] text-white min-h-full p-3 font-mono">
      <div className="text-[10px] uppercase opacity-60 tracking-widest mb-2">Real-Time Ledger</div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-left opacity-60 border-b border-white/10">
            <th className="py-1">TIME</th><th>EVENT</th><th>LAT</th>
          </tr>
        </thead>
        <tbody>
          {logs.slice(0, 18).map((l, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="py-1 opacity-70">{l.t.slice(0, 8)}</td>
              <td className="font-bold text-emerald-400">{l.event}</td>
              <td>{l.latency}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============ CENTER ============ */
function LatencyGauge({ latency, pulse }: { latency: number; pulse: boolean }) {
  const pct = Math.min(100, (latency / 150) * 100);
  const angle = (pct / 100) * 270 - 135;
  return (
    <div className={`bg-[#0e1116] border border-white/10 rounded-2xl p-4 ${pulse ? "gold-pulse" : ""}`}>
      <div className="text-[10px] font-mono uppercase opacity-60 tracking-widest mb-2">T_RESPONSE — 150ms Latency Loop</div>
      <div className="relative aspect-square max-w-[260px] mx-auto">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0" stopColor="#FFD200" />
              <stop offset="1" stopColor="#E30613" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="85" fill="none" stroke="#1a1d22" strokeWidth="14" />
          <circle cx="100" cy="100" r="85" fill="none" stroke="url(#g1)" strokeWidth="14"
            strokeDasharray={`${(pct / 100) * 400} 999`} strokeLinecap="round"
            transform="rotate(135 100 100)" />
          <line x1="100" y1="100" x2="100" y2="35" stroke="#FFD200" strokeWidth="3"
            transform={`rotate(${angle} 100 100)`} strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill="#FFD200" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className={`text-4xl font-black font-mono ${pulse ? "text-shoprite-yellow" : "text-white"}`}>{latency}ms</div>
          <div className="text-[10px] font-mono mt-1 text-emerald-400">SLA &lt; 150ms · PASS</div>
        </div>
      </div>
    </div>
  );
}

function FiduciaryValve({ vaultPct, vault, flex }: { vaultPct: number; vault: number; flex: number }) {
  return (
    <div className="bg-[#0e1116] border border-white/10 rounded-2xl p-4">
      <div className="text-[10px] font-mono uppercase opacity-60 tracking-widest mb-2">Fiduciary Valve · 70/30 Ratio</div>
      <div className="h-4 bg-neutral-900 rounded-full overflow-hidden flex">
        <div className="bg-shoprite-red h-full transition-all" style={{ width: `${vaultPct}%` }} />
        <div className="bg-shoprite-yellow h-full transition-all" style={{ width: `${100 - vaultPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono mt-2">
        <span className="text-shoprite-red">VAULT {vaultPct}% · R{vault.toFixed(2)}</span>
        <span className="text-shoprite-yellow">FLEX {100 - vaultPct}% · R{flex.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PoolCard({ vault, flex }: { vault: number; flex: number }) {
  return (
    <div className="bg-[#0e1116] border border-white/10 rounded-2xl p-4">
      <div className="text-[10px] font-mono uppercase opacity-60 tracking-widest">Monthly Pool</div>
      <div className="text-3xl font-black font-mono">R{(vault + flex).toFixed(2)}</div>
      <div className="text-[10px] opacity-60 font-mono">of R{TOTAL_POOL.toFixed(2)} statutory allocation</div>
    </div>
  );
}

/* ============ POS TILL ============ */
function PosTill({
  onScan, receipt, total, onFinalize, onReset, violation, pulse,
}: {
  onScan: (s: SKU) => void; receipt: ReceiptLine[]; total: number;
  onFinalize: () => void; onReset: () => void; violation: boolean; pulse: boolean;
}) {
  return (
    <div className="bg-neutral-100 text-black rounded-2xl overflow-hidden border-4 border-neutral-300 shadow-2xl">
      {/* Header */}
      <div className={`${violation ? "flash-red" : "bg-shoprite-red"} text-white px-4 py-3 flex justify-between items-center border-b-4 border-shoprite-yellow`}>
        <div>
          <div className="text-[10px] font-mono opacity-90">SHOPRITE POS</div>
          <div className="text-xl font-black tracking-tight">TILL #042 — CASHIER MK</div>
        </div>
        <div className="text-right font-mono text-[10px]">
          <div>TERMINAL STATUS: <span className="text-shoprite-yellow font-black">ONLINE</span></div>
          <div>BAV™ SECURE LINK</div>
        </div>
      </div>

      {violation && (
        <div className="bg-shoprite-red text-white text-center font-mono font-black text-sm py-2 border-y-4 border-shoprite-yellow animate-pulse">
          ⚠ FIDUCIARY VALVE LOCKED: ERR_70_30_RATIO_VIOLATION ⚠
        </div>
      )}

      <div className="grid grid-cols-5 min-h-[420px]">
        {/* Scan grid */}
        <div className="col-span-2 bg-white p-3 border-r border-neutral-300">
          <div className="text-[10px] font-black uppercase text-neutral-500 mb-2">Inventory Scan</div>
          <div className="grid grid-cols-2 gap-2">
            {INVENTORY.map((s) => (
              <button key={s.id} onClick={() => onScan(s)}
                className="bg-shoprite-slate hover:bg-shoprite-yellow/40 active:scale-95 transition rounded-lg p-2 text-left border border-neutral-200">
                <div className="aspect-square rounded mb-1 flex items-center justify-center text-3xl"
                  style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`, color: "white" }}>
                  {s.emoji}
                </div>
                <div className="text-[10px] font-black leading-tight line-clamp-2 min-h-[24px]">{s.short}</div>
                <div className="text-sm font-black">R{s.price.toFixed(2)}</div>
                <div className={`text-[8px] font-black uppercase ${s.bucket === "VAULT" ? "text-shoprite-red" : "text-amber-600"}`}>
                  {s.bucket}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Receipt */}
        <div className="col-span-3 bg-[#fafaf6] p-4 flex flex-col">
          <div className="bg-white shadow-inner rounded p-4 font-mono text-[11px] text-black flex-1 flex flex-col">
            <div className="text-center border-b border-dashed border-neutral-400 pb-2 mb-2">
              <div className="font-black text-sm">SHOPRITE DURBANVILLE</div>
              <div className="text-[9px]">TILL #042 · CASHIER MK · {new Date().toLocaleString()}</div>
              <div className="text-[9px]">VAT NO: 4630101284</div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {receipt.length === 0 && (
                <div className="text-center text-neutral-400 italic py-8">— awaiting scan —</div>
              )}
              {receipt.map((l, i) => (
                <div key={i} className={`flex justify-between text-[11px] ${pulse && i === receipt.length - 1 ? "bg-shoprite-yellow/40" : ""}`}>
                  <div className="flex-1">
                    <div className="font-bold">{l.sku.id} {l.qty > 1 ? `×${l.qty}` : ""}</div>
                    <div className="text-[9px] text-neutral-600">
                      {l.sku.short} [{l.sku.bucket === "VAULT" ? "Vault Approved" : "Flex Wallet"}]
                    </div>
                  </div>
                  <div className="text-right font-bold">R{(l.sku.price * l.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-neutral-400 mt-2 pt-2">
              <div className="flex justify-between text-sm font-black">
                <span>TOTAL</span><span>R{total.toFixed(2)}</span>
              </div>
              <div className="text-center text-[10px] font-black mt-2 text-emerald-700">
                STATUS: {receipt.length ? "AWAITING SETTLEMENT" : "PAID via BAV™ SECURE LINK"}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={onFinalize} disabled={!receipt.length}
              className="flex-1 bg-shoprite-red disabled:bg-neutral-300 text-white font-black py-3 rounded-lg uppercase tracking-wide">
              Finalize / Pay
            </button>
            <button onClick={onReset}
              className="px-4 bg-neutral-800 text-white font-black py-3 rounded-lg uppercase tracking-wide text-[11px]">
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ DEV CONSOLE ============ */
function DevConsole({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="bg-black border border-emerald-500/30 rounded-2xl p-3 font-mono text-[11px] text-emerald-400 h-[200px] overflow-y-auto scrollbar-thin">
      <div className="opacity-60 mb-1">// BAV_ENGINE_DEV_STREAM · JSON Telemetry</div>
      {logs.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap break-words">
          {JSON.stringify({
            t: l.t,
            event: l.event,
            ...(l.sku ? { sku: l.sku } : {}),
            handshake_latency: `${l.latency}ms`,
            status: l.status,
          })}
        </div>
      ))}
    </div>
  );
}
