import { useEffect, useState, useCallback } from "react";

/* ================= helpers ================= */
async function api(path, method = "GET", body) {
  const r = await fetch((import.meta.env.VITE_API_URL || "") + "/api" + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({ success: false, message: "Backend not reachable. Is run.bat running?" }));
  if (!j.success) throw new Error(j.message);
  return j.data;
}
const band = (n) => (n <= 2 ? "Very Poor" : n <= 4 ? "Below Average" : n <= 6 ? "Average" : n <= 8 ? "Good" : "Excellent");
const bandColor = (n) => (n <= 2 ? "#ef4444" : n <= 4 ? "#f97316" : n <= 6 ? "#eab308" : n <= 8 ? "#6366f1" : "#10b981");
const RECS = ["Best", "Better", "Good", "Average", "Poor", "Very Poor"];
const RCOL = { "Best": "#059669", "Better": "#10b981", "Good": "#6366f1", "Average": "#f59e0b", "Poor": "#f97316", "Very Poor": "#ef4444" };
const STATUSES = ["Scheduled", "Interviewed", "Evaluation Pending", "Evaluated", "Shortlisted", "On Hold", "Rejected", "Hired"];
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function useHash() {
  const [h, setH] = useState(location.hash || "#/dashboard");
  useEffect(() => { const f = () => setH(location.hash || "#/dashboard"); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return h.slice(2).split("/");
}

const CSS = `
:root{--p:#6366f1;--p2:#8b5cf6;--pink:#ec4899;--ink:#1e1b4b;--bg:#f1f2ff;--mut:#6b7280}
*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:'Segoe UI',system-ui,sans-serif;color:var(--ink)}
.side{position:fixed;inset:0 auto 0 0;width:236px;background:linear-gradient(185deg,#1e1b4b,#4338ca 55%,#7c3aed);color:#fff;padding:22px 14px;display:flex;flex-direction:column;z-index:5}
.brand{font-size:21px;font-weight:800;margin:0 8px 26px}.brand span{color:#f9a8d4}
.nav a{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:12px;color:#e0e7ff;text-decoration:none;margin-bottom:6px;font-weight:600;font-size:15px;transition:.15s}
.nav a:hover{background:rgba(255,255,255,.1)}.nav a.on{background:rgba(255,255,255,.2);color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.main{margin-left:236px;padding:24px 28px;max-width:1240px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}.top h1{margin:0;font-size:26px}
.who{background:#fff;border-radius:30px;padding:6px 8px 6px 16px;box-shadow:0 2px 12px rgba(99,102,241,.12);display:flex;gap:8px;align-items:center;font-size:14px}
.who input{border:0;background:#eef0ff;border-radius:20px;padding:8px 14px;font-size:14px;width:150px;outline:0}
.card{background:#fff;border-radius:18px;box-shadow:0 6px 24px rgba(79,70,229,.08);padding:20px;margin-bottom:16px}.card h3{margin:0 0 14px}
.grid{display:grid;gap:16px}.g5{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.g2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.gf{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.stat{color:#fff;border-radius:18px;padding:18px;position:relative;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.12)}.stat b{font-size:32px;display:block}.stat small{opacity:.9}.stat i{position:absolute;right:12px;top:8px;font-size:34px;opacity:.35;font-style:normal}
.btn{padding:10px 16px;border-radius:12px;border:1px solid #dfe2ff;background:#fff;font-weight:700;cursor:pointer;font-size:14px;color:var(--ink);text-decoration:none;display:inline-block}.btn:hover{background:#f5f6ff}
.btn.p{background:linear-gradient(90deg,var(--p),var(--p2));color:#fff;border:0;box-shadow:0 6px 16px rgba(99,102,241,.35)}.btn.p:hover{filter:brightness(1.06)}.btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.in{padding:11px 13px;border:1px solid #dfe2ff;border-radius:12px;font-size:14px;width:100%;background:#fafaff;outline:0}.in:focus{border-color:var(--p);box-shadow:0 0 0 3px rgba(99,102,241,.15)}
.row{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center}.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}th{font-size:12px;text-transform:uppercase;color:var(--mut);text-align:left;padding:10px 8px}td{padding:12px 8px;border-top:1px solid #eef0ff;white-space:nowrap}
.pill{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#eef0ff;color:#4338ca;display:inline-block}
.bar{height:10px;background:#eef0ff;border-radius:6px;overflow:hidden;margin-top:5px}.bar div{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--p),var(--pink))}
.donut{width:150px;height:150px;border-radius:50%;position:relative;flex:none}.donut:after{content:"";position:absolute;inset:28px;background:#fff;border-radius:50%}
.nums{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.nums button{width:36px;height:36px;border-radius:10px;border:1px solid #dfe2ff;background:#fff;cursor:pointer;font-weight:700;color:var(--ink)}.nums button:hover{background:#eef0ff}.nums button:disabled{cursor:not-allowed}
.sc{flex:1;min-width:130px;text-align:center;color:#fff;border-radius:16px;padding:16px}.sc b{font-size:30px;display:block}
.col{display:flex;align-items:flex-end;gap:10px;height:150px}.col div{flex:1;text-align:center;font-size:11px}.col span{display:block;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--pink),var(--p));margin-bottom:4px}
.toast{position:fixed;bottom:20px;right:20px;max-width:440px;padding:14px 18px;border-radius:14px;color:#fff;background:#059669;z-index:99;box-shadow:0 10px 30px rgba(0,0,0,.25);font-weight:600}.toast.err{background:#dc2626}
.chip{padding:8px 14px;border-radius:20px;border:1px solid #dfe2ff;background:#fff;cursor:pointer;font-weight:600;font-size:13px}.chip.on{background:var(--p);color:#fff;border-color:var(--p)}
@media(max-width:820px){.side{inset:auto 0 0 0;width:auto;flex-direction:row;padding:8px;justify-content:space-around}.brand{display:none}.nav{display:flex;width:100%;justify-content:space-around}.nav a{flex-direction:column;gap:2px;font-size:11px;padding:8px;margin:0}.main{margin:0;padding:16px 14px 90px}}
`;

/* ================= small components ================= */
const Bar = ({ label, v, max = 10, color }) => (
  <div style={{ marginBottom: 12 }}><div className="row" style={{ fontSize: 14 }}><span>{label}</span><b>{v ?? "-"}</b></div>
    <div className="bar"><div style={{ width: `${((v || 0) / max) * 100}%`, background: color }} /></div></div>
);
function Donut({ data }) {
  const tot = data.reduce((a, d) => a + d.v, 0); let acc = 0;
  const stops = data.map((d) => { const s = (acc / tot) * 100; acc += d.v; return `${RCOL[d.k]} ${s}% ${(acc / tot) * 100}%`; }).join(",");
  return (
    <div className="row" style={{ justifyContent: "flex-start", gap: 24 }}>
      <div className="donut" style={{ background: tot ? `conic-gradient(${stops})` : "#e5e7eb" }} />
      <div>{data.map((d) => <div key={d.k} style={{ fontSize: 14, marginBottom: 6 }}><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: RCOL[d.k], marginRight: 8 }} />{d.k}: <b>{d.v}</b></div>)}</div>
    </div>
  );
}
function Radar({ data }) {
  const n = data.length, cx = 150, cy = 130, R = 90;
  const pt = (i, v) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [cx + ((R * v) / 10) * Math.cos(a), cy + ((R * v) / 10) * Math.sin(a)]; };
  if (n < 3) return null;
  return (
    <svg viewBox="0 0 300 260" style={{ width: "100%", maxWidth: 380 }}>
      {[2, 4, 6, 8, 10].map((g) => <polygon key={g} fill="none" stroke="#e0e3ff" points={data.map((_, i) => pt(i, g).join(",")).join(" ")} />)}
      <polygon fill="rgba(99,102,241,.25)" stroke="#6366f1" strokeWidth="2.5" points={data.map((d, i) => pt(i, d.v).join(",")).join(" ")} />
      {data.map((d, i) => { const [x, y] = pt(i, 11.9); return <text key={i} x={x} y={y} fontSize="8" textAnchor="middle" fill="#1e1b4b">{d.k.split(/[ /&(]/)[0]}</text>; })}
    </svg>
  );
}
const TIPS_HARD = ["Revise the core concepts of {s} and write short notes", "Practice {s} daily with small hands-on exercises (30-45 min)", "Build a mini project using {s} and upload it to GitHub", "Solve interview-style questions on {s}", "Follow a structured course or the official documentation for {s}", "Give a mock interview focused on {s} and review the mistakes", "Read best practices and real-world examples of {s}"];
const TIPS_SOFT = ["Practice {s} through mock interviews and group discussions", "Ask a mentor or friend for feedback on your {s}", "Read or watch short lessons on improving {s}", "Record yourself and review your {s}", "After every interaction, reflect on how to improve your {s}", "Set a small weekly goal to improve {s}"];
const LOW = 6;
function RatingInput({ label, value, comment, tips = [], soft, disabled, onChange }) {
  const opts = (soft ? TIPS_SOFT : TIPS_HARD).map((t) => t.replaceAll("{s}", label));
  const toggle = (t) => onChange({ tips: tips.includes(t) ? tips.filter((x) => x !== t) : [...tips, t] });
  return (
    <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px dashed #e5e7ff" }}>
      <div className="row"><b>{label}</b><span style={{ color: value ? bandColor(value) : "#9ca3af", fontWeight: 700 }}>{value ? `${value}/10 - ${band(value)}` : "Not rated"}</span></div>
      <div className="nums" role="radiogroup" aria-label={`${label} rating`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} disabled={disabled} onClick={() => onChange(n > LOW ? { score: n, tips: [] } : { score: n })}
            style={value === n ? { background: bandColor(n), color: "#fff", borderColor: bandColor(n), transform: "scale(1.1)" } : {}}>{n}</button>
        ))}
      </div>
      {value > 0 && value <= LOW && (
        <div style={{ margin: "6px 0 10px", padding: 12, background: "#f5f3ff", borderRadius: 12 }}>
          <b style={{ fontSize: 13, color: "#5b21b6" }}>💡 How can the candidate improve {label}? Select tips (they go in the email)</b>
          {opts.map((t) => <label key={t} style={{ display: "block", fontSize: 13, marginTop: 6 }}><input type="checkbox" disabled={disabled} checked={tips.includes(t)} onChange={() => toggle(t)} /> {t}</label>)}
        </div>
      )}
      <input className="in" disabled={disabled} placeholder="Internal comment (optional, never sent to candidate)" value={comment || ""} onChange={(e) => onChange({ comment: e.target.value })} />
    </div>
  );
}

