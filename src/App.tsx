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
type Category = "Nutritional Staples" | "Girl Child Protocol" | "Discretionary";
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
  category: Category;
  grit: number;
  img: string;
  emoji?: string;
  accent: string;
};

const INVENTORY: SKU[] = [
  { id: "SKU_BAV_001", name: "Ritebrand Super Maize Meal 10kg", short: "Ritebrand Maize Meal 10kg", price: 79.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", category: "Nutritional Staples", grit: 15, img: imgMaize, accent: "#f5c518" },
  { id: "SKU_BAV_002", name: "Ritebrand Long Life Full Cream Milk 1L", short: "Ritebrand Milk 1L", price: 16.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", category: "Nutritional Staples", grit: 10, img: imgMilk, accent: "#1f4ea1" },
  { id: "SKU_BAV_004", name: "Albany Superior Sliced White Bread", short: "Albany Superior White Bread", price: 19.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", category: "Nutritional Staples", grit: 5, img: imgBread, accent: "#1a4a8a" },
  { id: "SKU_BAV_010", name: "Nulaid Large Eggs 18-Pack", short: "Nulaid Eggs 18pk", price: 49.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", category: "Nutritional Staples", grit: 12, img: "", emoji: "🥚", accent: "#d4a017" },
  { id: "SKU_BAV_011", name: "Tastic Parboiled Rice 2kg", short: "Tastic Rice 2kg", price: 37.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", category: "Nutritional Staples", grit: 10, img: "", emoji: "🍚", accent: "#9b6b2a" },

  { id: "SKU_BAV_003", name: "Stayfree Maxi Scented Pads Regular 10-Pack", short: "Stayfree Maxi Pads 10pk", price: 22.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", priority: true, category: "Girl Child Protocol", grit: 20, img: imgPads, accent: "#2aa57f" },
  { id: "SKU_BAV_005", name: "Lil-lets Essentials Pads Non-Wings 10-Pack", short: "Lil-lets Essentials 10pk", price: 17.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", priority: true, category: "Girl Child Protocol", grit: 20, img: "", emoji: "🌸", accent: "#b964d1" },
  { id: "SKU_BAV_006", name: "Kotex Refresh Liners Light Scented 20-Pack", short: "Kotex Refresh Liners 20pk", price: 19.99, bucket: "VAULT", flag: "WHITELIST", allocation_bucket: "70_LOCKED_VAULT", compliance_status: "WHITELIST_APPROVED", priority: true, category: "Girl Child Protocol", grit: 20, img: "", emoji: "💮", accent: "#a06bd6" },

  { id: "SKU_BAV_007", name: "Discretionary Soft Drink / Soda 2L", short: "Soft Drink Soda 2L", price: 14.99, bucket: "FLEX", flag: "LUXURY", allocation_bucket: "30_DYNAMIC_FLEX", compliance_status: "DISCRETIONARY_ALLOWED", category: "Discretionary", grit: -50, img: "", emoji: "🥤", accent: "#c2410c" },
  { id: "SKU_BAV_008", name: "Cadbury Dairy Milk Chocolate Slab 80g", short: "Cadbury Dairy Milk 80g", price: 24.99, bucket: "FLEX", flag: "LUXURY", allocation_bucket: "30_DYNAMIC_FLEX", compliance_status: "DISCRETIONARY_ALLOWED", category: "Discretionary", grit: -50, img: imgChoc, accent: "#6b3a8f" },
  { id: "SKU_BAV_009", name: "2GB Campus Mobile Data Bundle", short: "2GB Campus Data Bundle", price: 149.0, bucket: "FLEX", flag: "LUXURY", allocation_bucket: "30_DYNAMIC_FLEX", compliance_status: "DISCRETIONARY_ALLOWED", category: "Discretionary", grit: -50, img: "", emoji: "📶", accent: "#5a3aa8" },
];

const TOTAL_POOL = 1650;
const VAULT_INIT = 1155;
const FLEX_INIT = 495;
const SLA_MS = 150;
const TARGET_MS = 136;

const DID_YOU_KNOW = [
  "Did You Know? Maintaining a consistent nutritional basket for 3 consecutive months increases your Grit Score™ by 50 points, pre-qualifying you for Graduate Tech Loans at FNB.",
  "Did You Know? Your compiled Grit Score™ serves as a Verified Financial CV. Institutions use this data to waive deposit requirements for your first asset acquisition.",
  "Did You Know? Reaching a Grit Score™ of 750 permanently unlocks Free Sixty60 Delivery, funded via institutional loyalty rollovers.",
];

const WHATSAPP_INSIGHTS = [
  { from: "Shoprite Alert", body: "10kg Rice is on special. Optimizing your 70% Vault adds +10 Grit points today.", time: "08:14" },
  { from: "Shoprite Booster", body: "Hi Refilwe, Shoprite has a 'Booster Monday' special on Full Cream Milk. Buying this today optimizes your 70% Vault and adds +5 Grit points.", time: "08:42" },
];

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
    g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.09);
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
  whitelist: "WHITELIST" | "LUXURY" | "VALVE_LOCK" | "MERIT_SYNC";
  hash: string;
};
type PulseRow = {
  event: "POS_SKU_SCAN" | "VALVE_LOCK" | "MERIT_SYNC";
  sku: string;
  item_description: string;
  cost: number;
  allocation_bucket: string;
  compliance_status: string;
  flag: string;
  handshake_latency: string;
  sha256_hash: string;
};

function timeNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")} -2000`;
}
function shortHash() {
  return "Sa" + Array.from({ length: 14 }, () => Math.floor(Math.random() * 16).toString(16)).join("") + "...";
}
function sha256Token() {
  return "0x" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

/* ============ MAIN APP ============ */
export default function App() {
  const { beep, buzz } = useAudio();
  const [vault, setVault] = useState(VAULT_INIT);
  const [flex, setFlex] = useState(FLEX_INIT);
  const [grit, setGrit] = useState(740);
  const [receipt, setReceipt] = useState<ReceiptLine[]>([]);
  const [latency, setLatency] = useState(TARGET_MS);
  const [pulse, setPulse] = useState(false);
  const [beam, setBeam] = useState(false);
  const [violation, setViolation] = useState(false);
  const [decline, setDecline] = useState(false);
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
      setDecline(true);
      const lat = flashFX();
      setLedger((L) => [{
        ts: timeNow(), node: "BAV_ST_001", sku: sku.id, desc: sku.short,
        value: sku.price, whitelist: "VALVE_LOCK" as const, hash: `Compliance Hashing(${shortHash()}`,
      }, ...L].slice(0, 60));
      setTelemetry((T) => [{
        event: "VALVE_LOCK" as const, sku: sku.id, item_description: sku.name, cost: sku.price,
        allocation_bucket: sku.allocation_bucket, compliance_status: "ERR_70_30_RATIO_VIOLATION",
        flag: "VALVE_LOCK", handshake_latency: `${lat}ms`, sha256_hash: sha256Token(),
      }, ...T].slice(0, 14));
      setTimeout(() => setViolation(false), 2400);
      setTimeout(() => setDecline(false), 2800);
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
      event: "POS_SKU_SCAN" as const, sku: sku.id, item_description: sku.name, cost: sku.price,
      allocation_bucket: sku.allocation_bucket, compliance_status: sku.compliance_status,
      flag: sku.flag, handshake_latency: `${lat}ms`, sha256_hash: sha256Token(),
    }, ...T].slice(0, 14));
  }

  function finalize() {
    if (receipt.length === 0) return;
    const vaultSpend = receipt.filter((l) => l.sku.bucket === "VAULT").reduce((s, l) => s + l.sku.price * l.qty, 0);
    const flexSpend = receipt.filter((l) => l.sku.bucket === "FLEX").reduce((s, l) => s + l.sku.price * l.qty, 0);
    setVault((v) => Math.max(0, v - vaultSpend));
    setFlex((f) => Math.max(0, f - flexSpend));
    setGrit((g) => g + Math.min(20, receipt.reduce((s, l) => s + Math.max(0, l.sku.grit) * l.qty, 0)));
    beep();
    flashFX();
    setLedger((L) => [{
      ts: timeNow(), node: "BAV_ST_001", sku: "SETTLEMENT", desc: `PAID via BAV™ · ${receipt.length} items · R${(vaultSpend+flexSpend).toFixed(2)}`,
      value: vaultSpend + flexSpend, whitelist: "WHITELIST" as const, hash: `Compliance Hashing(${shortHash()}`,
    }, ...L].slice(0, 60));
    setReceipt([]);
    setPaid(true);
    setTimeout(() => setPaid(false), 4500);
  }

  function meritSync() {
    setGrit((g) => g + 100);
    const lat = flashFX();
    setLedger((L) => [{
      ts: timeNow(), node: "BAV_MR_002", sku: "MERIT_SYNC", desc: "Academic Telemetry Synchronized · PASS · +100 Grit",
      value: 0, whitelist: "MERIT_SYNC" as const, hash: `Compliance Hashing(${shortHash()}`,
    }, ...L].slice(0, 60));
    setTelemetry((T) => [{
      event: "MERIT_SYNC" as const, sku: "MERIT_SYNC", item_description: "Proof of Merit · Academic Transcript",
      cost: 0, allocation_bucket: "BEHAVIORAL_ACTUARIAL", compliance_status: "PASS_CONFIRMED",
      flag: "WHITELIST", handshake_latency: `${lat}ms`, sha256_hash: sha256Token(),
    }, ...T].slice(0, 14));
  }

  function resetAll() {
    setVault(VAULT_INIT); setFlex(FLEX_INIT); setReceipt([]); setGrit(740); setPaid(false);
  }

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
              decline={decline}
              onMeritSync={meritSync}
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

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 xl:col-span-7">
              <CashierInventoryGrid receipt={receipt} pulse={pulse} paid={paid} onScan={scan} />
            </div>
            <div className="col-span-12 xl:col-span-5">
              <LiveReceiptList receipt={receipt} total={total} onFinalize={finalize} onReset={resetAll} paid={paid} />
            </div>
          </div>

          <SecureRailLinkBar latency={TARGET_MS} pulse={pulse} />

          <TelemetryPulse rows={telemetry} />

          <CioAuditLedger rows={ledger} />

          <FinancialCvPanel grit={grit} vault={vault} flex={flex} ledger={ledger} />
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
  tab, setTab, vault, flex, grit, onScan, onFinalize, receipt, total, ledger, violation, decline, onMeritSync,
}: {
  tab: any; setTab: (t: any) => void;
  vault: number; flex: number; grit: number;
  onScan: (s: SKU) => void; onFinalize: () => void;
  receipt: ReceiptLine[]; total: number;
  ledger: LedgerRow[];
  violation: boolean;
  decline: boolean;
  onMeritSync: () => void;
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
            {tab === "Sixty60" && <Sixty60Tab onScan={onScan} grit={grit} />}
            {tab === "Merit" && <MeritTab grit={grit} onSync={onMeritSync} />}
            {tab === "Audit" && <AuditTab ledger={ledger} />}

            {decline && (
              <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
                <div className="bg-[#5a0008] border-2 border-shoprite-red rounded-xl p-4 text-center shadow-2xl">
                  <div className="text-3xl mb-2">🛑</div>
                  <div className="mono font-black text-shoprite-red text-xs uppercase tracking-widest mb-1">Governance Guard</div>
                  <div className="text-white text-[11px] font-black leading-snug">
                    Nutritional Core Protected.<br/>Transaction Declined.
                  </div>
                </div>
              </div>
            )}
          </div>

          {receiptCount > 0 && tab !== "Home" && (
            <button onClick={onFinalize}
              className="bg-sovereign-gold text-black font-black uppercase text-xs tracking-wider py-2 px-4 flex justify-between items-center hover:brightness-110">
              <span>Finalize / Pay · Edge Settlement · {receiptCount} item{receiptCount > 1 ? "s" : ""}</span>
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

/* ---------- Xtra Savings Card (flippable) ---------- */
function XtraSavingsCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="space-y-1.5">
      <button onClick={() => setFlipped(f => !f)}
        className="relative w-full aspect-[1.6/1] rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(91,33,182,0.45)] transition-transform hover:scale-[1.01]"
        style={{ perspective: "800px" }}>
        <div className="relative w-full h-full transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}>
          {/* FRONT */}
          <div className="absolute inset-0 p-3 flex flex-col justify-between text-white"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 45%, #2e1065 100%)",
            }}>
            <div className="flex justify-between items-start">
              <div className="bg-shoprite-red text-white text-[8px] font-black px-1.5 py-0.5 rounded mono">SHOPRITE</div>
              <div className="text-[7px] mono opacity-70">XSV · ZA</div>
            </div>
            <div className="flex items-end justify-between">
              <div className="leading-none text-left">
                <div className="text-[40px] font-black tracking-tighter" style={{ color: "#FFD200", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>X</div>
                <div className="text-[10px] font-black tracking-widest">TRA SAVINGS</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] mono opacity-70">4354 4757 4757 5757</div>
                <div className="text-[8px] mono opacity-90 font-black">R. MOKOENA</div>
              </div>
            </div>
          </div>
          {/* BACK */}
          <div className="absolute inset-0 p-3 flex flex-col justify-center text-white"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)",
            }}>
            <div className="text-[9px] font-black uppercase tracking-widest text-shoprite-yellow mb-1">Core Utility</div>
            <div className="text-[11px] leading-snug font-medium">
              Tracks behavioral nutritional metrics to protect statutory NSFAS capital while unlocking local grocery discounts.
            </div>
            <div className="text-[8px] mono opacity-70 mt-2">Tap to flip back</div>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 led shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
        <span className="text-[8px] mono font-black text-purple-800 leading-tight">
          Xtra Savings Card Active — Routing Identity Token via Secure BAV™ Valve
        </span>
      </div>
    </div>
  );
}

