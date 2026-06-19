import { useState, useRef, useCallback } from "react";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const INSPECTION_CATEGORIES = [
  { key: "mesin", label: "Mesin & Performa", icon: "⚙️", items: ["Oli mesin & kebocoran", "Radiator & sistem pendingin", "Aki & sistem starter", "Suara mesin (idle)", "Transmisi & perpindahan gigi", "Sistem bahan bakar"] },
  { key: "kakikaki", label: "Kaki-kaki & Suspensi", icon: "🔧", items: ["Ban depan & belakang", "Shockbreaker", "Rem depan & belakang", "Velg (baret/penyok)", "Kaki-kaki bunyi", "Spooring & balancing"] },
  { key: "interior", label: "Interior & Kabin", icon: "🪑", items: ["Jok & material", "AC & sirkulasi udara", "Audio & head unit", "Dashboard & panel", "Power window & central lock", "Bau kabin"] },
  { key: "eksterior", label: "Eksterior & Body", icon: "🚘", items: ["Cat bodi (orisinil/repaint)", "Lecet/baret halus", "Lampu depan & belakang", "Kaca & wiper", "Bumper depan/belakang", "Karat & rangka"] },
];

function defaultInspection() {
  let out = {};
  INSPECTION_CATEGORIES.forEach(cat => { out[cat.key] = cat.items.map(name => ({ name, status: "OK", note: "" })); });
  return out;
}