/* ================= pages ================= */
function Dashboard({ toast }) {
  const [d, setD] = useState(null);
  useEffect(() => { api("/dashboard").then(setD).catch((e) => toast(e.message, true)); }, []); // eslint-disable-line
  if (!d) return <p>Loading dashboard...</p>;
  const t = d.totals, mx = Math.max(10, ...d.trend.map((x) => x.score));
  const stats = [["👥", "Total candidates", t.candidates, "linear-gradient(135deg,#6366f1,#8b5cf6)"], ["📅", "Interviews this week", t.interviews_week, "linear-gradient(135deg,#0ea5e9,#6366f1)"],
    ["✅", "Evaluations done", t.completed, "linear-gradient(135deg,#10b981,#059669)"], ["⏳", "Pending", t.pending, "linear-gradient(135deg,#f59e0b,#f97316)"], ["⭐", "Average score", t.avg_overall ?? "-", "linear-gradient(135deg,#ec4899,#a855f7)"]];
  return (
    <>
      <div className="grid g5" style={{ marginBottom: 16 }}>{stats.map(([i, l, v, bg]) => <div key={l} className="stat" style={{ background: bg }}><i>{i}</i><b>{v}</b><small>{l}</small></div>)}</div>
      <div className="grid g2">
        <div className="card"><h3>Recommendation distribution</h3><Donut data={RECS.map((k) => ({ k, v: d.recs[k] }))} /></div>
        <div className="card"><h3>Average hard vs soft skills</h3><Bar label="Hard skills" v={d.avg.hard} /><Bar label="Soft skills" v={d.avg.soft} color="linear-gradient(90deg,#10b981,#0ea5e9)" /></div>
        <div className="card"><h3>Domain-wise performance</h3>{d.domains.length ? d.domains.map((x) => <Bar key={x.name} label={x.name} v={x.avg} />) : <p>No evaluations yet.</p>}</div>
        <div className="card"><h3>Recent evaluation trend</h3>
          {d.trend.length ? <div className="col">{d.trend.map((x, i) => <div key={i}><b>{x.score}</b><span style={{ height: `${(x.score / mx) * 110}px` }} />{x.name}</div>)}</div> : <p>No evaluations yet.</p>}</div>
      </div>
    </>
  );
}

