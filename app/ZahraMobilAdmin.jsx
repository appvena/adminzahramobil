"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

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

const APP_VERSION = "1.8.0";
const CLOUDINARY_CLOUD_NAME = "dtpow34rz";
const CLOUDINARY_UPLOAD_PRESET = "zahramobil_unsigned";

const STAGES = ["Pesanan Baru", "Verifikasi Data", "Proses Leasing/Pelunasan", "Penyiapan Towing", "Mobil Terkirim"];
const STAGE_SHORT = { "Pesanan Baru": "Baru", "Verifikasi Data": "Verifikasi", "Proses Leasing/Pelunasan": "Leasing/Lunas", "Penyiapan Towing": "Towing", "Mobil Terkirim": "Terkirim" };

const STATUS_OPTS = ["Ready", "Booking", "Terjual"];
const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtShort = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(2)} M` : `${(n / 1e6).toFixed(0)} Jt`;

const T = {
  bg: "#ECE9D8",            // desktop/window background khas XP
  card: "#FFFFFF",
  border: "#7F9DB9",        // border biru-abu khas XP
  text: "#000000",
  muted: "#5A5A5A",
  accent: "#316AC5",        // biru highlight XP
  gold: "#C9A84C",
  green: "#1A8A1A",
  red: "#C42B1C",
  amber: "#E6A817",
};
const xpFont = "'Tahoma', 'Segoe UI', Verdana, sans-serif";
const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 0, boxShadow: "inset 1px 1px 0 #fff" };
// Title bar gradient biru khas jendela XP
const xpTitlebar = {
  background: "linear-gradient(180deg, #0997FF 0%, #0058E6 8%, #0050D8 40%, #1C6FE8 60%, #0050D8 88%, #003BBF 100%)",
  color: "#fff", fontWeight: 700, fontSize: 12, fontFamily: xpFont,
  padding: "5px 10px", borderRadius: "5px 5px 0 0", display: "flex", alignItems: "center", gap: 6,
};
// Tombol bevel timbul khas XP
const xpBtn = (active) => ({
  fontFamily: xpFont,
  background: active ? "linear-gradient(180deg, #3D94FF, #1A5FD0)" : "linear-gradient(180deg, #FDFDFD, #ECEBE5)",
  border: "1px solid " + (active ? "#0A3E9E" : "#919B9C"),
  borderRadius: 3,
  boxShadow: active ? "inset 1px 1px 2px rgba(0,0,0,0.3)" : "inset 1px 1px 0 #fff",
  color: active ? "#fff" : "#000",
});

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
// ─── NAVIGASI MODUL ──────────────────────────────────────────────────────────
// Untuk menambah modul baru di masa depan, ikuti 3 langkah ini:
// 1. Tambah 1 baris baru di array NAV ini, contoh:
//    { key: "karyawan", icon: "👥", label: "Karyawan" }
// 2. Buat function komponen baru, contoh: function KaryawanView({ ...props }) { ... }
//    (letakkan sejajar dengan DashboardView, InventarisView, CRMView, FinanceView di bawah)
// 3. Daftarkan render-nya di komponen App utama (cari blok {page === "dashboard" && ...}),
//    tambah baris: {page === "karyawan" && <KaryawanView ... />}
// Kalau modul baru butuh data sendiri di Firestore, buat collection baru
// (lihat pola onSnapshot(collection(db, "cars"/"orders"/"transactions")) di App utama)
// dan jangan lupa tambahkan Security Rules-nya di Firebase Console.
const NAV = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "inventaris", icon: "🚗", label: "Inventaris" },
  { key: "crm", icon: "🎯", label: "Sales CRM" },
  { key: "finance", icon: "💰", label: "Finance" },
];

function Sidebar({ active, setActive, onLogout }) {
  return (
    <aside className="zm-sidebar" style={{ width: 220, background: "linear-gradient(180deg, #2A6EBB 0%, #1B4F91 100%)", borderRight: "2px solid #0A3E9E", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, fontFamily: xpFont, overflow: "hidden" }}>
      <div style={{ ...xpTitlebar, borderRadius: 0, padding: "8px 12px" }}>
        <img src="/adminzahramobil/logo.png" alt="ZM Showroom" style={{ height: 24, width: "auto", flexShrink: 0, objectFit: "contain" }} />
        <div className="zm-sidebar-label" style={{ lineHeight: 1.2 }}><div style={{ fontSize: 13 }}>ZAHRA MOBIL</div><div style={{ fontSize: 9, opacity: 0.85, fontWeight: 400 }}>ADMIN PANEL</div></div>
      </div>
      <nav style={{ padding: 10, flex: 1 }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setActive(n.key)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: active === n.key ? "1px solid #fff" : "1px solid transparent",
            cursor: "pointer", marginBottom: 3, background: active === n.key ? "rgba(255,255,255,0.25)" : "transparent",
            color: "#fff", fontWeight: active === n.key ? 700 : 400, fontSize: 12.5, textAlign: "left", fontFamily: xpFont, borderRadius: 3,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span> <span className="zm-sidebar-label">{n.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.1)" }}>
        <div className="zm-sidebar-label" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, background: "#fff", border: "1px solid #0A3E9E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>👤</div>
          <div><div style={{ color: "#fff", fontSize: 11.5, fontWeight: 700 }}>Admin</div><div style={{ color: "#cfe0f7", fontSize: 10 }}>Super Admin</div></div>
        </div>
        <button onClick={onLogout} title="Keluar" style={{ width: "100%", padding: "6px", ...xpBtn(false), fontSize: 11.5, cursor: "pointer" }}>
          <span className="zm-sidebar-label">Keluar</span>
          <span className="zm-sidebar-icon-only">🚪</span>
        </button>
      </div>
    </aside>
  );
}

function Header({ title }) {
  const now = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <>
      <header style={{ ...xpTitlebar, borderRadius: 0, padding: "8px 16px", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: xpFont, color: "#fff" }}>📁 {title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="zm-hide-mobile" style={{ fontSize: 11, opacity: 0.9 }}>{now}</span>
          <div style={{ width: 8, height: 8, background: "#7CFF7C", borderRadius: "50%", boxShadow: "0 0 6px #7CFF7C", border: "1px solid #2a8a2a" }} />
          <span style={{ fontSize: 11, opacity: 0.9 }}>Live</span>
        </div>
      </header>
      <div style={{ background: "#d8d4c0", borderBottom: `1px solid ${T.border}`, padding: "3px 16px", textAlign: "right", fontSize: 10, color: "#5A5A5A", fontFamily: xpFont }}>
        v{APP_VERSION} · ©2026 SRISP
      </div>
    </>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ ...card, padding: "16px 18px", fontFamily: xpFont }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: T.muted, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 700 }}>{label}</div>
          <div style={{ color: T.text, fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{value}</div>
          {sub && <div style={{ color: color || T.muted, fontSize: 11 }}>{sub}</div>}
        </div>
        <div style={{ width: 38, height: 38, background: "#fff", border: `2px solid ${color || T.accent}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
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
      <div className="zm-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon="🚗" label="Unit Ready" value={totalStok} sub="Siap jual" color={T.green} />
        <StatCard icon="📋" label="Unit Booking" value={totalBooking} sub="Dalam proses" color={T.amber} />
        <StatCard icon="✅" label="Terjual" value={totalTerjual} sub="Total" color={T.accent} />
        <StatCard icon="🔔" label="Pesanan Baru" value={orderBaru} sub="Perlu ditindak" color="#a855f7" />
      </div>

      <div className="zm-dash-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 24 }}>
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
              <div style={{ background: "#fff", borderRadius: 99, height: 6 }}><div style={{ width: `${(item.count / cars.length) * 100}%`, background: item.color, borderRadius: 99, height: "100%" }} /></div>
            </div>
          ))}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>Total Nilai Stok Ready</div>
            <div style={{ color: T.gold, fontSize: 18, fontWeight: 800 }}>{fmt(cars.filter(c => c.status === "Ready").reduce((s, c) => s + c.price, 0))}</div>
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: "24px 28px", overflowX: "auto" }}>
        <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Pesanan Terbaru</div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead><tr>{["Nama", "No. HP", "Unit", "Metode", "Stage", "Waktu"].map(h => (
            <th key={h} style={{ textAlign: "left", color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", paddingBottom: 12, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
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
      <div style={{ background: "#f5f5f0", border: `1px solid ${T.border}`, borderRadius: 0, padding: 16, display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflow: "auto" }}>
        {inspection[openCat].map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 0 }}>
            <span style={{ color: "#000", fontSize: 12.5, flex: 1 }}>{item.name}</span>
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
  const blank = { brand: "", model: "", type: "SUV", priceBeli: "", price: "", year: new Date().getFullYear(), km: 0, status: "Ready", showInHero: false, color: "", transmission: "Otomatis", fuel: "Bensin", noRangka: "", noMesin: "", noPolisi: "", desc: "", images: [], inspection: defaultInspection() };
  const [form, setForm] = useState(blank);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileRef = useRef();

  const reset = () => { setForm(blank); setEditId(null); };
  const handleEdit = (car) => { setForm({ ...car }); setEditId(car.id); setShowForm(true); };

  const [uploadProgress, setUploadProgress] = useState({});

  const uploadOneFile = (file) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      xhr.timeout = 20000; // 20 detik, supaya tidak macet selamanya
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: pct }));
        }
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) {
            resolve(json.secure_url);
          } else {
            reject(new Error(json.error?.message || `Status ${xhr.status}`));
          }
        } catch (e) {
          reject(new Error("Respons tidak valid dari server"));
        }
      };
      xhr.onerror = () => reject(new Error("Gagal terhubung ke server (cek koneksi internet)"));
      xhr.ontimeout = () => reject(new Error("Waktu unggah habis (20 detik). Coba foto lebih kecil atau cek koneksi"));

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(data);
    });
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setUploadingCount(c => c + files.length);
    for (const file of files) {
      try {
        const url = await uploadOneFile(file);
        setForm(prev => ({ ...prev, images: [...prev.images, url] }));
      } catch (e) {
        alert(`Gagal mengunggah foto "${file.name}": ${e.message}`);
      } finally {
        setUploadingCount(c => c - 1);
        setUploadProgress(prev => { const p = { ...prev }; delete p[file.name]; return p; });
      }
    }
  };

  const handleSave = async () => {
    if (!form.brand || !form.model || !form.price) return alert("Brand, Model, dan Harga Jual wajib diisi.");
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), priceBeli: Number(form.priceBeli || 0), images: form.images.length ? form.images : ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=75"] };
      delete payload.id;
      if (editId) {
        await updateDoc(doc(db, "cars", editId), payload);
      } else {
        await addDoc(collection(db, "cars"), payload);
      }
      reset(); setShowForm(false);
    } catch (e) {
      alert("Gagal menyimpan data: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus unit ini?")) return;
    try {
      await deleteDoc(doc(db, "cars", id));
    } catch (e) {
      alert("Gagal menghapus data. Silakan coba lagi.");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }, []);

  const inp = { background: "#fff", border: `1px solid ${T.border}`, borderRadius: 0, padding: "6px 8px", boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.12)", color: T.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", textTransform: "uppercase" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ color: T.muted, fontSize: 13 }}>{cars.length} unit terdaftar</div>
        <button onClick={() => { reset(); setShowForm(true); }} style={{ padding: "7px 18px", ...xpBtn(true), fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>+ Tambah Unit</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, width: "92%", maxWidth: 760, maxHeight: "92vh", overflow: "auto", padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ color: T.text, margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? "Edit Unit" : "Tambah Unit Baru"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {/* Image upload */}
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              style={{ border: `2px dashed ${dragOver ? T.accent : T.border}`, borderRadius: 2, padding: 24, textAlign: "center", marginBottom: 20, cursor: "pointer", background: dragOver ? `${T.accent}11` : "transparent" }}
              onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => uploadFiles(e.target.files)} />
              {uploadingCount > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {Object.entries(uploadProgress).map(([name, pct]) => (
                    <div key={name} style={{ color: T.accent, fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>⏳ {name}: {pct}%</div>
                  ))}
                  {uploadingCount > 0 && Object.keys(uploadProgress).length === 0 && (
                    <div style={{ color: T.accent, fontSize: 12, fontWeight: 700 }}>⏳ Mempersiapkan unggah {uploadingCount} foto...</div>
                  )}
                </div>
              )}
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
            <div className="zm-form-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              {[["brand", "Merek *", "Toyota"], ["model", "Model *", "Fortuner GR Sport"], ["noRangka", "No. Rangka", "MHFXX1234K567890"], ["noMesin", "No. Mesin", "2GD-FTV-88321"], ["noPolisi", "No. Polisi", "B 1234 ABC"], ["color", "Warna", "Hitam Metalik"], ["year", "Tahun", "2024"], ["km", "Kilometer", "8200"]].map(([key, label, ph]) => (
                <div key={key}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <input style={inp} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} /></div>
              ))}
            </div>

            <div className="zm-form-grid3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
              {[["type", "Tipe", ["SUV", "MPV", "Sedan", "Hatchback", "Pickup"]], ["transmission", "Transmisi", ["Otomatis", "Manual"]], ["fuel", "Bahan Bakar", ["Bensin", "Diesel", "Hybrid", "Listrik"]]].map(([key, label, opts]) => (
                <div key={key}><label style={{ color: T.muted, fontSize: 11, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <select style={inp} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              ))}
            </div>

            {/* Harga */}
            <div style={{ color: T.gold, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>Harga</div>
            <div className="zm-form-grid3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
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

            <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 24, background: "#fff", padding: "12px 16px", borderRadius: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: T.text, fontSize: 13 }}>
                <input type="checkbox" checked={form.showInHero} onChange={e => setForm(f => ({ ...f, showInHero: e.target.checked }))} style={{ accentColor: T.accent, width: 16, height: 16 }} />
                Tampilkan di Slide Utama (Hero)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: T.muted, fontSize: 13 }}>Status:</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", color: T.text, fontSize: 13 }}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleSave} disabled={saving || uploadingCount > 0} style={{ flex: 1, padding: "9px", ...((saving || uploadingCount > 0) ? { background: "#bbb", border: "1px solid #999", color: "#fff", borderRadius: 3 } : xpBtn(true)), fontWeight: 700, fontSize: 13, cursor: (saving || uploadingCount > 0) ? "default" : "pointer" }}>{saving ? "Menyimpan..." : uploadingCount > 0 ? "Tunggu unggah foto..." : editId ? "Simpan Perubahan" : "Tambah Unit"}</button>
              <button onClick={() => setShowForm(false)} style={{ padding: "12px 24px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...card, overflowX: "auto", overflowY: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{["Foto", "Unit", "No. Rangka", "Harga Jual", "Profit Est.", "Status", "Hero", "Aksi"].map(h => (
            <th key={h} style={{ textAlign: "left", color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 16px", whiteSpace: "nowrap" }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {cars.map(car => (
              <tr key={car.id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                <td style={{ padding: "12px 16px" }}><img src={car.images[0]} alt={car.model} style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 6, display: "block" }} /></td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ color: T.text, fontWeight: 600, fontSize: 14, textTransform: "uppercase" }}>{car.brand} {car.model}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 2, textTransform: "uppercase" }}>{car.type} · {car.color}</div>
                </td>
                <td style={{ padding: "12px 16px", color: T.muted, fontSize: 12, fontFamily: "monospace", textTransform: "uppercase" }}>{car.noRangka || "—"}</td>
                <td style={{ padding: "12px 16px", color: T.gold, fontWeight: 700, fontSize: 14 }}>{fmtShort(car.price)}</td>
                <td style={{ padding: "12px 16px", color: T.green, fontWeight: 600, fontSize: 13 }}>{car.priceBeli ? fmtShort(car.price - car.priceBeli) : "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <select value={car.status} onChange={e => updateDoc(doc(db, "cars", car.id), { status: e.target.value }).catch(() => alert("Gagal update status."))}
                    style={{ background: car.status === "Ready" ? `${T.green}22` : car.status === "Booking" ? `${T.amber}22` : "#fff", color: car.status === "Ready" ? T.green : car.status === "Booking" ? T.amber : T.muted, border: `1px solid ${car.status === "Ready" ? T.green : car.status === "Booking" ? T.amber : T.border}44`, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {STATUS_OPTS.map(s => <option key={s} value={s} style={{ background: T.card, color: T.text }}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => updateDoc(doc(db, "cars", car.id), { showInHero: !car.showInHero }).catch(() => alert("Gagal update."))} style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: car.showInHero ? T.accent : "#c5c5c5", position: "relative" }}>
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
    if (dragging) {
      updateDoc(doc(db, "orders", dragging), { stage }).catch(() => alert("Gagal update status pesanan."));
      setDragging(null); setOver(null);
    }
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
              style={{ background: over === stage ? `${color}11` : T.card, border: `1px solid ${over === stage ? color : T.border}`, borderRadius: 2, minHeight: 200, minWidth: 220 }}>
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
                    style={{ background: dragging === o.id ? `${color}22` : "#fff", border: `1px solid ${dragging === o.id ? color : T.border}`, borderRadius: 8, padding: "12px 14px", cursor: "grab", opacity: dragging === o.id ? 0.7 : 1 }}>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{o.name}</div>
                    <div style={{ color: T.muted, fontSize: 11, marginBottom: 6 }}>📱 {o.phone}</div>
                    <div style={{ color, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>🚗 {o.unit}</div>
                    <div style={{ color: T.muted, fontSize: 10.5, marginBottom: 8 }}>📍 {o.alamat}</div>
                    {o.ktp && (
                      <a href={o.ktp} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 8, fontSize: 10.5, color: T.accent, textDecoration: "underline" }}>🪪 Lihat Foto KTP</a>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ background: `${color}22`, color, padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>{o.metode}</span>
                      <span style={{ color: T.muted, fontSize: 10 }}>{o.time}</span>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                      <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "5px", background: "#25D36622", color: "#25D366", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>💬 WA</a>
                      <button onClick={() => { if (window.confirm("Hapus pesanan ini?")) deleteDoc(doc(db, "orders", o.id)).catch(() => alert("Gagal menghapus.")); }} style={{ padding: "5px 8px", background: `${T.red}22`, color: T.red, border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✕</button>
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

  const handleAdd = async () => {
    if (!form.amount || !form.notes) return alert("Jumlah dan keterangan wajib diisi.");
    try {
      await addDoc(collection(db, "transactions"), { ...form, amount: Number(form.amount) });
      setForm(f => ({ ...f, amount: "", notes: "", carId: "" }));
    } catch (e) {
      alert("Gagal menyimpan transaksi.");
    }
  };

  const inp = { background: "#fff", border: `1px solid ${T.border}`, borderRadius: 0, padding: "6px 8px", boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.12)", color: T.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", textTransform: "uppercase" };
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
  const mockMonthly = [820, 1150, 690, 1420, 1680, pemasukan / 1e6];
  const maxVal = Math.max(...mockMonthly);

  return (
    <div style={{ padding: 28 }}>
      <div className="zm-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon="📈" label="Total Pemasukan" value={fmtShort(pemasukan)} sub="Bulan ini" color={T.green} />
        <StatCard icon="📉" label="Total Pengeluaran" value={fmtShort(pengeluaran)} sub="Bulan ini" color={T.red} />
        <StatCard icon="💎" label="Laba Bersih" value={fmtShort(laba)} sub={laba >= 0 ? "Surplus ✓" : "Defisit !"} color={laba >= 0 ? T.green : T.red} />
        <StatCard icon="🏆" label="Profit per Unit" value={fmtShort(totalProfitUnit)} sub={`${soldCars.length} unit terjual`} color={T.gold} />
      </div>

      <div className="zm-fin-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, marginBottom: 24 }}>
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
          <button onClick={handleAdd} style={{ width: "100%", padding: "8px", ...xpBtn(true), background: form.category === "Pemasukan" ? "linear-gradient(180deg, #4DBE4D, #1A8A1A)" : "linear-gradient(180deg, #E05858, #C42B1C)", border: "1px solid " + (form.category === "Pemasukan" ? "#1A8A1A" : "#C42B1C"), fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Tambah Transaksi</button>
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
                  <button onClick={() => deleteDoc(doc(db, "transactions", tx.id)).catch(() => alert("Gagal menghapus."))} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ────────────────────────────────────────────────────────────
function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inp = { background: "#fff", border: "1px solid #7F9DB9", borderRadius: 0, padding: "6px 8px", color: "#000", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: xpFont, boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.15)" };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess && onLoginSuccess();
    } catch (err) {
      setError("Email atau password salah. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "linear-gradient(180deg, #5A8FD6 0%, #2A5DA8 50%, #7CB0E8 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: xpFont, padding: 20 }}>
      <form onSubmit={handleLogin} style={{ background: "#ECE9D8", border: "1px solid #0A3E9E", borderRadius: 8, padding: 0, width: "100%", maxWidth: 360, boxSizing: "border-box", boxShadow: "3px 3px 14px rgba(0,0,0,0.4)", overflow: "hidden" }}>
        <div style={{ ...xpTitlebar, borderRadius: "7px 7px 0 0", padding: "7px 10px" }}>
          <img src="/adminzahramobil/logo.png" alt="ZM Showroom" style={{ height: 16, width: "auto" }} />
          <span>Log On to Zahra Mobil Admin</span>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img src="/adminzahramobil/logo.png" alt="ZM Showroom" style={{ height: 56, width: "auto", marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0A3E9E" }}>ZAHRA MOBIL <span style={{ color: T.muted, fontWeight: 400 }}>ADMIN</span></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "#000", fontSize: 12, display: "block", marginBottom: 4, fontWeight: 700 }}>Email:</label>
            <input type="email" required style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@zahramobil.com" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#000", fontSize: 12, display: "block", marginBottom: 4, fontWeight: 700 }}>Password:</label>
            <input type="password" required style={inp} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div style={{ color: T.red, fontSize: 11.5, marginBottom: 14, textAlign: "center", fontWeight: 700 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "8px", ...xpBtn(true), fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer" }}>
            {loading ? "Memproses..." : "Masuk ▸"}
          </button>
          <div style={{ textAlign: "center", marginTop: 14, color: "#5A5A5A", fontSize: 10 }}>
            v{APP_VERSION} · ©2026 SRISP
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function ZahraMobilAdmin() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [cars, setCars] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Cek status login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // Listener real-time Firestore (hanya aktif setelah login)
  useEffect(() => {
    if (!user) return;
    const unsubCars = onSnapshot(collection(db, "cars"), (snap) => {
      setCars(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTx = onSnapshot(collection(db, "transactions"), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubCars(); unsubOrders(); unsubTx(); };
  }, [user]);

  const titles = { dashboard: "Dashboard Overview", inventaris: "Manajemen Inventaris", crm: "Sales CRM — Kanban Board", finance: "Modul Finance" };

  if (!authChecked) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: T.muted, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Memuat...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: xpFont, display: "flex", overflowX: "hidden", maxWidth: "100vw" }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; background: #ECE9D8; }
        img { max-width: 100%; }
        .zm-sidebar-icon-only { display: none; }
        @media (max-width: 820px) {
          .zm-sidebar { width: 64px !important; }
          .zm-sidebar .zm-sidebar-label { display: none !important; }
          .zm-sidebar .zm-sidebar-icon-only { display: inline !important; font-size: 16px; }
          .zm-main-content { margin-left: 64px !important; }
          .zm-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zm-dash-grid { grid-template-columns: 1fr !important; }
          .zm-fin-grid { grid-template-columns: 1fr !important; }
          .zm-form-grid3 { grid-template-columns: 1fr 1fr !important; }
          .zm-hide-mobile { display: none !important; }
        }
        @media (max-width: 480px) {
          .zm-stat-grid { grid-template-columns: 1fr !important; }
          .zm-form-grid2 { grid-template-columns: 1fr !important; }
          .zm-form-grid3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <Sidebar active={page} setActive={setPage} onLogout={() => signOut(auth)} />
      <div className="zm-main-content" style={{ marginLeft: 220, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header title={titles[page]} />
        <main style={{ flex: 1, overflow: "auto", background: T.bg }}>
          {page === "dashboard" && <DashboardView cars={cars} orders={orders} transactions={transactions} />}
          {page === "inventaris" && <InventarisView cars={cars} setCars={setCars} />}
          {page === "crm" && <CRMView orders={orders} setOrders={setOrders} />}
          {page === "finance" && <FinanceView transactions={transactions} setTransactions={setTransactions} cars={cars} />}
        </main>
      </div>
    </div>
  );
}
