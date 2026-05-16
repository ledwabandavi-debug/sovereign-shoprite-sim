import { useMemo, useRef, useState } from "react";

/* ============ TYPES & DATA ============ */
type Bucket = "VAULT" | "FLEX";
type SKU = {
  id: string;
  name: string;
  short: string;
  price: number;
  bucket: Bucket;
  emoji: string;
  color: string;
};

const INVENTORY: SKU[] = [
  { id: "SKU_BAV_001", name: "Ritebrand Super Maize Meal 10kg", short: "10kg Ritebrand Maize Meal", price: 79.99, bucket: "VAULT", emoji: "🌽", color: "#E30613" },
  { id: "SKU_BAV_002", name: "Ritebrand Full Cream Milk 1L", short: "1L Ritebrand Milk", price: 16.99, bucket: "VAULT", emoji: "🥛", color: "#1f4ea1" },
  { id: "SKU_BAV_003", name: "Albany Superior Sliced White Bread", short: "Albany White Bread", price: 19.99, bucket: "VAULT", emoji: "🍞", color: "#1a4a8a" },
  { id: "SKU_BAV_004", name: "Stayfree Maxi Scented Pads", short: "Stayfree Pads x10", price: 22.99, bucket: "VAULT", emoji: "🌸", color: "#2aa57f" },
  { id: "SKU_BAV_005", name: "Cadbury Dairy Milk Slab 150g", short: "Cadbury Slab", price: 24.99, bucket: "FLEX", emoji: "🍫", color: "#6b3a8f" },
  { id: "SKU_BAV_006", name: "2GB Campus Mobile Data Bundle", short: "2GB Data Bundle", price: 149.0, bucket: "FLEX", emoji: "📶", color: "#5a3aa8" },
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
  whitelist: "VAULT_OK" | "FLEX_OK" | "VALVE_LOCK";
  hash: string;
};