const emptyForm = { name: "", email: "", phone: "", applied_role: "", domain_id: "", interview_date: new Date().toISOString().slice(0, 10), interview_round: "Round 1", experience_level: "", resume_url: "", linkedin_url: "", github_url: "", status: "Scheduled" };

function Candidates({ me, toast }) {
  const [list, setList] = useState([]);
  const [domains, setDomains] = useState([]);
  const [form, setForm] = useState(null);
  const [q, setQ] = useState(""); const [fs, setFs] = useState(""); const [fd, setFd] = useState(""); const [fr, setFr] = useState("");
  const load = useCallback(() => Promise.all([api("/candidates"), api("/domains")]).then(([c, d]) => { setList(c); setDomains(d); }).catch((e) => toast(e.message, true)), []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  const open = async (c) => {
    if (!me.trim()) return toast("Enter your interviewer name at the top first", true);
    try { const e = await api("/evaluations", "POST", { candidate_id: c.id, interviewer: me.trim() }); location.hash = `#/evaluate/${e.id}`; } catch (er) { toast(er.message, true); }
  };
  const save = async () => { try { await api("/candidates", "POST", form); setForm(null); toast("Candidate added"); load(); } catch (e) { toast(e.message, true); } };
  const F = (k, ph, type = "text") => <input className="in" type={type} placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />;
  const rows = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && (!fs || c.status === fs) && (!fd || c.domain === fd) && (!fr || c.recommendation === fr));
  return (
    <>
      <div className="card"><div className="grid gf">
        <input className="in" placeholder="Search name" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="in" value={fd} onChange={(e) => setFd(e.target.value)}><option value="">All domains</option>{domains.map((d) => <option key={d.id}>{d.name}</option>)}</select>
        <select className="in" value={fs} onChange={(e) => setFs(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="in" value={fr} onChange={(e) => setFr(e.target.value)}><option value="">All recommendations</option>{RECS.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="row" style={{ marginTop: 12 }}><button className="btn p" onClick={() => setForm(emptyForm)}>+ Add candidate</button><a className="btn" href={(import.meta.env.VITE_API_URL || "") + "/api/export.csv"}>⬇ Export Excel (CSV)</a></div></div>
      {form && (
        <div className="card"><h3>New candidate</h3><div className="grid gf">
          {F("name", "Full name *")}{F("email", "Email *", "email")}{F("phone", "Phone")}{F("applied_role", "Applied role *")}
          <select className="in" value={form.domain_id} onChange={(e) => setForm({ ...form, domain_id: e.target.value })}><option value="">Interview domain *</option>{domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          {F("interview_date", "", "date")}{F("interview_round", "Interview round")}{F("experience_level", "Experience level")}{F("resume_url", "Resume URL")}{F("linkedin_url", "LinkedIn URL")}{F("github_url", "GitHub URL")}
          <select className="in" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div><div style={{ marginTop: 14 }}><button className="btn p" onClick={save}>Save candidate</button> <button className="btn" onClick={() => setForm(null)}>Cancel</button></div></div>
      )}
      <div className="card scroll">
        {rows.length === 0 ? <p>No candidates found.</p> : (
          <table><thead><tr><th>Candidate</th><th>Role</th><th>Domain</th><th>Date</th><th>Status</th><th>Overall</th><th>Recommendation</th><th></th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}><td><b>{c.name}</b><div style={{ fontSize: 12, color: "#6b7280" }}>{c.email}</div></td><td>{c.applied_role}</td><td>{c.domain}</td><td>{c.interview_date}</td>
                <td><span className="pill">{c.status}</span></td><td><b>{c.overall ?? "-"}</b></td>
                <td>{c.recommendation ? <span className="pill" style={{ background: RCOL[c.recommendation] + "22", color: RCOL[c.recommendation] }}>{c.recommendation}</span> : "-"}</td>
                <td><button className="btn p" onClick={() => open(c)}>{c.evaluation_id ? "Open" : "Evaluate"}</button></td></tr>))}</tbody></table>
        )}
      </div>
    </>
  );
}