/* ---------- Did You Know carousel ---------- */
function DidYouKnowCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % DID_YOU_KNOW.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mx-3 mt-2 relative">
      <div className="rounded-xl border border-sovereign-gold/50 bg-white/70 backdrop-blur-md shadow-md p-2.5 overflow-hidden">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[8px] mono font-black text-sovereign-gold tracking-widest uppercase">◆ BAV™ Intelligence Layer</span>
          <span className="ml-auto flex gap-0.5">
            {DID_YOU_KNOW.map((_, k) => (
              <span key={k} className={`w-1.5 h-1.5 rounded-full ${k === i ? "bg-shoprite-red" : "bg-neutral-300"}`} />
            ))}
          </span>
        </div>
        <div className="text-[10px] leading-snug text-black font-medium min-h-[44px] transition-opacity">
          {DID_YOU_KNOW[i]}
        </div>
      </div>
    </div>
  );
}

/* ---------- WhatsApp Insights Hub ---------- */
function WhatsAppHub() {
  const [on, setOn] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#075E54] text-white">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center text-[12px] font-black">W</div>
          <div className="text-[11px] font-black">WhatsApp Insights Hub</div>
        </div>
        <button onClick={() => setOn(!on)}
          className={`relative w-9 h-5 rounded-full transition ${on ? "bg-[#25D366]" : "bg-neutral-400"}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${on ? "left-4" : "left-0.5"}`} />
        </button>
      </div>
      {on && (
        <div className="p-2 bg-[#ECE5DD] space-y-1.5">
          {WHATSAPP_INSIGHTS.map((m, i) => (
            <div key={i} className="bg-white rounded-lg rounded-tl-none p-2 shadow text-[10px] text-black max-w-[90%]">
              <div className="font-black text-[#075E54] text-[9px]">{m.from}</div>
              <div className="leading-snug">{m.body}</div>
              <div className="text-right text-[7px] text-neutral-500 mt-0.5">{m.time} ✓✓</div>
            </div>
          ))}
        </div>
      )}
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

      <div className="px-3 pt-3"><XtraSavingsCard /></div>
      <DidYouKnowCarousel />

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

        <WhatsAppHub />
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
      className={`bg-white border rounded-lg p-2 text-left hover:shadow-md transition relative overflow-hidden ${s.priority ? "border-purple-300 shadow-[0_0_12px_rgba(186,107,224,0.35)]" : "border-neutral-200"}`}>
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
      <div className="flex gap-1 mt-0.5 flex-wrap items-center">
        <span className={`text-[8px] font-black uppercase inline-block px-1 py-0.5 rounded ${s.flag === "WHITELIST" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"}`}>
          {s.flag === "WHITELIST" ? "🔒 VAULT" : "💳 FLEX"}
        </span>
        {s.priority && <span className="text-[8px] font-black uppercase inline-block px-1 py-0.5 rounded bg-purple-100 text-purple-800">★ DIGNITY</span>}
        <span className={`text-[8px] font-black inline-block px-1 py-0.5 rounded mono ${s.grit > 0 ? "bg-sovereign-gold/20 text-sovereign-gold" : "bg-red-100 text-red-700"}`}>
          {s.grit > 0 ? `+${s.grit}` : s.grit} Grit
        </span>
      </div>
    </button>
  );
}