function timeNow() {
  return new Date().toISOString().split("T")[1].replace("Z", "").slice(0, 12);
}
function shortHash() {
  return "0x" + Array.from({ length: 10 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

/* ============ MAIN APP ============ */
export default function App() {
  const { beep, buzz } = useAudio();
  const [vault, setVault] = useState(VAULT_INIT);
  const [flex, setFlex] = useState(FLEX_INIT);
  const [grit, setGrit] = useState(840);
  const [receipt, setReceipt] = useState<ReceiptLine[]>([]);
  const [latency, setLatency] = useState(138);
  const [pulse, setPulse] = useState(false);
  const [beam, setBeam] = useState(false);
  const [violation, setViolation] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([
    { ts: timeNow(), node: "EDGE_042", sku: "—", desc: "ENGINE_BOOT · Handshake ACK", value: 0, whitelist: "VAULT_OK", hash: shortHash() },
  ]);
  const [tab, setTab] = useState<"Home" | "Shop" | "Sixty60" | "Audit">("Home");

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
      flashFX();
      const row: LedgerRow = {
        ts: timeNow(), node: "EDGE_042", sku: sku.id, desc: sku.short,
        value: sku.price, whitelist: "VALVE_LOCK", hash: shortHash(),
      };
      setLedger((L) => [row, ...L].slice(0, 60));
      setTimeout(() => setViolation(false), 2200);
      return;
    }
    beep();
    flashFX();
    setReceipt((r) => {
      const existing = r.find((l) => l.sku.id === sku.id);
      if (existing) return r.map((l) => (l.sku.id === sku.id ? { ...l, qty: l.qty + 1 } : l));
      return [...r, { sku, qty: 1 }];
    });
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
    const rows: LedgerRow[] = receipt.map((l) => ({
      ts: timeNow(),
      node: "EDGE_042",
      sku: l.sku.id,
      desc: `${l.sku.short}${l.qty > 1 ? ` ×${l.qty}` : ""}`,
      value: l.sku.price * l.qty,
      whitelist: l.sku.bucket === "VAULT" ? "VAULT_OK" : "FLEX_OK",
      hash: shortHash(),
    }));
    setLedger((L) => [...rows, ...L].slice(0, 60));
    setReceipt([]);
  }

  function resetAll() {
    setVault(VAULT_INIT); setFlex(FLEX_INIT); setReceipt([]); setGrit(840);
  }

  return (
    <div className="min-h-screen obsidian text-white">
      <MasterHeader />

      <div className="grid grid-cols-12 gap-4 px-4 py-4">
        {/* LEFT 35% — Student Wallet */}
        <section className="col-span-12 lg:col-span-4 xl:col-span-[35%] flex justify-center">
          <div className="w-full max-w-[380px]">
            <StudentPhone
              tab={tab} setTab={setTab}
              vault={vault} flex={flex} grit={grit}
              onScan={scan} onFinalize={finalize}
              receiptCount={receipt.length} total={total}
              ledger={ledger}
            />
          </div>
        </section>

        {/* RIGHT 65% — Fiduciary Sidecar Console */}
        <section className="col-span-12 lg:col-span-8 space-y-3 relative">
          {beam && (
            <div className="absolute -left-3 top-1/3 h-1 w-32 bg-gradient-to-r from-transparent via-sovereign-goldlite to-transparent rounded-full beam pointer-events-none z-30" />
          )}
          <SidecarHeader />
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 xl:col-span-8">
              <PosTillMirror
                receipt={receipt} total={total}
                onFinalize={finalize} onReset={resetAll}
                violation={violation} pulse={pulse}
              />
            </div>
            <div className="col-span-12 xl:col-span-4">
              <LatencyGauge latency={latency} pulse={pulse} />
              <FiduciaryValve vault={vault} flex={flex} />
            </div>
          </div>
          <CioAuditLedger rows={ledger} />
        </section>
      </div>

      <footer className="border-t border-white/5 mt-4 py-3 px-6 flex justify-between items-center text-[11px] mono text-white/50">
        <span>BAV™ SOVEREIGN FIDUCIARY ENGINE · Terminal #042 · 70/30 STATUTORY VALVE ENFORCED</span>
        <span><span className="gold-text font-bold">Principal Architect: Refilwe David Ledwaba</span></span>
      </footer>
    </div>
  );
}

/* ============ MASTER HEADER ============ */
function MasterHeader() {
  return (
    <header className="border-b border-sovereign-gold/30 bg-gradient-to-r from-[#0b0c10] via-[#14161b] to-[#0b0c10] px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          <span className="gold-text">BAV™ Sovereign Fiduciary Engine</span>
        </h1>
        <p className="text-[10px] mono text-white/50 mt-0.5">STATUTORY NSFAS ALLOCATION MATRIX · SUB-150MS HANDSHAKE · ISO8583 COMPLIANT</p>
      </div>
      <div className="flex items-center gap-5">
        <StatusLED label="POS LINK" />
        <StatusLED label="SIDECAR" />
        <StatusLED label="ISO8583 COMPLIANT" />
      </div>
    </header>
  );
}

function StatusLED({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="led inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
      <span className="text-[10px] mono text-white/70 tracking-wider">{label}</span>
    </div>
  );
}

/* ============ STUDENT PHONE (iPhone 15 Pro frame) ============ */
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
    <div className="phone-frame rounded-[48px] p-[6px] mx-auto">
      <div className="rounded-[44px] p-[2px] bg-gradient-to-b from-[#3a3a3e] via-[#0a0a0c] to-[#2a2a2e]">
        <div className="rounded-[42px] overflow-hidden bg-[#F4F4F4] h-[760px] flex flex-col relative">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30" />

          {/* Status bar */}
          <div className="bg-shoprite-red text-white pt-3 pb-2 px-5 flex justify-between text-[10px] mono">
            <span>12:45</span>
            <span className="opacity-0">.</span>
            <span>5G ●●●●○ 87%</span>
          </div>

          {/* App header */}
          <div className="bg-shoprite-red text-white px-4 pt-2 pb-3">
            {tab === "Home" && (
              <>
                <div className="text-[10px] uppercase tracking-widest opacity-90">Welcome back</div>
                <div className="text-xl font-black">Refilwe Mokoena</div>
              </>
            )}
            {tab !== "Home" && (
              <div className="text-lg font-black uppercase tracking-wide">{tab}</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin bg-[#F4F4F4]">
            {tab === "Home" && <HomeTab vault={vault} flex={flex} grit={grit} />}
            {tab === "Shop" && <ShopTab onScan={onScan} />}
            {tab === "Sixty60" && <Sixty60Tab onScan={onScan} />}
            {tab === "Audit" && <AuditTab ledger={ledger} />}
          </div>

          {/* Cart bar */}
          {receiptCount > 0 && (
            <button onClick={onFinalize}
              className="bg-sovereign-gold text-black font-black uppercase text-xs tracking-wider py-2.5 px-4 flex justify-between items-center hover:brightness-110">
              <span>Finalize / Pay · {receiptCount} item{receiptCount > 1 ? "s" : ""}</span>
              <span>R{total.toFixed(2)} →</span>
            </button>
          )}

          {/* Tab bar */}
          <nav className="bg-white border-t border-neutral-200 grid grid-cols-4">
            {(["Home", "Shop", "Sixty60", "Audit"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-2 text-[10px] font-bold uppercase tracking-wide ${tab === t ? "text-shoprite-red" : "text-neutral-400"}`}>
                <div className="text-base leading-none mb-0.5">
                  {t === "Home" ? "🏠" : t === "Shop" ? "🛒" : t === "Sixty60" ? "⚡" : "📊"}
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
  const vaultPct = (vault / VAULT_INIT) * 100;
  const flexPct = (flex / FLEX_INIT) * 100;
  return (
    <div className="p-3 space-y-3">
      {/* Hero — campus students */}
      <div className="rounded-2xl overflow-hidden h-36 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0c10] via-[#1a1c22] to-[#3a2a18]" />
        <div className="absolute inset-0 opacity-70"
             style={{ backgroundImage: "radial-gradient(circle at 30% 70%, rgba(197,160,89,0.35), transparent 55%), radial-gradient(circle at 80% 30%, rgba(227,6,19,0.35), transparent 55%)" }} />
        <div className="absolute right-3 bottom-2 text-3xl tracking-tight">🎓 👨🏾‍🎓 👩🏾‍🎓 📚</div>
        <div className="absolute inset-0 p-3 flex flex-col justify-between">
          <div className="inline-block self-start text-[9px] mono uppercase tracking-widest text-sovereign-goldlite border border-sovereign-gold/40 px-1.5 py-0.5 rounded">SA Campus Network</div>
          <div className="text-white">
            <div className="text-base font-black leading-tight">Students. Sovereign.<br/>Supplied.</div>
          </div>
        </div>
      </div>

      {/* Grit Score circular gauge on obsidian */}
      <div className="rounded-2xl obsidian gold-border p-4">
        <div className="flex items-center gap-4">
          <GritGauge value={grit} />
          <div>
            <div className="text-[9px] mono uppercase tracking-widest text-sovereign-goldlite">Grit Score™</div>
            <div className="text-3xl font-black gold-text leading-none">{grit}</div>
            <div className="text-[10px] mono text-white/60 mt-1">AAA-SOVEREIGN</div>
            <div className="text-[9px] mono text-emerald-400 mt-0.5">▲ +6 this cycle</div>
          </div>
        </div>
      </div>

      {/* NSFAS breakdown — gold progress bars */}
      <div className="bg-white rounded-2xl p-3 space-y-3">
        <div>
          <div className="flex justify-between text-[10px] mono uppercase text-neutral-500">
            <span>🔒 Locked Vault (Groceries)</span><span className="font-black text-black">R{vault.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-sovereign-gold to-sovereign-goldlite" style={{ width: `${vaultPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mono uppercase text-neutral-500">
            <span>💳 Flex Wallet</span><span className="font-black text-black">R{flex.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-sovereign-gold to-sovereign-goldlite" style={{ width: `${flexPct}%` }} />
          </div>
        </div>
        <div className="border-t border-neutral-200 pt-2 flex justify-between text-[10px] mono text-neutral-500">
          <span>STATUTORY POOL</span><span className="text-black font-black">R{TOTAL_POOL.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {["🛒 Shop","⚡ 60min","📍 Store","🎫 Voucher"].map(a => (
          <div key={a} className="bg-white rounded-xl py-2 text-[9px] font-black text-black text-center border border-neutral-200">{a}</div>
        ))}
      </div>
    </div>
  );
}

function GritGauge({ value }: { value: number }) {
  const pct = Math.min(1, value / 1000);
  const r = 32, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20">
      <defs>
        <linearGradient id="gritG" x1="0" x2="1">
          <stop offset="0" stopColor="#e8c97a" />
          <stop offset="1" stopColor="#c5a059" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#1f2127" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="url(#gritG)" strokeWidth="6"
        strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="900" fill="#e8c97a" fontFamily="JetBrains Mono">{value}</text>
    </svg>
  );
}

/* ---------- Shop Tab (Shoprite e-commerce clone) ---------- */
function ShopTab({ onScan }: { onScan: (s: SKU) => void }) {
  return (
    <div className="p-3 space-y-3 bg-[#F4F4F4]">
      {/* Search bar */}
      <div className="bg-white rounded-full px-3 py-2 flex items-center gap-2 border border-neutral-200">
        <span className="text-neutral-400 text-sm">🔍</span>
        <span className="text-[11px] text-neutral-400">Search Shoprite...</span>
      </div>

      {/* Yellow specials banner */}
      <div className="bg-shoprite-yellow text-black rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide flex items-center justify-between">
        <span>⚡ All Specials · Xtra Savings</span>
        <span className="bg-shoprite-red text-white text-[9px] px-1.5 py-0.5 rounded">NEW</span>
      </div>

      {/* Sixty60 promo */}
      <div className="bg-white rounded-lg p-2.5 flex items-center justify-between border border-neutral-200">
        <div>
          <div className="text-shoprite-red font-black text-sm">Sixty<span className="text-black">60</span></div>
          <div className="text-[9px] text-neutral-500">Delivered in 60 minutes</div>
        </div>
        <span className="text-[10px] font-black bg-shoprite-red text-white px-2 py-1 rounded">SHOP →</span>
      </div>

      <div className="text-[11px] font-black uppercase text-neutral-600">Statutory Staples & Flex</div>

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
      <div className="absolute top-1 right-1 bg-shoprite-red text-white text-[7px] font-black px-1 py-0.5 rounded mono">
        Sixty<span className="text-shoprite-yellow">60</span>
      </div>
      <div className="aspect-square rounded mb-2 flex items-center justify-center text-5xl"
           style={{ background: `linear-gradient(135deg, ${s.color}22, ${s.color}11)` }}>
        <span>{s.emoji}</span>
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
            <div className="aspect-square rounded mb-1 flex items-center justify-center text-3xl"
                 style={{ background: `linear-gradient(135deg, ${s.color}33, ${s.color}11)` }}>
              {s.emoji}
            </div>
            <div className="text-[10px] font-black">{s.short}</div>
            <div className="text-sm font-black text-shoprite-red">R{s.price.toFixed(2)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ ledger }: { ledger: LedgerRow[] }) {
  return (
    <div className="bg-[#0b0c10] text-white min-h-full p-3 mono">
      <div className="text-[10px] uppercase opacity-60 tracking-widest mb-2 gold-text font-black">Spending Compliance Ledger</div>
      <div className="text-[9px] opacity-50 mb-2">Read-only · Verified by BAV™ Secure Link</div>
      <div className="space-y-1">
        {ledger.slice(0, 14).map((r, i) => (
          <div key={i} className="border-b border-white/10 py-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="opacity-70">{r.ts}</span>
              <span className={r.whitelist === "VALVE_LOCK" ? "text-shoprite-red font-black" : "text-emerald-400 font-black"}>
                {r.whitelist}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="truncate">{r.desc}</span>
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
    <div className="bg-shoprite-red text-white px-4 py-2.5 rounded-lg border-b-2 border-sovereign-gold flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-white text-shoprite-red font-black text-xs px-2 py-1 rounded mono">SHOPRITE</div>
        <div className="font-black text-sm tracking-wide">SHOPRITE TILL #042 — SIDECAR INTEGRITY CHECK</div>
      </div>
      <div className="mono text-[10px] flex items-center gap-2">
        <span className="led inline-block w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
        <span>CIO OVERSIGHT · LIVE</span>
      </div>
    </div>
  );
}

/* ============ POS TILL MIRROR ============ */
function PosTillMirror({
  receipt, total, onFinalize, onReset, violation, pulse,
}: {
  receipt: ReceiptLine[]; total: number;
  onFinalize: () => void; onReset: () => void;
  violation: boolean; pulse: boolean;
}) {
  return (
    <div className={`rounded-lg overflow-hidden border-2 ${violation ? "border-shoprite-red" : "border-sovereign-gold/40"} bg-[#1b1d22] shadow-2xl`}>
      <div className={`${violation ? "flash-red" : "bg-[#14161b]"} text-white px-3 py-2 flex justify-between items-center border-b border-sovereign-gold/30`}>
        <div className="mono text-[10px]">
          <span className="text-sovereign-goldlite font-black">POS TILL #042</span> · CASHIER MK · TERMINAL ONLINE
        </div>
        <div className="mono text-[10px] text-emerald-400">BAV™ SECURE LINK ▮▮▮▮▮</div>
      </div>

      {violation && (
        <div className="bg-shoprite-red text-white text-center mono font-black text-xs py-2 border-y-2 border-sovereign-gold animate-pulse">
          ⚠ ERR_70_30_RATIO_VIOLATION : VALVE LOCKED ⚠
        </div>
      )}

      {/* Cashier screen */}
      <div className="bg-[#0f1115] p-3 grid grid-cols-5 gap-3 min-h-[340px]">
        {/* Itemized list (cashier UI feel) */}
        <div className="col-span-3 bg-black/40 rounded border border-white/10 p-3 mono">
          <div className="grid grid-cols-12 text-[9px] uppercase tracking-widest text-sovereign-goldlite border-b border-white/15 pb-1 mb-1">
            <div className="col-span-2">QTY</div>
            <div className="col-span-7">ITEM</div>
            <div className="col-span-3 text-right">VALUE</div>
          </div>
          <div className="space-y-0.5 max-h-[260px] overflow-y-auto scrollbar-thin">
            {receipt.length === 0 && (
              <div className="text-center text-white/30 italic py-16 text-xs">— awaiting scan from student wallet —</div>
            )}
            {receipt.map((l, i) => (
              <div key={i}
                className={`grid grid-cols-12 text-[11px] py-1 border-b border-white/5 ${pulse && i === receipt.length - 1 ? "bg-sovereign-gold/30" : ""}`}>
                <div className="col-span-2 font-black text-sovereign-goldlite">×{l.qty}</div>
                <div className="col-span-7">
                  <div className="text-white">{l.sku.short}</div>
                  <div className="text-[9px] text-white/40">{l.sku.id} · {l.sku.bucket}</div>
                </div>
                <div className="col-span-3 text-right font-black text-white">R{(l.sku.price * l.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Big total display */}
        <div className="col-span-2 flex flex-col">
          <div className="bg-black border border-sovereign-gold/40 rounded p-3 flex-1 flex flex-col">
            <div className="mono text-[10px] uppercase tracking-widest text-white/60">Sale Total</div>
            <div className="mono text-5xl font-black gold-text leading-none mt-2">
              R{total.toFixed(2)}
            </div>
            <div className="mt-auto mono text-[10px] text-emerald-400">
              {receipt.length ? "AWAITING SETTLEMENT" : "READY · PAID via BAV™"}
            </div>
            <div className="mono text-[9px] text-white/40 mt-1">VAT @ 15% incl.</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={onFinalize} disabled={!receipt.length}
              className="bg-sovereign-gold disabled:bg-neutral-700 disabled:text-white/40 text-black font-black py-2.5 rounded uppercase tracking-wider text-xs hover:brightness-110">
              Finalize
            </button>
            <button onClick={onReset}
              className="bg-neutral-800 text-white font-black py-2.5 rounded uppercase tracking-wider text-xs">
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ CENTRAL SPEEDOMETER ============ */
function LatencyGauge({ latency, pulse }: { latency: number; pulse: boolean }) {
  const pct = Math.min(100, (latency / 200) * 100);
  const angle = (pct / 100) * 270 - 135;
  return (
    <div className={`obsidian gold-border rounded-lg p-3 ${pulse ? "gold-pulse" : ""} mb-3`}>
      <div className="text-[9px] mono uppercase opacity-60 tracking-widest mb-1 text-sovereign-goldlite">T_RESPONSE · Handshake Loop</div>
      <div className="relative aspect-square max-w-[180px] mx-auto">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="lg1" x1="0" x2="1">
              <stop offset="0" stopColor="#e8c97a" />
              <stop offset="1" stopColor="#E30613" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="80" fill="none" stroke="#1a1d22" strokeWidth="12" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="url(#lg1)" strokeWidth="12"
            strokeDasharray={`${(pct / 100) * 377} 999`} strokeLinecap="round"
            transform="rotate(135 100 100)" />
          <line x1="100" y1="100" x2="100" y2="40" stroke="#e8c97a" strokeWidth="3"
            transform={`rotate(${angle} 100 100)`} strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill="#e8c97a" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
          <div className={`text-3xl font-black mono ${pulse ? "text-sovereign-goldlite" : "text-white"}`}>{latency}<span className="text-base">ms</span></div>
          <div className="text-[9px] mono mt-1 text-emerald-400">SLA &lt; 150ms · PASS</div>
        </div>
      </div>
    </div>
  );
}

function FiduciaryValve({ vault, flex }: { vault: number; flex: number }) {
  const total = vault + flex || 1;
  const vp = Math.round((vault / total) * 100);
  return (
    <div className="obsidian gold-border rounded-lg p-3">
      <div className="text-[9px] mono uppercase opacity-60 tracking-widest mb-2 text-sovereign-goldlite">Fiduciary Valve · 70/30</div>
      <div className="h-3 bg-black/60 rounded-full overflow-hidden flex border border-white/10">
        <div className="bg-shoprite-red h-full" style={{ width: `${vp}%` }} />
        <div className="bg-sovereign-gold h-full" style={{ width: `${100 - vp}%` }} />
      </div>
      <div className="flex justify-between mono text-[10px] mt-2">
        <span className="text-shoprite-red font-black">VAULT R{vault.toFixed(2)}</span>
        <span className="text-sovereign-goldlite font-black">FLEX R{flex.toFixed(2)}</span>
      </div>
    </div>
  );
}

/* ============ CIO AUDIT LEDGER ============ */
function CioAuditLedger({ rows }: { rows: LedgerRow[] }) {
  return (
    <div className="obsidian gold-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-black/40 border-b border-sovereign-gold/30 flex justify-between items-center">
        <div className="mono text-[11px] tracking-widest gold-text font-black">CIO AUDIT LEDGER · BAV™ CHAIN-OF-CUSTODY</div>
        <div className="mono text-[9px] text-emerald-400">● LIVE · {rows.length} VERIFIED ROWS</div>
      </div>
      <div className="overflow-x-auto max-h-[260px] overflow-y-auto scrollbar-thin">
        <table className="w-full mono text-[10px]">
          <thead className="sticky top-0 bg-[#14161b]">
            <tr className="text-left text-sovereign-goldlite uppercase tracking-widest text-[9px] border-b border-sovereign-gold/30">
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-2 py-2">Edge Node ID</th>
              <th className="px-2 py-2">SKU_ID</th>
              <th className="px-2 py-2">Item Desc</th>
              <th className="px-2 py-2 text-right">Value</th>
              <th className="px-2 py-2">Whitelist</th>
              <th className="px-2 py-2">Compliance Hash</th>
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
                <td className={`px-2 py-1.5 font-black ${r.whitelist === "VALVE_LOCK" ? "text-shoprite-red" : "text-emerald-400"}`}>
                  {r.whitelist}
                </td>
                <td className="px-2 py-1.5 text-white/50">{r.hash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