function Evaluate({ id, toast }) {
  const [d, setD] = useState(null); const [v, setV] = useState({}); const [rec, setRec] = useState(""); const [rem, setRem] = useState(""); const [share, setShare] = useState(false); const [busy, setBusy] = useState(false);
  const apply = useCallback((x) => { setD(x); setV(x.ratings); setRec(x.recommendation); setRem(x.final_remarks); setShare(x.share_remarks); }, []);
  const load = useCallback(() => api(`/evaluations/${id}`).then(apply).catch((e) => toast(e.message, true)), [id, apply]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  if (!d) return <p>Loading...</p>;
  const locked = d.status === "SUBMITTED", w = d.weights;
  const avg = (l) => mean(l.map((k) => v[k.id]?.score).filter(Boolean));
  const hs = avg(d.hard_skills), ss = avg(d.soft_skills), overall = (hs * w.hard + ss * w.soft) / 100;
  const all = [...d.hard_skills, ...d.soft_skills], done = all.filter((k) => v[k.id]?.score).length;
  const payload = () => ({ ratings: Object.entries(v).filter(([, x]) => x.score).map(([k, x]) => ({ skill_id: +k, score: x.score, comment: x.comment || "", tips: x.tips || [] })), recommendation: rec, final_remarks: rem, share_remarks: share });
  const run = async (fn, msg) => { setBusy(true); try { const r = await fn(); toast(typeof msg === "function" ? msg(r) : msg); await load(); } catch (e) { toast(e.message, true); await load(); } finally { setBusy(false); } };
  const submit = () => {
    if (done < all.length) return toast(`Rate all skills first (${done}/${all.length} done)`, true);
    if (!rec) return toast("Select a recommendation", true);
    if (!confirm("Submit and lock this evaluation?")) return;
    run(async () => { await api(`/evaluations/${id}`, "PUT", payload()); await api(`/evaluations/${id}/submit`, "POST"); }, "Evaluation Submitted Successfully ✔");
  };
  const mail = (resend) => run(() => api(`/evaluations/${id}/send-result-email${resend ? "?resend=true" : ""}`, "POST"), "📧 Emails sent to candidate and admin");
  const sent = d.email.candidate && d.email.admin;
  const section = (title, list, soft = false) => (
    <div className="card"><h3>{title}</h3>{list.map((k) => <RatingInput key={k.id} label={k.name} value={v[k.id]?.score} comment={v[k.id]?.comment} tips={v[k.id]?.tips || []} soft={soft} disabled={locked} onChange={(p) => setV({ ...v, [k.id]: { ...v[k.id], ...p } })} />)}</div>
  );
  const c = d.candidate, ins = d.insights;
  return (
    <>
      <a className="btn" href="#/candidates">← Back to candidates</a>
      <div className="card" style={{ marginTop: 14, background: "linear-gradient(120deg,#fff,#eef0ff)" }}>
        <h2 style={{ margin: 0 }}>{c.name}</h2><div style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 10px" }}>{c.email} · {c.applied_role} · {c.interview_round} · Interviewer: {d.interviewer}</div>
        <span className="pill">Domain: {c.domain}</span> <span className="pill">{d.status}</span></div>
      {locked && <div className="card" style={{ color: "#b45309", background: "#fffbeb" }}>🔒 This evaluation is locked. <button className="btn" onClick={() => confirm("Unlock evaluation?") && run(() => api(`/evaluations/${id}/unlock`, "POST"), "Unlocked")}>Admin unlock</button></div>}
      <div className="row" style={{ marginBottom: 16, alignItems: "stretch" }}>
        <div className="sc" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}><b>{hs ? hs.toFixed(1) : "-"}</b>Hard Skills</div>
        <div className="sc" style={{ background: "linear-gradient(135deg,#10b981,#0ea5e9)" }}><b>{ss ? ss.toFixed(1) : "-"}</b>Soft Skills</div>
        <div className="sc" style={{ background: "linear-gradient(135deg,#ec4899,#f97316)" }}><b>{overall ? overall.toFixed(1) : "-"}</b>Overall ({w.hard}/{w.soft})</div>
        <div className="card" style={{ flex: 2, minWidth: 260, margin: 0, display: "grid", placeItems: "center" }}><Radar data={d.hard_skills.map((k) => ({ k: k.name, v: v[k.id]?.score || 0 }))} /></div>
      </div>
      {ins && <div className="card" style={{ background: "linear-gradient(120deg,#f5f3ff,#fdf2f8)" }}><h3>🤖 Smart insights</h3>
        <p style={{ margin: "0 0 6px" }}>{ins.percentile !== null ? `Scored higher than ${ins.percentile}% of ${ins.peers} other candidate(s) in this domain.` : "No other candidates in this domain to compare yet."}</p>
        <p style={{ margin: "0 0 6px" }}><b style={{ color: "#059669" }}>Strengths:</b> {ins.strengths.join(", ") || "-"}</p><p style={{ margin: 0 }}><b style={{ color: "#dc2626" }}>Areas to improve:</b> {ins.improve.join(", ") || "-"}</p></div>}
      {section(`Hard Skills · ${c.domain}`, d.hard_skills)}{section("Soft Skills", d.soft_skills, true)}
      <div className="card"><h3>Recommendation and remarks</h3>
        <select className="in" disabled={locked} value={rec} onChange={(e) => setRec(e.target.value)}><option value="">Select recommendation (your decision)</option>{RECS.map((r) => <option key={r}>{r}</option>)}</select>
        <textarea className="in" style={{ marginTop: 10, minHeight: 90 }} disabled={locked} placeholder="Final remarks" value={rem} onChange={(e) => setRem(e.target.value)} />
        <label style={{ fontSize: 14, display: "block", marginTop: 10 }}><input type="checkbox" disabled={locked} checked={share} onChange={(e) => setShare(e.target.checked)} /> Include final remarks in the candidate email</label></div>
      <div className="row" style={{ justifyContent: "flex-start" }}>
        {!locked && <button className="btn" disabled={busy} onClick={() => run(() => api(`/evaluations/${id}`, "PUT", payload()), "Draft saved")}>💾 Save draft</button>}
        {!locked && <button className="btn p" disabled={busy} onClick={submit}>Submit evaluation ({done}/{all.length})</button>}
        <button className="btn p" disabled={!locked || busy || sent} onClick={() => mail(false)}>📧 Send Result Email</button>
        {sent && <><span className="pill">Email already sent</span><button className="btn" disabled={busy} onClick={() => confirm("Send again?") && mail(true)}>Resend</button></>}
      </div>
    </>
  );
}

