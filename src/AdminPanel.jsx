import { useState, useEffect } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FIREBASE CONFIG â€” Aap ka config yahan hai
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const firebaseConfig = {
  apiKey: "AIzaSyCV15tWkyiVp301B_XqZco00qCaTddQQjo",
  authDomain: "aiustaad.firebaseapp.com",
  projectId: "aiustaad",
  storageBucket: "aiustaad.firebasestorage.app",
  messagingSenderId: "353029189136",
  appId: "1:353029189136:web:d6ba1d4197e6c1d987e495",
  measurementId: "G-RK3FY9Y1L8"
};

const ADMIN_PASSWORD = "aiustaad786";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function AdminPanel() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [freeLimit, setFreeLimit] = useState(10);
  const [appStatus, setAppStatus] = useState("active");
  const [announcement, setAnnouncement] = useState("");
  const [proPrice, setProPrice] = useState("$5/month");
  const [classPrice, setClassPrice] = useState("$30/month");
  const [shareRequired, setShareRequired] = useState(5);
  const [bonusDays, setBonusDays] = useState(7);

  const login = () => {
    if (pass === ADMIN_PASSWORD) {
      setAuth(true);
      loadSettings();
    } else {
      setErr("âŒ Wrong password!");
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const colRef = collection(db, "setting");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setFreeLimit(data.freeLimit || 10);
        setAppStatus(data.appStatus || "active");
        setAnnouncement(data.announcement || "");
        setProPrice(data.proPrice || "$5/month");
        setClassPrice(data.classPrice || "$30/month");
        setShareRequired(data.shareRequired || 5);
        setBonusDays(data.bonusDays || 7);
        setSettings({ id: snap.docs[0].id });
      }
    } catch (e) {
      setErr("Load error: " + e.message);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const docId = settings?.id || "config";
      await setDoc(doc(db, "setting", docId), {
        freeLimit: Number(freeLimit),
        appStatus,
        announcement,
        proPrice,
        classPrice,
        shareRequired: Number(shareRequired),
        bonusDays: Number(bonusDays),
        updatedAt: new Date().toISOString()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr("Save error: " + e.message);
    }
    setSaving(false);
  };

  const S = {
    root: { minHeight: "100vh", background: "#0f172a", fontFamily: "'Segoe UI', sans-serif", padding: 0 },
    header: { background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 },
    title: { fontSize: 20, fontWeight: 800, color: "#fff" },
    subtitle: { fontSize: 12, color: "#fef3c7" },
    body: { padding: 16, maxWidth: 500, margin: "0 auto" },
    card: { background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" },
    label: { fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" },
    inp: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 10 },
    sel: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 10 },
    btn: { background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 10, padding: "13px 20px", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%" },
    statusBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
    center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", padding: 20 },
    loginCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 },
  };

  if (!auth) return (
    <div style={S.center}>
      <div style={S.loginCard}>
        <div style={{ fontSize: 48, textAlign: "center" }}>ðŸ”</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", textAlign: "center" }}>Owner Panel</div>
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: 0 }}>AI Ustaad Admin Access</p>
        <input
          style={S.inp}
          type="password"
          placeholder="Enter admin password..."
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
        />
        {err && <div style={{ color: "#ef4444", fontSize: 13 }}>{err}</div>}
        <button style={S.btn} onClick={login}>Login ðŸ”</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.header}>
        <span style={{ fontSize: 28 }}>ðŸ“š</span>
        <div>
          <div style={S.title}>AI Ustaad â€” Owner Panel</div>
          <div style={S.subtitle}>App settings control karein</div>
        </div>
        <div style={{ marginLeft: "auto", background: appStatus === "active" ? "#22c55e" : "#ef4444", ...S.statusBadge, color: "#fff" }}>
          {appStatus === "active" ? "â— LIVE" : "â— OFF"}
        </div>
      </div>

      <div style={S.body}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Loading settings... â³</div>
        ) : (
          <>
            {/* App Status */}
            <div style={S.card}>
              <div style={S.sectionTitle}>âš™ï¸ App Control</div>
              <label style={S.label}>App Status</label>
              <select style={S.sel} value={appStatus} onChange={e => setAppStatus(e.target.value)}>
                <option value="active">âœ… Active â€” App chal rahi hai</option>
                <option value="maintenance">ðŸ”§ Maintenance â€” App band hai</option>
              </select>
              <label style={S.label}>Announcement (Users ko dikhaye)</label>
              <input style={S.inp} placeholder="e.g. New features added! ðŸŽ‰" value={announcement} onChange={e => setAnnouncement(e.target.value)} />
            </div>

            {/* Free Limit */}
            <div style={S.card}>
              <div style={S.sectionTitle}>ðŸ†“ Free Plan Settings</div>
              <label style={S.label}>Daily Free Questions: {freeLimit}</label>
              <input type="range" min={5} max={50} value={freeLimit} onChange={e => setFreeLimit(e.target.value)} style={{ width: "100%", accentColor: "#f59e0b", marginBottom: 8 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                <span>5 (strict)</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{freeLimit} questions</span><span>50 (generous)</span>
              </div>

              <label style={S.label}>Share Required for Bonus</label>
              <input style={S.inp} type="number" min={1} max={20} value={shareRequired} onChange={e => setShareRequired(e.target.value)} />

              <label style={S.label}>Bonus Days (share karne par)</label>
              <input style={S.inp} type="number" min={1} max={30} value={bonusDays} onChange={e => setBonusDays(e.target.value)} />
            </div>

            {/* Prices */}
            <div style={S.card}>
              <div style={S.sectionTitle}>ðŸ’° Plan Prices</div>
              <label style={S.label}>Pro Plan Price</label>
              <input style={S.inp} placeholder="$5/month" value={proPrice} onChange={e => setProPrice(e.target.value)} />
              <label style={S.label}>Class Pack Price</label>
              <input style={S.inp} placeholder="$30/month" value={classPrice} onChange={e => setClassPrice(e.target.value)} />
            </div>

            {/* Save */}
            {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</div>}

            <button style={{ ...S.btn, background: saved ? "#22c55e" : "linear-gradient(135deg, #f59e0b, #d97706)" }} onClick={save} disabled={saving}>
              {saving ? "Saving... â³" : saved ? "âœ… Saved!" : "ðŸ’¾ Save All Changes"}
            </button>

            <div style={{ background: "#1e293b", borderRadius: 10, padding: "10px 14px", marginTop: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>
              Changes save hone par app automatically update ho jaye gi! ðŸš€
            </div>
          </>
        )}
      </div>
    </div>
  );
}