const initCars = [
  { id: "c1", brand: "Toyota", model: "Fortuner GR Sport", type: "SUV", priceBeli: 540000000, price: 620000000, year: 2024, km: 8200, status: "Ready", showInHero: true, color: "Hitam Metalik", transmission: "Otomatis", fuel: "Diesel", noRangka: "MHFXX1234K567890", noMesin: "2GD-FTV-88321", images: ["https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&q=75"], desc: "Dominasi setiap medan.", inspection: defaultInspection() },
  { id: "c2", brand: "Honda", model: "CR-V Sensing", type: "SUV", priceBeli: 470000000, price: 545000000, year: 2024, km: 5100, status: "Ready", showInHero: true, color: "Putih Platinum", transmission: "Otomatis", fuel: "Bensin", noRangka: "MHRXX5678K112233", noMesin: "K20C-44910", images: ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=75"], desc: "Honda Sensing terdepan.", inspection: defaultInspection() },
  { id: "c3", brand: "Mitsubishi", model: "Pajero Sport Dakar", type: "SUV", priceBeli: 610000000, price: 710000000, year: 2023, km: 8500, status: "Ready", showInHero: true, color: "Silver Chrome", transmission: "Otomatis", fuel: "Diesel", noRangka: "MMCXX9988K445566", noMesin: "4N15-77654", images: ["https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&q=75"], desc: "Legenda off-road.", inspection: defaultInspection() },
  { id: "c4", brand: "Mazda", model: "CX-5 Elite", type: "SUV", priceBeli: 420000000, price: 490000000, year: 2024, km: 3200, status: "Booking", showInHero: false, color: "Soul Red Crystal", transmission: "Otomatis", fuel: "Bensin", noRangka: "JMZXX3344K778899", noMesin: "PY-VPS-22156", images: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=75"], desc: "Desain Kodo.", inspection: defaultInspection() },
  { id: "c5", brand: "Suzuki", model: "Ertiga Hybrid", type: "MPV", priceBeli: 225000000, price: 265000000, year: 2024, km: 4400, status: "Ready", showInHero: false, color: "Putih Pearl", transmission: "Otomatis", fuel: "Hybrid", noRangka: "MHKXX2211K990011", noMesin: "K15B-30982", images: ["https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&q=75"], desc: "Mild hybrid efisien.", inspection: defaultInspection() },
  { id: "c6", brand: "Toyota", model: "Alphard Executive", type: "MPV", priceBeli: 1080000000, price: 1250000000, year: 2023, km: 12000, status: "Terjual", showInHero: false, color: "Pearl White", transmission: "Otomatis", fuel: "Hybrid", noRangka: "MHFXX7766K223344", noMesin: "2AR-FXE-19887", images: ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=75"], desc: "Kemewahan tanpa kompromi.", inspection: defaultInspection() },
];

const STAGES = ["Pesanan Baru", "Verifikasi Data", "Proses Leasing/Pelunasan", "Penyiapan Towing", "Mobil Terkirim"];
const STAGE_SHORT = { "Pesanan Baru": "Baru", "Verifikasi Data": "Verifikasi", "Proses Leasing/Pelunasan": "Leasing/Lunas", "Penyiapan Towing": "Towing", "Mobil Terkirim": "Terkirim" };

const initOrders = [
  { id: "o1", name: "Budi Santoso", phone: "081234567890", unit: "Toyota Fortuner GR Sport", carId: "c1", stage: "Pesanan Baru", time: "2 jam lalu", metode: "Ajukan Kredit", alamat: "Jl. Melati No. 12, Bekasi" },
  { id: "o2", name: "Siti Rahayu", phone: "085678901234", unit: "Honda CR-V Sensing", carId: "c2", stage: "Verifikasi Data", time: "1 hari lalu", metode: "Cash", alamat: "Jl. Kenanga No. 5, Depok" },
  { id: "o3", name: "Ahmad Fauzi", phone: "087890123456", unit: "Mazda CX-5 Elite", carId: "c4", stage: "Proses Leasing/Pelunasan", time: "2 hari lalu", metode: "Ajukan Kredit", alamat: "Jl. Anggrek No. 8, Tangerang" },
  { id: "o4", name: "Dewi Lestari", phone: "082345678901", unit: "Toyota Alphard Executive", carId: "c6", stage: "Mobil Terkirim", time: "5 hari lalu", metode: "Cash", alamat: "Jl. Mawar No. 3, Jakarta Selatan" },
  { id: "o5", name: "Riko Pratama", phone: "083456789012", unit: "Suzuki Ertiga Hybrid", carId: "c5", stage: "Pesanan Baru", time: "5 jam lalu", metode: "Cash", alamat: "Jl. Dahlia No. 21, Bogor" },
];

const initTx = [
  { id: "t1", carId: "c6", type: "Pelunasan", amount: 1250000000, date: "2026-06-15", notes: "Toyota Alphard - Lunas", category: "Pemasukan" },
  { id: "t2", carId: "c4", type: "DP", amount: 98000000, date: "2026-06-17", notes: "Mazda CX-5 - DP 20%", category: "Pemasukan" },
  { id: "t3", carId: null, type: "Operasional", amount: 12000000, date: "2026-06-10", notes: "Biaya listrik & sewa", category: "Pengeluaran" },
  { id: "t4", carId: null, type: "Operasional", amount: 4500000, date: "2026-06-12", notes: "Biaya towing & pengiriman", category: "Pengeluaran" },
];

const STATUS_OPTS = ["Ready", "Booking", "Terjual"];
const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtShort = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(2)} M` : `${(n / 1e6).toFixed(0)} Jt`;

const T = { bg: "#0f1117", card: "#171b24", border: "#252b38", text: "#e2e8f0", muted: "#64748b", accent: "#3B82F6", gold: "#C9A84C", green: "#10b981", red: "#ef4444", amber: "#f59e0b" };
const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10 };

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "inventaris", icon: "🚗", label: "Inventaris" },
  { key: "crm", icon: "🎯", label: "Sales CRM" },
  { key: "finance", icon: "💰", label: "Finance" },
];

function Sidebar({ active, setActive }) {
  return (
    <aside style={{ width: 220, background: "#0d1118", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", minHeight: "100vh", position: "fixed", top: 0, left: 0, zIndex: 100 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: T.gold, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0a0a0a", fontSize: 14 }}>Z</div>
          <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em" }}>ZAHRA MOBIL</div><div style={{ color: T.muted, fontSize: 10, letterSpacing: "0.08em" }}>ADMIN PANEL</div></div>
        </div>
      </div>
      <nav style={{ padding: "16px 10px", flex: 1 }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setActive(n.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 7, border: "none", cursor: "pointer", marginBottom: 4, background: active === n.key ? `${T.accent}22` : "transparent", color: active === n.key ? T.accent : T.muted, fontWeight: active === n.key ? 700 : 500, fontSize: 13, textAlign: "left" }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span> {n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#1e293b", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
          <div><div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>Admin</div><div style={{ color: T.muted, fontSize: 11 }}>Super Admin</div></div>
        </div>
      </div>
    </aside>
  );
}

function Header({ title }) {
  const now = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <header style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1 style={{ color: T.text, margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ color: T.muted, fontSize: 12 }}>{now}</span>
        <div style={{ width: 8, height: 8, background: T.green, borderRadius: "50%", boxShadow: `0 0 8px ${T.green}` }} />
        <span style={{ color: T.muted, fontSize: 12 }}>Live</span>
      </div>
    </header>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ ...card, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
          <div style={{ color: T.text, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</div>
          {sub && <div style={{ color: color || T.muted, fontSize: 12 }}>{sub}</div>}
        </div>
        <div style={{ width: 42, height: 42, background: `${color || T.accent}22`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function DashboardView({ cars, orders, transactions }) {
  const totalStok = cars.filter(c => c.status === "Ready").length;
  const totalBooking = cars.filter(c => c.status === "Booking").length;
  const totalTerjual = cars.filter(c => c.status === "Terjual").length;
  const totalOmset = transactions.filter(t => t.category === "Pemasukan").reduce((s, t) => s + t.amount, 0);
  const totalKeluar = transactions.filter(t => t.category === "Pengeluaran").reduce((s, t) => s + t.amount, 0);
  const totalProfit = cars.filter(c => c.status === "Terjual").reduce((s, c) => s + (c.price - c.priceBeli), 0);
  const orderBaru = orders.filter(o => o.stage === "Pesanan Baru").length;

  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
  const omsetData = [820, 1150, 690, 1420, 1680, totalOmset / 1e6];
  const maxVal = Math.max(...omsetData);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon="🚗" label="Unit Ready" value={totalStok} sub="Siap jual" color={T.green} />
        <StatCard icon="📋" label="Unit Booking" value={totalBooking} sub="Dalam proses" color={T.amber} />
        <StatCard icon="✅" label="Terjual" value={totalTerjual} sub="Total" color={T.accent} />
        <StatCard icon="🔔" label="Pesanan Baru" value={orderBaru} sub="Perlu ditindak" color="#a855f7" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ ...card, padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Omset Bulanan</div>
              <div style={{ color: T.text, fontSize: 22, fontWeight: 800 }}>{fmt(totalOmset)}</div>
              <div style={{ color: T.green, fontSize: 12, marginTop: 2 }}>↑ 18.4% vs bulan lalu</div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div><div style={{ color: T.muted, fontSize: 11, marginBottom: 2 }}>Pemasukan</div><div style={{ color: T.green, fontWeight: 700 }}>{fmtShort(totalOmset)}</div></div>
              <div><div style={{ color: T.muted, fontSize: 11, marginBottom: 2 }}>Profit Unit</div><div style={{ color: T.gold, fontWeight: 700 }}>{fmtShort(totalProfit)}</div></div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
            {omsetData.map((val, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", background: i === omsetData.length - 1 ? T.accent : `${T.accent}44`, borderRadius: "4px 4px 0 0", height: `${(val / maxVal) * 100}%`, minHeight: 4 }} />
                <span style={{ color: T.muted, fontSize: 10 }}>{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: "24px 28px" }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Komposisi Stok</div>
          {[{ label: "Ready", count: totalStok, color: T.green }, { label: "Booking", count: totalBooking, color: T.amber }, { label: "Terjual", count: totalTerjual, color: T.accent }].map(item => (
            <div key={item.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: T.text, fontSize: 13 }}>{item.label}</span><span style={{ color: item.color, fontSize: 13, fontWeight: 700 }}>{item.count} unit</span></div>
              <div style={{ background: "#1e293b", borderRadius: 99, height: 6 }}><div style={{ width: `${(item.count / cars.length) * 100}%`, background: item.color, borderRadius: 99, height: "100%" }} /></div>
            </div>
          ))}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>Total Nilai Stok Ready</div>
            <div style={{ color: T.gold, fontSize: 18, fontWeight: 800 }}>{fmt(cars.filter(c => c.status === "Ready").reduce((s, c) => s + c.price, 0))}</div>
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: "24px 28px" }}>
        <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Pesanan Terbaru</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Nama", "No. HP", "Unit", "Metode", "Stage", "Waktu"].map(h => (
            <th key={h} style={{ textAlign: "left", color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {orders.slice(0, 5).map(o => (
              <tr key={o.id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                {[o.name, o.phone, o.unit, <span style={{ color: T.accent, fontSize: 11 }}>{o.metode}</span>, <span style={{ background: `${T.amber}22`, color: T.amber, padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{STAGE_SHORT[o.stage]}</span>, <span style={{ color: T.muted }}>{o.time}</span>].map((val, j) => (
                  <td key={j} style={{ padding: "12px 0", paddingRight: 16, color: T.text, fontSize: 13 }}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── INSPECTION FORM (admin checklist) ───────────────────────────────────────
function InspectionForm({ inspection, setInspection }) {
  const [openCat, setOpenCat] = useState("mesin");
  const statusColor = { OK: T.green, Minor: T.amber, "Perlu Perhatian": T.red };

  const updateItem = (catKey, idx, field, value) => {
    setInspection(prev => ({ ...prev, [catKey]: prev[catKey].map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {INSPECTION_CATEGORIES.map(cat => {
          const okCount = inspection[cat.key].filter(i => i.status === "OK").length;
          return (
            <button key={cat.key} onClick={() => setOpenCat(cat.key)} type="button" style={{ padding: "8px 14px", borderRadius: 7, border: `1.5px solid ${openCat === cat.key ? T.accent : T.border}`, background: openCat === cat.key ? `${T.accent}22` : "transparent", color: openCat === cat.key ? T.accent : T.muted, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              {cat.icon} {cat.label} ({okCount}/{cat.items.length})
            </button>
          );
        })}
      </div>
      <div style={{ background: "#0f1117", border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflow: "auto" }}>
        {inspection[openCat].map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#171b24", borderRadius: 6 }}>
            <span style={{ color: T.text, fontSize: 12.5, flex: 1 }}>{item.name}</span>
            <select value={item.status} onChange={e => updateItem(openCat, idx, "status", e.target.value)} style={{ background: `${statusColor[item.status]}22`, color: statusColor[item.status], border: "none", borderRadius: 5, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {["OK", "Minor", "Perlu Perhatian"].map(s => <option key={s} value={s} style={{ background: T.card, color: T.text }}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INVENTARIS ──────────────────────────────────────────────────────────────
function InventarisView({ cars, setCars }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const blank = { brand: "", model: "", type: "SUV", priceBeli: "", price: "", year: new Date().getFullYear(), km: 0, status: "Ready", showInHero: false, color: "", transmission: "Otomatis", fuel: "Bensin", noRangka: "", noMesin: "", desc: "", images: [], inspection: defaultInspection() };
  const [form, setForm] = useState(blank);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const reset = () => { setForm(blank); setEditId(null); };
  const handleEdit = (car) => { setForm({ ...car }); setEditId(car.id); setShowForm(true); };

  const handleSave = () => {
    if (!form.brand || !form.model || !form.price) return alert("Brand, Model, dan Harga Jual wajib diisi.");
    if (editId) {
      setCars(prev => prev.map(c => c.id === editId ? { ...c, ...form, price: Number(form.price), priceBeli: Number(form.priceBeli || 0) } : c));
    } else {
      setCars(prev => [...prev, { ...form, id: `c${Date.now()}`, price: Number(form.price), priceBeli: Number(form.priceBeli || 0), images: form.images.length ? form.images : ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=75"] }]);
    }
    reset(); setShowForm(false);
  };

  const handleDelete = (id) => { if (window.confirm("Hapus unit ini?")) setCars(prev => prev.filter(c => c.id !== id)); };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    files.forEach(file => { const url = URL.createObjectURL(file); setForm(f => ({ ...f, images: [...f.images, url] })); });
  }, []);

  const inp = { background: "#1e293b", border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", color: T.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ color: T.muted, fontSize: 13 }}>{cars.length} unit terdaftar</div>
        <button onClick={() => { reset(); setShowForm(true); }} style={{ padding: "9px 20px", background: T.accent, color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Tambah Unit</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, width: "92%", maxWidth: 760, maxHeight: "92vh", overflow: "auto", padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ color: T.text, margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? "Edit Unit" : "Tambah Unit Baru"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {/* Image upload */}
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              style={{ border: `2px dashed ${dragOver ? T.accent : T.border}`, borderRadius: 10, padding: 24, textAlign: "center", marginBottom: 20, cursor: "pointer", background: dragOver ? `${T.accent}11` : "transparent" }}
              onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => Array.from(e.target.files).forEach(f => { const url = URL.createObjectURL(f); setForm(prev => ({ ...prev, images: [...prev.images, url] })); })} />
              {form.images.length > 0 ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={img} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }} />
                      <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) })); }} style={{ position: "absolute", top: -6, right: -6, background: T.red, border: "none", color: "#fff", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 11 }}>×</button>
                      {i === 0 && <div style={{ position: "absolute", bottom: 2, left: 2, background: T.gold, color: "#0a0a0a", fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 2 }}>COVER</div>}
                    </div>
                  ))}
                  <div style={{ width: 80, height: 60, border: `2px dashed ${T.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 24 }}>+</div>
                </div>
              ) : (
                <div><div style={{ fontSize: 32, marginBottom: 8 }}>📷</div><div style={{ color: T.muted, fontSize: 13 }}>Drag & drop foto atau klik untuk pilih</div><div style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>Otomatis dikompres WebP ≤150KB via Cloudinary</div></div>
              )}
            </div>

            {/* Identitas kendaraan */}
            <div style={{ color: T.gold, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>Identitas Kendaraan</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              {[["brand", "Merek *", "Toyota"], ["model", "Model *", "Fortuner GR Sport"], ["noRangka", "No. Rangka", "MHFXX1234K567890"], ["noMesin", "No. Mesin", "2GD-FTV-88321"], ["color", "Warna", "Hitam Metalik"], ["year", "Tahun", "2024"], ["km", "Kilometer", "8200"]].map(([key, label, ph]) => (
                <div key={key}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <input style={inp} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} /></div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
              {[["type", "Tipe", ["SUV", "MPV", "Sedan", "Hatchback", "Pickup"]], ["transmission", "Transmisi", ["Otomatis", "Manual"]], ["fuel", "Bahan Bakar", ["Bensin", "Diesel", "Hybrid", "Listrik"]]].map(([key, label, opts]) => (
                <div key={key}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <select style={inp} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              ))}
            </div>

            {/* Harga */}
            <div style={{ color: T.gold, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>Harga</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Harga Beli (Rp)</label>
                <input style={inp} value={form.priceBeli} onChange={e => setForm(f => ({ ...f, priceBeli: e.target.value }))} placeholder="540000000" /></div>
              <div><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Harga Jual (Rp) *</label>
                <input style={inp} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="620000000" /></div>
              <div><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Estimasi Profit</label>
                <div style={{ ...inp, color: T.gold, fontWeight: 700, display: "flex", alignItems: "center" }}>{form.price && form.priceBeli ? fmt(Number(form.price) - Number(form.priceBeli)) : "—"}</div></div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Deskripsi</label>
              <textarea style={{ ...inp, resize: "vertical", minHeight: 50 }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
            </div>

            {/* Checklist inspeksi */}
            <div style={{ color: T.gold, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>Checklist Hasil Inspeksi (150+ Titik)</div>
            <div style={{ marginBottom: 18 }}>
              <InspectionForm inspection={form.inspection} setInspection={fn => setForm(f => ({ ...f, inspection: typeof fn === "function" ? fn(f.inspection) : fn }))} />
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 24, background: "#1e293b", padding: "12px 16px", borderRadius: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: T.text, fontSize: 13 }}>
                <input type="checkbox" checked={form.showInHero} onChange={e => setForm(f => ({ ...f, showInHero: e.target.checked }))} style={{ accentColor: T.accent, width: 16, height: 16 }} />
                Tampilkan di Slide Utama (Hero)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: T.muted, fontSize: 13 }}>Status:</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ background: "#0f1117", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", color: T.text, fontSize: 13 }}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleSave} style={{ flex: 1, padding: "12px", background: T.accent, color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{editId ? "Simpan Perubahan" : "Tambah Unit"}</button>
              <button onClick={() => setShowForm(false)} style={{ padding: "12px 24px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{["Foto", "Unit", "No. Rangka", "Harga Jual", "Profit Est.", "Status", "Hero", "Aksi"].map(h => (
            <th key={h} style={{ textAlign: "left", color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 16px" }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {cars.map(car => (
              <tr key={car.id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                <td style={{ padding: "12px 16px" }}><img src={car.images[0]} alt={car.model} style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 6, display: "block" }} /></td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{car.brand} {car.model}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{car.type} · {car.color}</div>
                </td>
                <td style={{ padding: "12px 16px", color: T.muted, fontSize: 12, fontFamily: "monospace" }}>{car.noRangka || "—"}</td>
                <td style={{ padding: "12px 16px", color: T.gold, fontWeight: 700, fontSize: 14 }}>{fmtShort(car.price)}</td>
                <td style={{ padding: "12px 16px", color: T.green, fontWeight: 600, fontSize: 13 }}>{car.priceBeli ? fmtShort(car.price - car.priceBeli) : "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <select value={car.status} onChange={e => setCars(prev => prev.map(c => c.id === car.id ? { ...c, status: e.target.value } : c))}
                    style={{ background: car.status === "Ready" ? `${T.green}22` : car.status === "Booking" ? `${T.amber}22` : "#1e293b", color: car.status === "Ready" ? T.green : car.status === "Booking" ? T.amber : T.muted, border: `1px solid ${car.status === "Ready" ? T.green : car.status === "Booking" ? T.amber : T.border}44`, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {STATUS_OPTS.map(s => <option key={s} value={s} style={{ background: T.card, color: T.text }}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => setCars(prev => prev.map(c => c.id === car.id ? { ...c, showInHero: !c.showInHero } : c))} style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: car.showInHero ? T.accent : "#2d3748", position: "relative" }}>
                    <div style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: car.showInHero ? 23 : 3, transition: "left 0.2s" }} />
                  </button>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(car)} style={{ padding: "6px 12px", background: `${T.accent}22`, color: T.accent, border: "none", borderRadius: 5, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                    <button onClick={() => handleDelete(car.id)} style={{ padding: "6px 12px", background: `${T.red}22`, color: T.red, border: "none", borderRadius: 5, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KANBAN CRM (5 stage) ─────────────────────────────────────────────────────
function CRMView({ orders, setOrders }) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);
  const stageColor = { "Pesanan Baru": "#a855f7", "Verifikasi Data": T.accent, "Proses Leasing/Pelunasan": T.amber, "Penyiapan Towing": "#06b6d4", "Mobil Terkirim": T.green };

  const handleDrop = (stage) => {
    if (dragging) { setOrders(prev => prev.map(o => o.id === dragging ? { ...o, stage } : o)); setDragging(null); setOver(null); }
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 20, color: T.muted, fontSize: 13 }}>Drag & drop kartu untuk mengubah tahap pesanan</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, alignItems: "start", overflowX: "auto" }}>
        {STAGES.map(stage => {
          const stageOrders = orders.filter(o => o.stage === stage);
          const color = stageColor[stage];
          return (
            <div key={stage} onDragOver={e => { e.preventDefault(); setOver(stage); }} onDragLeave={() => setOver(null)} onDrop={() => handleDrop(stage)}
              style={{ background: over === stage ? `${color}11` : T.card, border: `1px solid ${over === stage ? color : T.border}`, borderRadius: 10, minHeight: 200, minWidth: 220 }}>
              <div style={{ padding: "14px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, background: color, borderRadius: "50%" }} />
                  <span style={{ color: T.text, fontSize: 12, fontWeight: 700 }}>{stage}</span>
                </div>
                <span style={{ background: `${color}22`, color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{stageOrders.length}</span>
              </div>
              <div style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                {stageOrders.map(o => (
                  <div key={o.id} draggable onDragStart={() => setDragging(o.id)} onDragEnd={() => { setDragging(null); setOver(null); }}
                    style={{ background: dragging === o.id ? `${color}22` : "#1e293b", border: `1px solid ${dragging === o.id ? color : T.border}`, borderRadius: 8, padding: "12px 14px", cursor: "grab", opacity: dragging === o.id ? 0.7 : 1 }}>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{o.name}</div>
                    <div style={{ color: T.muted, fontSize: 11, marginBottom: 6 }}>📱 {o.phone}</div>
                    <div style={{ color, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>🚗 {o.unit}</div>
                    <div style={{ color: T.muted, fontSize: 10.5, marginBottom: 8 }}>📍 {o.alamat}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ background: `${color}22`, color, padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>{o.metode}</span>
                      <span style={{ color: T.muted, fontSize: 10 }}>{o.time}</span>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                      <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "5px", background: "#25D36622", color: "#25D366", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>💬 WA</a>
                      <button onClick={() => setOrders(prev => prev.filter(x => x.id !== o.id))} style={{ padding: "5px 8px", background: `${T.red}22`, color: T.red, border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                ))}
                {stageOrders.length === 0 && <div style={{ color: T.border, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Kosong</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FINANCE ─────────────────────────────────────────────────────────────────
function FinanceView({ transactions, setTransactions, cars }) {
  const [form, setForm] = useState({ type: "DP", amount: "", date: new Date().toISOString().split("T")[0], notes: "", category: "Pemasukan", carId: "" });

  const pemasukan = transactions.filter(t => t.category === "Pemasukan").reduce((s, t) => s + t.amount, 0);
  const pengeluaran = transactions.filter(t => t.category === "Pengeluaran").reduce((s, t) => s + t.amount, 0);
  const laba = pemasukan - pengeluaran;
  const soldCars = cars.filter(c => c.status === "Terjual");
  const totalProfitUnit = soldCars.reduce((s, c) => s + (c.price - c.priceBeli), 0);

  const handleAdd = () => {
    if (!form.amount || !form.notes) return alert("Jumlah dan keterangan wajib diisi.");
    setTransactions(prev => [{ ...form, id: `t${Date.now()}`, amount: Number(form.amount) }, ...prev]);
    setForm(f => ({ ...f, amount: "", notes: "", carId: "" }));
  };

  const inp = { background: "#1e293b", border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", color: T.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
  const mockMonthly = [820, 1150, 690, 1420, 1680, pemasukan / 1e6];
  const maxVal = Math.max(...mockMonthly);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon="📈" label="Total Pemasukan" value={fmtShort(pemasukan)} sub="Bulan ini" color={T.green} />
        <StatCard icon="📉" label="Total Pengeluaran" value={fmtShort(pengeluaran)} sub="Bulan ini" color={T.red} />
        <StatCard icon="💎" label="Laba Bersih" value={fmtShort(laba)} sub={laba >= 0 ? "Surplus ✓" : "Defisit !"} color={laba >= 0 ? T.green : T.red} />
        <StatCard icon="🏆" label="Profit per Unit" value={fmtShort(totalProfitUnit)} sub={`${soldCars.length} unit terjual`} color={T.gold} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, marginBottom: 24 }}>
        <div style={{ ...card, padding: 24 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Input Transaksi</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["Pemasukan", "Pengeluaran"].map(cat => (
              <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))} style={{ flex: 1, padding: "8px", border: `1.5px solid ${form.category === cat ? (cat === "Pemasukan" ? T.green : T.red) : T.border}`, borderRadius: 6, background: form.category === cat ? `${cat === "Pemasukan" ? T.green : T.red}22` : "transparent", color: form.category === cat ? (cat === "Pemasukan" ? T.green : T.red) : T.muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {cat === "Pemasukan" ? "📈" : "📉"} {cat}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Tipe</label>
            <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{["DP", "Pelunasan", "Pencairan Leasing", "Operasional", "Lainnya"].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
          <div style={{ marginBottom: 12 }}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Tanggal</label>
            <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div style={{ marginBottom: 12 }}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Unit Terkait (opsional)</label>
            <select style={inp} value={form.carId} onChange={e => setForm(f => ({ ...f, carId: e.target.value }))}><option value="">— Tidak ada —</option>{cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}</select></div>
          <div style={{ marginBottom: 12 }}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Jumlah (Rp)</label>
            <input style={inp} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Contoh: 120000000" /></div>
          <div style={{ marginBottom: 16 }}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5 }}>Keterangan</label>
            <input style={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contoh: Pelunasan dari leasing Adira..." /></div>
          <button onClick={handleAdd} style={{ width: "100%", padding: "11px", background: form.category === "Pemasukan" ? T.green : T.red, color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Tambah Transaksi</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: "20px 24px" }}>
            <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Grafik Omset</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90 }}>
              {mockMonthly.map((val, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ color: T.muted, fontSize: 9 }}>{val >= 1000 ? `${(val / 1000).toFixed(1)}M` : `${val}Jt`}</span>
                  <div style={{ width: "100%", background: i === mockMonthly.length - 1 ? T.green : `${T.green}55`, borderRadius: "3px 3px 0 0", height: `${(val / maxVal) * 72}px`, minHeight: 4 }} />
                  <span style={{ color: T.muted, fontSize: 10 }}>{months[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Profit per unit terjual */}
          <div style={{ ...card, padding: "20px 24px" }}>
            <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Profit per Unit Terjual</div>
            {soldCars.length === 0 ? <div style={{ color: T.border, fontSize: 12, textAlign: "center", padding: "12px 0" }}>Belum ada unit terjual</div> : soldCars.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}22` }}>
                <span style={{ color: T.text, fontSize: 12.5 }}>{c.brand} {c.model}</span>
                <span style={{ color: T.gold, fontWeight: 700, fontSize: 12.5 }}>+{fmtShort(c.price - c.priceBeli)}</span>
              </div>
            ))}
          </div>

          <div style={{ ...card, overflow: "hidden", flex: 1 }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Riwayat Transaksi</div>
            <div style={{ maxHeight: 220, overflow: "auto" }}>
              {transactions.map(tx => (
                <div key={tx.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}22`, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, background: tx.category === "Pemasukan" ? `${T.green}22` : `${T.red}22`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{tx.category === "Pemasukan" ? "📈" : "📉"}</div>
                  <div style={{ flex: 1 }}><div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{tx.notes}</div><div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{tx.type} · {tx.date}</div></div>
                  <div style={{ color: tx.category === "Pemasukan" ? T.green : T.red, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{tx.category === "Pemasukan" ? "+" : "−"}{fmtShort(tx.amount)}</div>
                  <button onClick={() => setTransactions(prev => prev.filter(t => t.id !== tx.id))} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function ZahraMobilAdmin() {
  const [page, setPage] = useState("dashboard");
  const [cars, setCars] = useState(initCars);
  const [orders, setOrders] = useState(initOrders);
  const [transactions, setTransactions] = useState(initTx);

  const titles = { dashboard: "Dashboard Overview", inventaris: "Manajemen Inventaris", crm: "Sales CRM — Kanban Board", finance: "Modul Finance" };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", display: "flex" }}>
      <Sidebar active={page} setActive={setPage} />
      <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header title={titles[page]} />
        <main style={{ flex: 1, overflow: "auto" }}>
          {page === "dashboard" && <DashboardView cars={cars} orders={orders} transactions={transactions} />}
          {page === "inventaris" && <InventarisView cars={cars} setCars={setCars} />}
          {page === "crm" && <CRMView orders={orders} setOrders={setOrders} />}
          {page === "finance" && <FinanceView transactions={transactions} setTransactions={setTransactions} cars={cars} />}
        </main>
      </div>
    </div>
  );
}