function Compare({ toast }) {
  const [list, setList] = useState([]); const [sel, setSel] = useState([]); const [res, setRes] = useState([]);
  useEffect(() => { api("/candidates").then(setList).catch((e) => toast(e.message, true)); }, []); // eslint-disable-line
  useEffect(() => { if (sel.length) api(`/compare?ids=${sel.join(",")}`).then(setRes).catch((e) => toast(e.message, true)); else setRes([]); }, [sel]); // eslint-disable-line
  const softKeys = [...new Set(res.flatMap((r) => Object.keys(r.soft_skills)))];
  const metric = (label, f) => <tr><td><b>{label}</b></td>{res.map((r) => <td key={r.id}>{f(r)}</td>)}</tr>;
  const sc = (x) => (x == null ? "-" : <div style={{ minWidth: 110 }}><b>{x}</b><div className="bar"><div style={{ width: `${x * 10}%` }} /></div></div>);
  return (
    <>
      <div className="card"><h3>Select candidates to compare</h3><div className="row" style={{ justifyContent: "flex-start" }}>
        {list.map((c) => <button key={c.id} className={`chip ${sel.includes(c.id) ? "on" : ""}`} onClick={() => setSel(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])}>{c.name}</button>)}</div></div>
      {res.length > 0 && <div className="card scroll"><table><thead><tr><th></th>{res.map((r) => <th key={r.id}>{r.name}</th>)}</tr></thead><tbody>
        {metric("Domain", (r) => r.domain)}{metric("Interview round", (r) => r.round)}{metric("Evaluations done", (r) => r.rounds_done)}
        {metric("Hard skill score", (r) => sc(r.hard))}{metric("Soft skill score", (r) => sc(r.soft))}{metric("Overall score", (r) => sc(r.overall))}{metric("Recommendation", (r) => r.recommendation)}
        {softKeys.map((k) => metric(k, (r) => sc(r.soft_skills[k])))}</tbody></table>
        <p style={{ fontSize: 12, color: "#6b7280" }}>Internal comparison only. The dashboard does not pick a winner.</p></div>}
    </>
  );
}

