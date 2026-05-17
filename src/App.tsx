import { useEffect, useMemo, useRef, useState } from "react";
import heroStudents from "@/assets/hero-students.jpg";
import imgMaize from "@/assets/maize.png";
import imgMilk from "@/assets/milk.png";
import imgBread from "@/assets/bread.png";
import imgPads from "@/assets/pads.png";
import imgChoc from "@/assets/choc.png";

/* ============ TYPES & DATA ============ */
type Bucket = "VAULT" | "FLEX";
type Flag = "WHITELIST" | "LUXURY";
type SKU = {
  id: string;
  name: string;
  short: string;
  price: number;
  bucket: Bucket;
  flag: Flag;
  allocation_bucket: "70_LOCKED_VAULT" | "30_DYNAMIC_FLEX";
  compliance_status: "WHITELIST_APPROVED" | "DISCRETIONARY_ALLOWED";
  priority?: boolean;
  img: string;
  emoji?: string;
  accent: string;
};

const INVENTORY: SKU[] = [
  { id: "SKU_BAV_001", name: "Ritebrand Super Maize Meal 10kg", short: "Ritebrand Maize Meal 10kg", price: 79.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", img: imgMaize, accent: "#f5c518" },
  { id: "SKU_BAV_002", name: "Ritebrand Long Life Full Cream Milk 1L", short: "Ritebrand Milk 1L", price: 16.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", img: imgMilk, accent: "#1f4ea1" },
  { id: "SKU_BAV_003", name: "Stayfree Maxi Scented Pads 10-Pack", short: "Stayfree Maxi Pads 10pk", price: 22.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", priority: true, img: imgPads, accent: "#2aa57f" },
  { id: "SKU_BAV_004", name: "Albany Superior Sliced White Bread", short: "Albany Superior White Bread", price: 19.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", img: imgBread, accent: "#1a4a8a" },
  { id: "SKU_BAV_007", name: "Discretionary Soft Drink / Soda 2L", short: "Soft Drink Soda 2L", price: 14.99, bucket: "FLEX", flag: "LUXURY", allocation_bucket: "30_DYNAMIC_FLEX", compliance_status: "DISCRETIONARY_ALLOWED", img: "", emoji: "🥤", accent: "#c2410c" },
  { id: "SKU_BAV_008", name: "Cadbury Dairy Milk Chocolate Slab 80g", short: "Cadbury Dairy Milk 80g", price: 24.99, bucket: "FLEX", flag: "LUXURY", allocation_bucket: "30_DYNAMIC_FLEX", compliance_status: "DISCRETIONARY_ALLOWED", img: imgChoc, accent: "#6b3a8f" },
  { id: "SKU_BAV_009", name: "2GB Campus Mobile Data Bundle", short: "2GB Campus Data Bundle", price: 149.0, bucket: "FLEX", flag: "LUXURY", allocation_bucket: "30_DYNAMIC_FLEX", compliance_status: "DISCRETIONARY_ALLOWED", img: "", emoji: "📶", accent: "#5a3aa8" },
];

const TOTAL_POOL = 1650;
const VAULT_INIT = 1155;
const FLEX_INIT = 495;
const SLA_MS = 150;
const TARGET_MS = 138;

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
    [220, 160, 110].forEach((f, i) => {
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
  whitelist: "WHITELIST" | "LUXURY" | "VALVE_LOCK";
  hash: string;
};
type PulseRow = {
  event: "POS_SKU_SCAN" | "VALVE_LOCK";
  sku: string;
  item_description: string;
  cost: number;
  allocation_bucket: string;
  compliance_status: string;
  flag: "WHITELIST" | "LUXURY" | "VALVE_LOCK";
  handshake_latency: string;
};

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
  const [receipt, setReceipt] = useState<ReceiptLine[]>([]);
  const [latency, setLatency] = useState(TARGET_MS);
  const [pulse, setPulse] = useState(false);
  const [beam, setBeam] = useState(false);
  const [violation, setViolation] = useState(false);
  const [paid, setPaid] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [telemetry, setTelemetry] = useState<PulseRow[]>([]);
  const [tab, setTab] = useState<"Home" | "Shop" | "Sixty60" | "Merit" | "Audit">("Home");

  const total = useMemo(() => receipt.reduce((s, l) => s + l.sku.price * l.qty, 0), [receipt]);

  function flashFX() {
    setPulse(true); setBeam(true);
    setLatency(TARGET_MS);
    setTimeout(() => setPulse(false), 900);
    setTimeout(() => setBeam(false), 700);
    return TARGET_MS;
  }

  function scan(sku: SKU) {
    setPaid(false);
    const flexSpend = receipt.filter((l) => l.sku.bucket === "FLEX").reduce((s, l) => s + l.sku.price * l.qty, 0);
    if (sku.bucket === "FLEX" && flex - flexSpend - sku.price < 0) {
      buzz();
      setViolation(true);
      const lat = flashFX();
      setLedger((L) => [{
        ts: timeNow(), node: "BAV_ST_001", sku: sku.id, desc: sku.short,
        value: sku.price, whitelist: "VALVE_LOCK" as const, hash: `Compliance Hashing(${shortHash()}`,
      }, ...L].slice(0, 60));
      setTelemetry((T) => [{
        event: "VALVE_LOCK", sku: sku.id, item_description: sku.name, cost: sku.price,
        allocation_bucket: sku.allocation_bucket, compliance_status: "ERR_70_30_RATIO_VIOLATION",
        flag: "VALVE_LOCK", handshake_latency: `${lat}ms`,
      }, ...T].slice(0, 14));
      setTimeout(() => setViolation(false), 2400);
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
      value: sku.price, whitelist: sku.flag, hash: `Compliance Hashing(${shortHash()}`,
    }, ...L].slice(0, 60));
    setTelemetry((T) => [{
      event: "POS_SKU_SCAN", sku: sku.id, item_description: sku.name, cost: sku.price,
      allocation_bucket: sku.allocation_bucket, compliance_status: sku.compliance_status,
      flag: sku.flag, handshake_latency: `${lat}ms`,
    }, ...T].slice(0, 14));
  }

  function finalize() {
    if (receipt.length === 0) return;
    const vaultSpend = receipt.filter((l) => l.sku.bucket === "VAULT").reduce((s, l) => s + l.sku.price * l.qty, 0);
    const flexSpend = receipt.filter((l) => l.sku.bucket === "FLEX").reduce((s, l) => s + l.sku.price * l.qty, 0);
    setVault((v) => Math.max(0, v - vaultSpend));
    setFlex((f) => Math.max(0, f - flexSpend));
    setGrit((g) => g + Math.min(12, receipt.length * 3));
    beep();
    flashFX();
    setLedger((L) => [{
      ts: timeNow(), node: "BAV_ST_001", sku: "SETTLEMENT", desc: `PAID via BAV™ · ${receipt.length} items · R${(vaultSpend+flexSpend).toFixed(2)}`,
      value: vaultSpend + flexSpend, whitelist: "WHITELIST" as const, hash: `Compliance Hashing(${shortHash()}`,
    }, ...L].slice(0, 60));
    setReceipt([]);
    setPaid(true);
    setTimeout(() => setPaid(false), 4000);
  }

  function resetAll() {
    setVault(VAULT_INIT); setFlex(FLEX_INIT); setReceipt([]); setGrit(840); setPaid(false);
  }

  // tiny idle jitter — but always settles at TARGET_MS during scans
  useEffect(() => {
    const id = setInterval(() => setLatency(() => TARGET_MS + (Math.random() < 0.5 ? -2 : 2)), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen obsidian text-white">
      <MasterHeader />

      <div className="grid grid-cols-12 gap-4 px-4 py-4">
        {/* LEFT 35% — Student Wallet */}
        <section className="col-span-12 lg:col-span-4 flex justify-center">
          <div className="w-full max-w-[360px] relative">
            {violation && (
              <div className="absolute -top-2 left-0 right-0 bg-shoprite-red text-white text-center mono font-black text-[10px] py-1.5 rounded flash-red border-y-2 border-sovereign-gold z-40">
                ⚠ FIDUCIARY VALVE LOCKED · ERR_70_30_RATIO_VIOLATION ⚠
              </div>
            )}
            <StudentPhone
              tab={tab} setTab={setTab}
              vault={vault} flex={flex} grit={grit}
              onScan={scan} onFinalize={finalize}
              receipt={receipt} total={total}
              ledger={ledger}
              violation={violation}
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
              ⚠ FIDUCIARY VALVE LOCKED : ERR_70_30_RATIO_VIOLATION ⚠
            </div>
          )}

          {/* TOP — Till checkout: Cashier grid + Paper receipt */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 xl:col-span-7">
              <CashierInventoryGrid receipt={receipt} pulse={pulse} paid={paid} />
            </div>
            <div className="col-span-12 xl:col-span-5">
              <LiveReceiptList receipt={receipt} total={total} onFinalize={finalize} onReset={resetAll} paid={paid} />
            </div>
          </div>

          {/* Secure Rail Link bar (replaces circular speedometer) */}
          <SecureRailLinkBar latency={latency} pulse={pulse} />

          {/* MIDDLE — Live Telemetry Pulse (above ledger) */}
          <TelemetryPulse rows={telemetry} />

          {/* BOTTOM — CIO Audit Ledger */}
          <CioAuditLedger rows={ledger} />
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
  tab, setTab, vault, flex, grit, onScan, onFinalize, receipt, total, ledger, violation,
}: {
  tab: any; setTab: (t: any) => void;
  vault: number; flex: number; grit: number;
  onScan: (s: SKU) => void; onFinalize: () => void;
  receipt: ReceiptLine[]; total: number;
  ledger: LedgerRow[];
  violation: boolean;
}) {
  const receiptCount = receipt.reduce((s, l) => s + l.qty, 0);
  return (
    <div className="phone-frame rounded-[44px] p-[5px] mx-auto">
      <div className="rounded-[40px] p-[2px] bg-gradient-to-b from-[#3a3a3e] via-[#0a0a0c] to-[#2a2a2e]">
        <div className="rounded-[38px] overflow-hidden bg-white h-[720px] flex flex-col relative">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />

          <div className="bg-shoprite-red text-white pt-3 pb-1 px-5 flex justify-between text-[10px] mono">
            <span>9:41</span><span className="opacity-0">.</span><span>5G ●●●●○ 87%</span>
          </div>

          <div className="bg-shoprite-red text-white px-4 py-2 flex items-center justify-between">
            <span className="text-lg">☰</span>
            <div className="font-black text-base">Student App</div>
            <span className="text-lg">🔔</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin bg-white relative">
            {violation && (
              <div className="sticky top-0 z-20 bg-shoprite-red text-white text-center mono font-black text-[10px] py-1.5 flash-red">
                ⚠ VALVE LOCK · ERR_70_30_RATIO_VIOLATION
              </div>
            )}
            {tab === "Home" && <HomeTab vault={vault} flex={flex} grit={grit} />}
            {tab === "Shop" && <ShopTab onScan={onScan} receipt={receipt} />}
            {tab === "Sixty60" && <Sixty60Tab onScan={onScan} />}
            {tab === "Merit" && <MeritTab grit={grit} />}
            {tab === "Audit" && <AuditTab ledger={ledger} />}
          </div>

          {receiptCount > 0 && tab !== "Home" && (
            <button onClick={onFinalize}
              className="bg-sovereign-gold text-black font-black uppercase text-xs tracking-wider py-2 px-4 flex justify-between items-center hover:brightness-110">
              <span>Finalize / Pay · {receiptCount} item{receiptCount > 1 ? "s" : ""}</span>
              <span>R{total.toFixed(2)} →</span>
            </button>
          )}

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
      <div className="relative h-44 overflow-hidden">
        <img src={heroStudents} alt="South African university students on campus" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
          <GritGauge value={grit} />
          <div className="text-[9px] mono text-white mt-1 font-black drop-shadow">Value:</div>
          <div className="text-[9px] mono text-sovereign-goldlite font-black">AAA-Sovereign</div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-white rounded-xl p-3 space-y-3 border border-neutral-200">
          <div className="text-center">
            <div className="text-[9px] mono uppercase text-neutral-500">Official NSFAS Statutory Monthly</div>
            <div className="text-[9px] mono uppercase text-neutral-500 mb-1">Living Allowance</div>
            <div className="text-2xl font-black text-black">R{TOTAL_POOL.toFixed(2)}</div>
            <div className="text-[9px] mono uppercase text-neutral-500">Total Monthly Pool</div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] mono uppercase text-neutral-600">
              <span className="font-black text-black">Vault (70% Locked)</span>
              <span className="font-black text-black">R{vault.toFixed(2)}</span>
            </div>
            <div className="h-2.5 bg-neutral-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sovereign-gold to-sovereign-goldlite" style={{ width: `${(vault / VAULT_INIT) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mono uppercase text-neutral-600">
              <span className="font-black text-black">Flex (30% Dynamic)</span>
              <span className="font-black text-black">R{flex.toFixed(2)}</span>
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
function ShopTab({ onScan, receipt }: { onScan: (s: SKU) => void; receipt: ReceiptLine[] }) {
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
        {INVENTORY.map(s => {
          const qty = receipt.find(l => l.sku.id === s.id)?.qty || 0;
          return <ProductCard key={s.id} s={s} onScan={onScan} qty={qty} />;
        })}
      </div>
    </div>
  );
}

function ProductCard({ s, onScan, qty }: { s: SKU; onScan: (s: SKU) => void; qty: number }) {
  return (
    <button onClick={() => onScan(s)}
      className="bg-white border border-neutral-200 rounded-lg p-2 text-left hover:shadow-md transition relative overflow-hidden">
      <div className="absolute top-1 right-1 bg-shoprite-red text-white text-[7px] font-black px-1 py-0.5 rounded mono z-10">
        Sixty<span className="text-shoprite-yellow">60</span>
      </div>
      {qty > 0 && (
        <div className="absolute top-1 left-1 bg-sovereign-gold text-black text-[8px] font-black px-1.5 py-0.5 rounded mono z-10">×{qty}</div>
      )}
      <div className="aspect-square rounded mb-2 flex items-center justify-center bg-white overflow-hidden">
        {s.img ? (
          <img src={s.img} alt={s.short} className="w-full h-full object-contain p-1" loading="lazy" />
        ) : (
          <div className="text-4xl">{s.emoji || "📦"}</div>
        )}
      </div>
      <div className="text-[10px] font-black text-black leading-tight line-clamp-2 min-h-[26px]">{s.short}</div>
      <div className="flex items-baseline gap-0.5 mt-1">
        <span className="text-shoprite-red text-base font-black">R{Math.floor(s.price)}</span>
        <span className="text-shoprite-red text-[9px] font-black">.{s.price.toFixed(2).split(".")[1]}</span>
      </div>
      <div className="flex gap-1 mt-0.5 flex-wrap">
        <span className={`text-[8px] font-black uppercase inline-block px-1 py-0.5 rounded ${s.flag === "WHITELIST" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {s.flag === "WHITELIST" ? "🔒 WHITELIST" : "💳 LUXURY"}
        </span>
        {s.priority && <span className="text-[8px] font-black uppercase inline-block px-1 py-0.5 rounded bg-pink-100 text-pink-800">★ DIGNITY</span>}
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
              {s.img ? <img src={s.img} alt={s.short} className="w-full h-full object-contain p-1" loading="lazy" /> : <div className="text-3xl">{s.emoji}</div>}
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
              <span className={r.whitelist === "VALVE_LOCK" ? "text-shoprite-red font-black" : r.whitelist === "LUXURY" ? "text-amber-300 font-black" : "text-emerald-400 font-black"}>{r.whitelist}</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate pr-2">{r.desc}</span>
              <span className="font-black">R{r.value.toFixed(2)}</span>
            </div>
          </div>
        ))}
        {ledger.length === 0 && <div className="text-center opacity-40 py-6 text-[10px]">— no transactions yet —</div>}
      </div>
    </div>
  );
}

/* ============ SIDECAR HEADER ============ */
function SidecarHeader() {
  return (
    <div className="bg-shoprite-red text-white px-4 py-3 rounded-md border-b-4 border-sovereign-gold flex items-center justify-center shadow-lg">
      <div className="font-black text-sm md:text-base tracking-wide mono text-center">
        SHOPRITE POS TILL #042 — BAV™ SIDE-CAR INTEGRITY CHECK
      </div>
    </div>
  );
}

/* ============ CASHIER INVENTORY GRID ============ */
function CashierInventoryGrid({ receipt, pulse, paid }: { receipt: ReceiptLine[]; pulse: boolean; paid: boolean }) {
  return (
    <div className="bg-[#1b1d22] rounded-lg border border-sovereign-gold/40 overflow-hidden shadow-2xl h-full relative">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30 flex justify-between">
        <div className="mono text-[10px] text-sovereign-goldlite font-black tracking-widest">▾ CASHIER INVENTORY GRID</div>
        <div className="mono text-[9px] text-white/50">TILL #042</div>
      </div>
      <div className="p-2 space-y-1.5 min-h-[260px]">
        {receipt.length === 0 && !paid && (
          <div className="text-center text-white/30 italic py-10 text-xs mono">— awaiting scan from student wallet —</div>
        )}
        {receipt.map((l, i) => (
          <div key={i}
            className={`bg-white rounded-md flex items-center gap-2 p-1.5 border-l-4 ${pulse && i === receipt.length - 1 ? "ring-2 ring-sovereign-gold" : ""}`}
            style={{ borderLeftColor: l.sku.accent }}>
            <div className="w-12 h-12 bg-white rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
              {l.sku.img ? <img src={l.sku.img} alt={l.sku.short} className="w-full h-full object-contain" loading="lazy" /> : <div className="text-2xl">{l.sku.emoji}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-black text-black truncate">
                {l.sku.short} <span className="text-neutral-500">× {l.qty}</span> — <span className="text-shoprite-red">R{(l.sku.price * l.qty).toFixed(2)}</span>
              </div>
              <div className="text-[9px] mono text-neutral-600">
                [{l.sku.allocation_bucket} · {l.sku.flag}{l.sku.priority ? " · Priority Dignity" : ""}]
              </div>
            </div>
          </div>
        ))}
      </div>
      {paid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-emerald-400 font-black mono text-3xl md:text-4xl rotate-[-12deg] border-4 border-emerald-400 px-4 py-1 rounded opacity-90 bg-black/30">
            PAID via BAV™
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ LIVE RECEIPT LIST (paper) ============ */
function LiveReceiptList({ receipt, total, onFinalize, onReset, paid }: {
  receipt: ReceiptLine[]; total: number; onFinalize: () => void; onReset: () => void; paid: boolean;
}) {
  return (
    <div className="bg-[#1b1d22] rounded-lg border border-sovereign-gold/40 overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30">
        <div className="mono text-[10px] text-sovereign-goldlite font-black tracking-widest">PAPER STORE RECEIPT</div>
      </div>
      <div className="p-2 flex-1">
        <div className="bg-[#f7f3e8] text-black p-2.5 mono text-[9px] leading-tight shadow-inner h-full relative">
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
          {receipt.length === 0 && !paid && <div className="text-center italic text-[8px] py-4 opacity-60">— empty —</div>}
          {receipt.map((l, i) => (
            <div key={i} className="text-[8px] mb-1">
              <div className="grid grid-cols-12">
                <div className="col-span-7 truncate">{l.sku.short}</div>
                <div className="col-span-2 text-center">{l.qty}</div>
                <div className="col-span-3 text-right">R{(l.sku.price * l.qty).toFixed(2)}</div>
              </div>
              <div className="text-[7px] opacity-70">{l.sku.id} [{l.sku.allocation_bucket}]</div>
            </div>
          ))}
          <div className="border-t border-dashed border-black/40 my-1" />
          <div className="grid grid-cols-12 text-[9px]">
            <div className="col-span-9">Sub-Total:</div>
            <div className="col-span-3 text-right">R{total.toFixed(2)}</div>
          </div>
          <div className="grid grid-cols-12 font-black text-[10px] mt-0.5">
            <div className="col-span-9">TOTAL:</div>
            <div className="col-span-3 text-right">R{total.toFixed(2)}</div>
          </div>
          {paid && (
            <div className="mt-2 text-center text-emerald-700 font-black border-2 border-emerald-700 rounded py-1">
              ✓ PAID via BAV™
            </div>
          )}
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

/* ============ SECURE RAIL LINK PERFORMANCE BAR ============ */
function SecureRailLinkBar({ latency, pulse }: { latency: number; pulse: boolean }) {
  const pct = Math.min(100, (latency / 200) * 100);
  const slaPct = (SLA_MS / 200) * 100;
  return (
    <div className={`bg-[#1b1d22] border border-sovereign-gold/40 rounded-lg p-3 ${pulse ? "gold-pulse" : ""}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="mono text-[11px] text-sovereign-goldlite font-black tracking-widest">
          🔒 BAV™ SECURE RAIL LINK PERFORMANCE INDEX
        </div>
        <div className="mono text-[10px] text-emerald-400 font-black">● LINK OK</div>
      </div>

      {/* Hardware-style bar */}
      <div className="relative h-7 rounded bg-black/70 border border-white/10 overflow-hidden shadow-inner">
        {/* segmented backdrop */}
        <div className="absolute inset-0 grid grid-cols-20" style={{ gridTemplateColumns: "repeat(20, 1fr)" }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border-r border-white/5" />
          ))}
        </div>
        {/* SLA threshold marker */}
        <div className="absolute top-0 bottom-0 w-[2px] bg-shoprite-red z-20 shadow-[0_0_8px_rgba(227,6,19,0.8)]" style={{ left: `${slaPct}%` }} />
        {/* fill */}
        <div
          className="absolute top-0 bottom-0 left-0 transition-all duration-200 ease-out z-10"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #10b981 0%, #34d399 60%, #6ee7b7 100%)",
            boxShadow: pulse ? "0 0 24px rgba(52,211,153,0.95) inset, 0 0 14px rgba(52,211,153,0.6)" : "0 0 10px rgba(52,211,153,0.45) inset",
          }}
        />
        {/* readout */}
        <div className="absolute inset-0 flex items-center justify-center mono text-[11px] font-black text-white tracking-wider z-30 drop-shadow">
          {latency}ms
        </div>
      </div>

      <div className="flex justify-between mt-1.5">
        <div className="mono text-[9px] text-white/50">0ms</div>
        <div className="mono text-[9px] text-shoprite-red font-black">SLA &lt; {SLA_MS}ms</div>
        <div className="mono text-[9px] text-white/50">200ms</div>
      </div>

      <div className="mt-2 bg-emerald-500/10 border border-emerald-400/40 rounded px-2 py-1 mono text-[10px] text-emerald-300 font-black tracking-wide text-center">
        {latency}ms / SLA &lt; {SLA_MS}ms REQUIREMENT PASSED (ISO 8583 PROTOCAL)
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
      <div className="overflow-x-auto max-h-[240px] overflow-y-auto scrollbar-thin">
        <table className="w-full mono text-[10px]">
          <thead className="sticky top-0 bg-[#14161b]">
            <tr className="text-left text-sovereign-goldlite uppercase tracking-widest text-[9px] border-b border-sovereign-gold/30">
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-2 py-2">Edge Node ID<br/><span className="text-white/40 normal-case">(BAV_ST_001)</span></th>
              <th className="px-2 py-2">SKU_ID</th>
              <th className="px-2 py-2">Item Desc</th>
              <th className="px-2 py-2 text-right">Value</th>
              <th className="px-2 py-2">Flag<br/>Status</th>
              <th className="px-2 py-2">Compliance Hashing</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-white/30 italic py-8">— awaiting verified transactions —</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-1.5 text-white/70">{r.ts}</td>
                <td className="px-2 py-1.5 text-white/80">{r.node}</td>
                <td className="px-2 py-1.5 text-sovereign-goldlite">{r.sku}</td>
                <td className="px-2 py-1.5 text-white">{r.desc}</td>
                <td className="px-2 py-1.5 text-right font-black text-white">R{r.value.toFixed(2)}</td>
                <td className={`px-2 py-1.5 font-black ${r.whitelist === "VALVE_LOCK" ? "text-shoprite-red" : r.whitelist === "LUXURY" ? "text-amber-300" : "text-emerald-400"}`}>
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

/* ============ TELEMETRY PULSE — full JSON objects ============ */
function TelemetryPulse({ rows }: { rows: PulseRow[] }) {
  return (
    <div className="obsidian gold-border rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30 flex justify-between items-center">
        <div className="mono text-[10px] tracking-widest text-sovereign-goldlite font-black">LIVE TELEMETRY PULSE (SHA-256 JSON)</div>
        <div className="mono text-[9px] text-emerald-400">● STREAMING</div>
      </div>
      <div className="p-2 bg-black max-h-[220px] overflow-y-auto scrollbar-thin space-y-1">
        {rows.length === 0 && <div className="mono text-[10px] text-emerald-700 italic">// awaiting POS_SKU_SCAN events …</div>}
        {rows.map((r, i) => {
          const flagColor =
            r.flag === "VALVE_LOCK" ? "text-shoprite-red" :
            r.flag === "LUXURY" ? "text-amber-300" : "text-emerald-300";
          return (
            <pre key={i} className="mono text-[10px] text-emerald-400 leading-tight whitespace-pre-wrap">
{`{ "event": "`}<span className={r.event === "VALVE_LOCK" ? "text-shoprite-red" : "text-emerald-300"}>{r.event}</span>{`", "sku": "`}<span className="text-sovereign-goldlite">{r.sku}</span>{`", "item_description": "${r.item_description}", "cost": ${r.cost.toFixed(2)}, "fiduciary_valve": { "allocation_bucket": "`}<span className="text-sovereign-goldlite">{r.allocation_bucket}</span>{`", "compliance_status": "`}<span className={flagColor}>{r.compliance_status}</span>{`", "flag": "`}<span className={flagColor}>{r.flag}</span>{`" }, "handshake_latency": "`}<span className="text-emerald-200">{r.handshake_latency}</span>{`" }`}
            </pre>
          );
        })}
      </div>
    </div>
  );
}