/* ---------- Sixty60 Tab (categorized hyper-real grid) ---------- */
function Sixty60Tab({ onScan, grit }: { onScan: (s: SKU) => void; grit: number }) {
  const cats: Category[] = ["Nutritional Staples", "Girl Child Protocol", "Discretionary"];
  const catMeta: Record<Category, { tag: string; color: string }> = {
    "Nutritional Staples": { tag: "Locked Vault Eligible", color: "bg-emerald-500" },
    "Girl Child Protocol": { tag: "Super-Essential · Dignity", color: "bg-purple-500" },
    "Discretionary": { tag: "Flex Wallet Only", color: "bg-neutral-500" },
  };
  const freeDelivery = grit >= 750;
  const gritPct = Math.min(100, (grit / 750) * 100);
  return (
    <div className="bg-white min-h-full">
      <div className="bg-sixty60 text-white px-3 py-2.5 flex items-center gap-2">
        <div className="bg-white text-sixty60 font-black px-2 py-0.5 rounded text-sm tracking-tight">Sixty<span className="text-shoprite-yellow">60</span></div>
        <div className="text-[10px] font-black uppercase tracking-wide">Delivered in 60 minutes</div>
        <span className="ml-auto text-[9px] mono opacity-80">⌖ Cape Town</span>
      </div>

      {/* Dynamic Delivery Logistics Banner */}
      {freeDelivery ? (
        <div className="mx-2 mt-2 rounded-lg px-3 py-2 border-2 border-emerald-400 bg-gradient-to-r from-emerald-500/90 to-emerald-400 text-black shadow-[0_0_18px_rgba(52,211,153,0.7)]">
          <div className="text-[10px] font-black uppercase tracking-wider">⚡ BAV™ Reward Unlocked</div>
          <div className="text-[11px] font-black">FREE SIXTY60 DELIVERY ACTIVE</div>
        </div>
      ) : (
        <div className="mx-2 mt-2 rounded-lg px-3 py-2 border border-sixty60/30 bg-sixty60/5">
          <div className="flex justify-between text-[10px] font-black text-sixty60">
            <span>Sixty60 Delivery Fee: R35.00</span>
            <span className="mono">{grit} / 750</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-200 mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sixty60 to-shoprite-red transition-all" style={{ width: `${gritPct}%` }} />
          </div>
          <div className="text-[9px] text-neutral-600 mt-1">Grit Score under 750 — Earn points to unlock FREE Delivery</div>
        </div>
      )}

      <div className="p-2 space-y-3">
        {cats.map((cat) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className={`w-1.5 h-4 rounded ${catMeta[cat].color}`} />
              <span className="text-[10px] font-black uppercase tracking-wide text-black">{cat}</span>
              <span className="text-[8px] mono text-neutral-500">· {catMeta[cat].tag}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INVENTORY.filter(s => s.category === cat).map(s => (
                <button key={s.id} onClick={() => onScan(s)}
                  className={`bg-white text-black rounded-lg p-2 text-left border hover:shadow-md transition relative ${s.priority ? "border-purple-300 shadow-[0_0_10px_rgba(186,107,224,0.35)]" : "border-neutral-200"}`}>
                  <div className="absolute top-1 right-1 bg-sovereign-gold text-black text-[7px] font-black mono px-1 py-0.5 rounded">
                    {s.grit > 0 ? `+${s.grit}` : s.grit} Grit
                  </div>
                  <div className="aspect-square rounded mb-1 bg-white overflow-hidden flex items-center justify-center">
                    {s.img ? <img src={s.img} alt={s.short} className="w-full h-full object-contain p-1" loading="lazy" /> : <div className="text-3xl">{s.emoji}</div>}
                  </div>
                  <div className="text-[10px] font-black leading-tight line-clamp-2 min-h-[26px]">{s.short}</div>
                  <div className="bg-shoprite-red text-white inline-block px-1.5 py-0.5 rounded mt-1 text-[11px] font-black">
                    R{s.price.toFixed(2)}
                  </div>
                  {s.priority && <div className="mt-1 text-[7px] font-black uppercase text-purple-700">★ Dignity Protocol</div>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Merit Tab (upload portal) ---------- */
function MeritTab({ grit, onSync }: { grit: number; onSync: () => void }) {
  const [stage, setStage] = useState<"idle" | "scanning" | "done">("idle");
  const [filename, setFilename] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | undefined) {
    if (!f) return;
    setFilename(f.name);
    setStage("scanning");
    setTimeout(() => {
      setStage("done");
      onSync();
      setTimeout(() => setStage("idle"), 4000);
    }, 2500);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="obsidian gold-border rounded-2xl p-4 text-center">
        <div className="text-[9px] mono uppercase text-sovereign-goldlite">Merit Standing</div>
        <div className="text-4xl gold-text font-black mt-1">{grit}</div>
        <div className="text-[10px] mono text-white/60">AAA-SOVEREIGN BAND</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm">
        <div className="text-[11px] font-black text-black uppercase tracking-wide">
          Synchronize Academic Performance Telemetry
        </div>
        <div className="text-[9px] text-neutral-500 mt-0.5">Behavioral Actuarial Performance Telemetry · BAV™ Secure Rail</div>

        <div
          onClick={() => stage === "idle" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          className={`mt-3 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition ${
            stage === "scanning" ? "border-sovereign-gold bg-sovereign-gold/10" :
            stage === "done" ? "border-emerald-500 bg-emerald-50" :
            "border-neutral-300 hover:border-shoprite-red bg-neutral-50"
          }`}
        >
          <input ref={inputRef} type="file" className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={(e) => handleFile(e.target.files?.[0] || undefined)} />

          {stage === "idle" && (
            <>
              <div className="text-3xl mb-1">📄⤴</div>
              <div className="text-[11px] font-black text-black">Upload Official Academic Transcript / Proof of Merit</div>
              <div className="text-[9px] text-neutral-500 mt-1">Drag &amp; drop · or tap to browse · PDF / PNG / JPG</div>
            </>
          )}

          {stage === "scanning" && (
            <>
              <div className="mx-auto w-10 h-10 border-4 border-sovereign-gold border-t-transparent rounded-full animate-spin mb-2" />
              <div className="text-[11px] font-black text-black">Scanning Academic Metadata via Secure BAV™ Rail...</div>
              <div className="text-[9px] mono text-neutral-600 mt-1 truncate">{filename}</div>
            </>
          )}

          {stage === "done" && (
            <>
              <div className="text-4xl text-emerald-500 mb-1">✓</div>
              <div className="text-[11px] font-black text-emerald-700 uppercase">Telemetry Synchronized: Pass Result Confirmed</div>
              <div className="text-[10px] mono text-emerald-700 mt-1">Grit Score +100 · Ledger Row Logged</div>
            </>
          )}
        </div>
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
  const flagColor = (f: LedgerRow["whitelist"]) =>
    f === "VALVE_LOCK" ? "text-shoprite-red" :
    f === "LUXURY" ? "text-amber-300" :
    f === "MERIT_SYNC" ? "text-sky-300" : "text-emerald-400";
  return (
    <div className="bg-[#0b0c10] text-white min-h-full p-3 mono">
      <div className="text-[10px] uppercase tracking-widest mb-2 gold-text font-black">Spending Compliance Ledger</div>
      <div className="text-[9px] opacity-50 mb-2">Read-only · Verified by BAV™ Secure Link</div>
      <div className="space-y-1">
        {ledger.slice(0, 14).map((r, i) => (
          <div key={i} className="border-b border-white/10 py-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="opacity-70">{r.ts.slice(11, 19)}</span>
              <span className={`${flagColor(r.whitelist)} font-black`}>{r.whitelist}</span>
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

/* ============ CASHIER INVENTORY GRID — clickable ============ */
function CashierInventoryGrid({ receipt, pulse, paid, onScan }: {
  receipt: ReceiptLine[]; pulse: boolean; paid: boolean; onScan: (s: SKU) => void;
}) {
  return (
    <div className="bg-[#1b1d22] rounded-lg border border-sovereign-gold/40 overflow-hidden shadow-2xl h-full relative">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30 flex justify-between">
        <div className="mono text-[10px] text-sovereign-goldlite font-black tracking-widest">▾ ACTIVE INVENTORY SELECTION GRID</div>
        <div className="mono text-[9px] text-white/50">TILL #042 · TAP TO SCAN</div>
      </div>
      <div className="p-2 grid grid-cols-3 gap-1.5">
        {INVENTORY.map((s) => {
          const qty = receipt.find(l => l.sku.id === s.id)?.qty || 0;
          return (
            <button key={s.id} onClick={() => onScan(s)}
              className={`relative bg-white rounded-md p-1.5 text-left hover:ring-2 hover:ring-sovereign-gold transition border-l-4 ${qty > 0 && pulse ? "ring-2 ring-sovereign-gold" : ""} ${s.priority ? "shadow-[0_0_8px_rgba(186,107,224,0.5)]" : ""}`}
              style={{ borderLeftColor: s.accent }}>
              {qty > 0 && (
                <div className="absolute -top-1 -right-1 bg-sovereign-gold text-black text-[8px] font-black mono px-1 rounded">×{qty}</div>
              )}
              <div className="aspect-square bg-white rounded overflow-hidden flex items-center justify-center mb-1">
                {s.img ? <img src={s.img} alt={s.short} className="w-full h-full object-contain" loading="lazy" /> : <div className="text-2xl">{s.emoji}</div>}
              </div>
              <div className="text-[9px] font-black text-black leading-tight line-clamp-2 min-h-[22px]">{s.short}</div>
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-shoprite-red text-[10px] font-black">R{s.price.toFixed(2)}</span>
                <span className={`text-[7px] font-black mono px-1 py-0.5 rounded ${s.bucket === "VAULT" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"}`}>
                  {s.bucket}
                </span>
              </div>
            </button>
          );
        })}
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
        <div className="bg-[#f7f3e8] text-black p-2.5 mono text-[9px] leading-tight shadow-inner h-full relative overflow-hidden">
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
            <div key={i} className={`text-[8px] mb-1 ${l.sku.priority ? "bg-purple-100 rounded px-1" : ""}`}>
              <div className="grid grid-cols-12">
                <div className="col-span-7 truncate">
                  {l.sku.short} <span className={`text-[7px] font-black ${l.sku.bucket === "VAULT" ? "text-emerald-700" : "text-neutral-600"}`}>[{l.sku.bucket}]</span>
                </div>
                <div className="col-span-2 text-center">{l.qty}</div>
                <div className="col-span-3 text-right">R{(l.sku.price * l.qty).toFixed(2)}</div>
              </div>
              <div className="text-[7px] opacity-70 flex justify-between">
                <span>{l.sku.id} [{l.sku.allocation_bucket}]</span>
                {l.sku.priority && <span className="text-purple-700 font-black">+{l.sku.grit} Grit · DIGNITY</span>}
              </div>
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
            <>
              <div className="mt-2 text-center text-emerald-700 font-black border-2 border-emerald-700 rounded py-1">
                ✓ PAID via BAV™
              </div>
              {/* Diagonal green ink stamp watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rotate-[-22deg] border-[3px] border-emerald-700 text-emerald-700 font-black mono px-3 py-1 rounded text-sm opacity-80 bg-white/40 tracking-wider">
                  PAID via BAV™ SECURE LINK
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 p-2 pt-0">
        <button onClick={onFinalize} disabled={!receipt.length}
          className="bg-sovereign-gold disabled:bg-neutral-700 disabled:text-white/40 text-black font-black py-1.5 rounded uppercase tracking-wider text-[10px] hover:brightness-110">
          Finalize / Pay
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

      <div className="relative h-7 rounded bg-black/70 border border-white/10 overflow-hidden shadow-inner">
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "repeat(20, 1fr)" }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border-r border-white/5" />
          ))}
        </div>
        <div className="absolute top-0 bottom-0 w-[2px] bg-shoprite-red z-20 shadow-[0_0_8px_rgba(227,6,19,0.8)]" style={{ left: `${slaPct}%` }} />
        <div
          className="absolute top-0 bottom-0 left-0 transition-all duration-200 ease-out z-10"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #10b981 0%, #34d399 60%, #6ee7b7 100%)",
            boxShadow: pulse ? "0 0 24px rgba(52,211,153,0.95) inset, 0 0 14px rgba(52,211,153,0.6)" : "0 0 10px rgba(52,211,153,0.45) inset",
          }}
        />
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
        136ms / SLA &lt; 150ms REQUIREMENT PASSED (ISO 8583 PROTOCOL)
      </div>
    </div>
  );
}

/* ============ FINANCIAL CV PANEL ============ */
function FinancialCvPanel({ grit, vault, flex, ledger }: { grit: number; vault: number; flex: number; ledger: LedgerRow[] }) {
  const [open, setOpen] = useState(false);
  const vaultAdherence = ((vault / VAULT_INIT) * 100).toFixed(1);
  const issued = new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";

  function downloadHtml() {
    const html = document.getElementById("bav-cv-doc")?.outerHTML || "";
    const blob = new Blob([
      `<!doctype html><html><head><meta charset="utf-8"><title>BAV CV - Refilwe Mokoena</title>
       <style>body{font-family:Georgia,serif;background:#f3efe6;padding:32px;color:#111}
       .doc{max-width:780px;margin:auto;background:#fffaf0;border:1px solid #c5a059;padding:32px;box-shadow:0 6px 24px rgba(0,0,0,0.15)}
       h1{color:#8c6f33;letter-spacing:1px;margin:0} h2{color:#8c6f33;border-bottom:1px solid #c5a059;padding-bottom:4px;margin-top:24px}
       table{width:100%;border-collapse:collapse;margin-top:8px} td{padding:6px 4px;border-bottom:1px dotted #c5a059;font-size:13px}
       .badge{display:inline-block;padding:4px 10px;border-radius:4px;background:#065f46;color:#fff;font-weight:900;font-size:12px;letter-spacing:1px}</style>
       </head><body>${html}</body></html>`,
    ], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "BAV_Behavioral_Financial_CV_RMokoena.html"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="obsidian gold-border rounded-lg p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <div className="mono text-[10px] tracking-widest gold-text font-black">BANKABLE OUTPUT MODULE</div>
          <div className="text-[11px] text-white/70 mt-0.5">Compile and export the verified Behavioral Actuarial Asset Dossier as a bankable PDF proof.</div>
        </div>
        <button onClick={() => setOpen(true)}
          className="bg-gradient-to-b from-sovereign-goldlite via-sovereign-gold to-[#8c6f33] text-black font-black py-2.5 px-4 rounded-md uppercase tracking-wider text-[11px] shadow-[0_4px_14px_rgba(197,160,89,0.55)] hover:brightness-110 whitespace-nowrap">
          📄 Download Behavioral Financial CV (PDF Proof)
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#fffaf0] text-black rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-sovereign-gold">
            <div className="bg-black px-4 py-2 flex justify-between items-center sticky top-0 z-10">
              <div className="gold-text font-black mono text-[11px] tracking-widest">BAV™ CV PREVIEW · BANKABLE PROOF</div>
              <div className="flex gap-2">
                <button onClick={downloadHtml} className="bg-sovereign-gold text-black font-black text-[10px] uppercase px-3 py-1 rounded">⤓ Download</button>
                <button onClick={() => setOpen(false)} className="bg-shoprite-red text-white font-black text-[10px] uppercase px-3 py-1 rounded">Close</button>
              </div>
            </div>
            <div id="bav-cv-doc" className="doc p-8" style={{ fontFamily: "Georgia, serif" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #c5a059", paddingBottom: 12, marginBottom: 16 }}>
                <h1 style={{ fontSize: 22, color: "#8c6f33", margin: 0, letterSpacing: 1 }}>BAV™ Behavioral Actuarial Asset Dossier</h1>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
                  Issued: {issued} · Authority: Sovereign Fiduciary Engine
                </div>
              </div>

              <h2 style={{ color: "#8c6f33", fontSize: 14, borderBottom: "1px solid #c5a059", paddingBottom: 4, marginTop: 0 }}>Subject Profile</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Full Name</b></td><td style={{ padding: 6, fontSize: 13 }}>Refilwe Mokoena</td></tr>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Verified NSFAS Edge Node ID</b></td><td style={{ padding: 6, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>BAV_ST_001</td></tr>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Cohort</b></td><td style={{ padding: 6, fontSize: 13 }}>Tier-1 University · NSFAS Statutory Beneficiary</td></tr>
                </tbody>
              </table>

              <h2 style={{ color: "#8c6f33", fontSize: 14, borderBottom: "1px solid #c5a059", paddingBottom: 4, marginTop: 20 }}>Live Behavioral Metrics</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Current Grit Score™ Rating</b></td><td style={{ padding: 6, fontSize: 13 }}>{grit} / 1000 · AAA-Sovereign Band</td></tr>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Vault Adherence Index</b></td><td style={{ padding: 6, fontSize: 13 }}>{vaultAdherence}% · Nutritional Core Preserved</td></tr>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Flex Restraint Reserve</b></td><td style={{ padding: 6, fontSize: 13 }}>R{flex.toFixed(2)} of R{FLEX_INIT.toFixed(2)} retained</td></tr>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Zero Velocity Flag Compliance</b></td><td style={{ padding: 6, fontSize: 13 }}>PASS · No high-velocity discretionary bursts detected</td></tr>
                  <tr><td style={{ padding: 6, fontSize: 13 }}><b>Verified Ledger Rows</b></td><td style={{ padding: 6, fontSize: 13 }}>{ledger.length} compliance-hashed transactions</td></tr>
                </tbody>
              </table>

              <h2 style={{ color: "#8c6f33", fontSize: 14, borderBottom: "1px solid #c5a059", paddingBottom: 4, marginTop: 20 }}>Bankable Verification</h2>
              <div style={{ background: "#065f46", color: "#fff", padding: 14, borderRadius: 6, textAlign: "center", marginTop: 8 }}>
                <div style={{ fontWeight: 900, letterSpacing: 1, fontSize: 13 }}>
                  FNB / Sanlam Collateral Waiver Pre-Qualification Status: APPROVED
                </div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>
                  Deposit requirements waived for first asset acquisition pursuant to BAV™ Behavioral Underwriting.
                </div>
              </div>

              <div style={{ borderTop: "1px dashed #c5a059", marginTop: 22, paddingTop: 10, fontSize: 10, color: "#666", textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                SHA-256 Notarized · ISO 8583 Settlement Compliant · Principal Architect: Refilwe David Ledwaba
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============ CIO AUDIT LEDGER ============ */
function CioAuditLedger({ rows }: { rows: LedgerRow[] }) {
  const flagColor = (f: LedgerRow["whitelist"]) =>
    f === "VALVE_LOCK" ? "text-shoprite-red" :
    f === "LUXURY" ? "text-amber-300" :
    f === "MERIT_SYNC" ? "text-sky-300" : "text-emerald-400";
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
                <td className={`px-2 py-1.5 font-black ${flagColor(r.whitelist)}`}>
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

/* ============ TELEMETRY PULSE — deeply indented JSON ============ */
function TelemetryPulse({ rows }: { rows: PulseRow[] }) {
  return (
    <div className="obsidian gold-border rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-black/40 border-b border-sovereign-gold/30 flex justify-between items-center">
        <div className="mono text-[10px] tracking-widest text-sovereign-goldlite font-black">LIVE TELEMETRY PULSE (SHA-256 JSON)</div>
        <div className="mono text-[9px] text-emerald-400">● STREAMING</div>
      </div>
      <div className="p-2 bg-black max-h-[260px] overflow-y-auto scrollbar-thin space-y-2">
        {rows.length === 0 && <div className="mono text-[10px] text-emerald-700 italic">// awaiting POS_SKU_SCAN events …</div>}
        {rows.map((r, i) => {
          const payload = {
            event: r.event,
            sku: r.sku,
            item_description: r.item_description,
            cost: Number(r.cost.toFixed(2)),
            fiduciary_valve: {
              allocation_bucket: r.allocation_bucket,
              compliance_status: r.compliance_status,
              flag: r.flag,
              vault_destination: r.allocation_bucket === "70_LOCKED_VAULT",
            },
            handshake_latency: r.handshake_latency,
            sha256_hash: r.sha256_hash,
          };
          const color =
            r.flag === "VALVE_LOCK" ? "text-shoprite-red" :
            r.flag === "LUXURY" ? "text-amber-300" : "text-emerald-400";
          return (
            <pre key={i} className={`mono text-[10px] ${color} leading-snug whitespace-pre drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]`}>
{JSON.stringify(payload, null, 2)}
            </pre>
          );
        })}
      </div>
    </div>
  );
}