function Settings({ toast }) {
  const [w, setW] = useState({ hard: 70, soft: 30 }); const [domains, setDomains] = useState([]); const [dom, setDom] = useState(""); const [name, setName] = useState("");
  const load = useCallback(() => Promise.all([api("/settings"), api("/domains")]).then(([s, d]) => { setW(s); setDomains(d); setDom((x) => x || d[0]?.id); }).catch((e) => toast(e.message, true)), []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  const cur = domains.find((d) => d.id === +dom);
  const act = (fn, msg) => async () => { try { await fn(); toast(msg); load(); } catch (e) { toast(e.message, true); } };
  return (
    <div className="grid g2">
      <div className="card"><h3>Scoring weights</h3><p style={{ color: "#6b7280", fontSize: 14 }}>Overall = Hard × {w.hard}% + Soft × {w.soft}%</p>
        <input type="range" min="0" max="100" value={w.hard} style={{ width: "100%" }} onChange={(e) => setW({ hard: +e.target.value, soft: 100 - e.target.value })} />
        <div className="row"><b>Hard {w.hard}%</b><b>Soft {w.soft}%</b></div><br />
        <button className="btn p" onClick={act(() => api("/settings", "PUT", w), "Weights saved")}>Save weights</button></div>
      <div className="card"><h3>Domain hard skills</h3>
        <select className="in" value={dom} onChange={(e) => setDom(e.target.value)}>{domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <div style={{ margin: "12px 0", display: "flex", flexWrap: "wrap", gap: 8 }}>{cur?.skills.map((s) => <span key={s.id} className="pill">{s.name} <a href="#/settings" style={{ color: "#dc2626", textDecoration: "none" }} onClick={act(() => api(`/skills/${s.id}`, "DELETE"), "Skill removed")}>✕</a></span>)}</div>
        <div className="row" style={{ flexWrap: "nowrap" }}><input className="in" placeholder="New skill name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn p" onClick={act(async () => { await api("/skills", "POST", { domain_id: +dom, name }); setName(""); }, "Skill added")}>Add</button></div></div>
    </div>
  );
}

/* ================= shell ================= */
export default function App() {
  const [page, arg] = useHash();
  const [me, setMe] = useState(() => localStorage.getItem("ar_me") || "");
  const [msg, setMsg] = useState(null);
  useEffect(() => { localStorage.setItem("ar_me", me); }, [me]);
  const toast = useCallback((text, err) => { setMsg({ text, err }); setTimeout(() => setMsg(null), 5000); }, []);
  const nav = [["dashboard", "📊", "Dashboard"], ["candidates", "👥", "Candidates"], ["compare", "⚖️", "Compare"], ["settings", "⚙️", "Settings"]];
  const active = page === "evaluate" ? "candidates" : page;
  const title = { dashboard: "Dashboard", candidates: "Candidates", evaluate: "Interview Evaluation", compare: "Compare Candidates", settings: "Settings" }[page] || "Dashboard";
  return (
    <>
      <style>{CSS}</style>
      <aside className="side"><div className="brand">Ai <span>Rojgar</span></div><nav className="nav">{nav.map(([k, i, l]) => <a key={k} href={`#/${k}`} className={active === k ? "on" : ""}><span>{i}</span>{l}</a>)}</nav></aside>
      <main className="main">
        <div className="top"><h1>{title}</h1><div className="who">Interviewer <input placeholder="Your name" value={me} onChange={(e) => setMe(e.target.value)} /></div></div>
        {page === "candidates" && <Candidates me={me} toast={toast} />}
        {page === "evaluate" && <Evaluate id={arg} toast={toast} key={arg} />}
        {page === "compare" && <Compare toast={toast} />}
        {page === "settings" && <Settings toast={toast} />}
        {!["candidates", "evaluate", "compare", "settings"].includes(page) && <Dashboard toast={toast} />}
      </main>
      {msg && <div className={`toast ${msg.err ? "err" : ""}`} role="status">{msg.text}</div>}
    </>
  );
}
