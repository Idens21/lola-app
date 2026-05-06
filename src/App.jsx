import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

const COLORS = {
  // ── Nieuw palet (fig / terra / bone) ───────────────────
  bone:          "#F4ECDD",   // achtergrond
  boneWarm:      "#EBDFC8",   // kaart achtergrond
  fig:           "#5C2A3E",   // primair
  figDark:       "#3A1727",   // donker primair
  figLight:      "#F2E8EC",   // lichte tint
  figBorder:     "#DCC4CC",   // rand
  terra:         "#B8633F",   // accent 2
  terraLight:    "#F5E8E0",   // licht terra
  terraBorder:   "#DEB9A0",   // terra rand
  gold:          "#9B7A3F",   // goud
  goldSoft:      "#C4A876",   // zacht goud
  ink:           "#1A0D14",   // donkere tekst
  inkSoft:       "#3A2530",   // zachtere inkt
  gray:          "#6B5B5B",   // muted tekst
  white:         "#FFFFFF",
  softGreen:     "#EAF4EE",
  softGreenBorder: "#C4DDC8",

  // ── Achterwaartse compatibiliteit (oude namen → nieuwe waarden)
  cream:         "#F4ECDD",
  rose:          "#5C2A3E",
  roseDark:      "#3A1727",
  roseLight:     "#F2E8EC",
  roseBorder:    "#DCC4CC",
  lavender:      "#F5E8E0",
  lavenderBorder:"#DEB9A0",
  text:          "#1A0D14",
  muted:         "#6B5B5B",
};

const PHASES = [
  { name: "Menstruatie", days: "Dag 1–5",  color: "#5C2A3E", label: "Ongesteld", tip: "Je lichaam verdient rust vandaag. Zacht bewegen is genoeg." },
  { name: "Folliculair", days: "Dag 6–13", color: "#9B7A3F", label: "Opbouwen", tip: "Je energie komt terug. Goed moment voor nieuwe dingen." },
  { name: "Ovulatoir",   days: "Dag 14–16",color: "#B8633F", label: "Piek",      tip: "Je bent op je sterkst. Gebruik die energie bewust." },
  { name: "Luteaal",     days: "Dag 17–28",color: "#3A1727", label: "Afschalen", tip: "Meer naar binnen. Warmte, rust en zachtheid mogen nu." },
];

// ── LOLA SYMBOOL (vrouwelijk figuur, één doorlopende lijn) ─
function LolaSymbol({ size = 32, color = COLORS.fig, strokeWidth = 2 }) {
  const scale = size / 220;
  return (
    <svg
      width={size * (180/220)}
      height={size}
      viewBox="0 0 180 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 90 20
           C 78 22, 72 32, 78 42
           C 84 50, 92 50, 92 50
           C 92 60, 82 65, 76 78
           C 70 90, 72 105, 80 115
           C 70 125, 62 140, 65 158
           C 67 172, 75 185, 78 200
           C 79 210, 82 215, 85 215
           L 95 215
           C 98 215, 101 210, 102 200
           C 105 185, 113 172, 115 158
           C 118 140, 110 125, 100 115
           C 108 105, 110 90, 104 78
           C 98 65, 88 60, 88 50
           C 88 50, 96 50, 102 42
           C 108 32, 102 22, 90 20 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── LOLA LOGO (symbool + wordmark) ────────────────────────
function LolaLogo({ size = "md", variant = "default" }) {
  const configs = {
    sm: { symbolSize: 18, fontSize: 20, gap: 6 },
    md: { symbolSize: 24, fontSize: 26, gap: 8 },
    lg: { symbolSize: 36, fontSize: 40, gap: 10 },
    xl: { symbolSize: 56, fontSize: 64, gap: 14 },
  };
  const cfg = configs[size] || configs.md;
  const isDark = variant === "dark";   // fig achtergrond, bone tekst
  const symbolColor = isDark ? COLORS.bone : COLORS.fig;
  const textColor   = isDark ? COLORS.bone : COLORS.fig;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: cfg.gap }}>
      <LolaSymbol size={cfg.symbolSize} color={symbolColor} strokeWidth={1.8} />
      <span style={{
        fontFamily: "'Italiana', serif",
        fontSize: cfg.fontSize,
        letterSpacing: "0.08em",
        lineHeight: 1,
        color: textColor,
        fontWeight: 400,
        userSelect: "none",
      }}>
        LOLA
      </span>
    </div>
  );
}

function getCycleInfoForDate(lastperiod, cyclelength, date) {
  if (!lastperiod) return { day: null, phase: PHASES[3] };
  let avgLength = 28;
  if (cyclelength === "Korter dan 25 dagen") avgLength = 24;
  else if (cyclelength === "25–28 dagen") avgLength = 26;
  else if (cyclelength === "28–32 dagen") avgLength = 30;
  else if (cyclelength === "Langer dan 32 dagen") avgLength = 35;
  const start = new Date(lastperiod);
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((target - start) / 86400000);
  if (diffDays < 0) return { day: null, phase: PHASES[3] };
  const cycleDay = (diffDays % avgLength) + 1;
  let phase;
  if (cycleDay <= 5) phase = PHASES[0];
  else if (cycleDay <= 13) phase = PHASES[1];
  else if (cycleDay <= 16) phase = PHASES[2];
  else phase = PHASES[3];
  return { day: cycleDay, phase };
}

function getCycleInfo(lastperiod, cyclelength) {
  return getCycleInfoForDate(lastperiod, cyclelength, new Date());
}

function useSpeech(onResult) {
  const [listening, setListening] = useState(false);
  const supported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  function startListening() {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "nl-NL";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => onResult(e.results[0][0].transcript);
    rec.start();
  }

  return { listening, startListening, supported };
}

function MicButton({ onResult, style = {} }) {
  const [input, setInput] = useState("");
  const { listening, startListening, supported } = useSpeech((text) => onResult(text));
  if (!supported) return null;
  return (
    <button onClick={startListening} disabled={listening} style={{ width: 44, height: 44, borderRadius: "50%", background: listening ? COLORS.rose : COLORS.roseLight, border: `1px solid ${COLORS.roseBorder}`, color: listening ? COLORS.white : COLORS.rose, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", ...style }}>
      {listening ? "⏸" : "🎤"}
    </button>
  );
}

function getCyclePrediction(lastperiod, cyclelength) {
  if (!lastperiod) return null;
  let avgLength = 28;
  if (cyclelength === "Korter dan 25 dagen") avgLength = 24;
  else if (cyclelength === "25–28 dagen") avgLength = 26;
  else if (cyclelength === "28–32 dagen") avgLength = 30;
  else if (cyclelength === "Langer dan 32 dagen") avgLength = 35;

  const start = new Date(lastperiod);
  start.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today - start) / 86400000);
  const cycleDay = (daysSince % avgLength) + 1;
  const daysUntilNext = avgLength - cycleDay + 1;
  const nextPeriod = new Date(today.getTime() + daysUntilNext * 86400000);

  // Komende fase-overgangen
  const transitions = [];
  const phaseBreaks = [
    { day: 1,  name: "Menstruatie", color: "#E8A0B4" },
    { day: 6,  name: "Folliculair",  color: "#A0C4E8" },
    { day: 14, name: "Ovulatoir",    color: "#A0E8C4" },
    { day: 17, name: "Luteaal",      color: "#C4748A" },
  ];
  for (const pb of phaseBreaks) {
    const daysUntil = pb.day - cycleDay;
    if (daysUntil > 0 && daysUntil <= 14) {
      const date = new Date(today.getTime() + daysUntil * 86400000);
      transitions.push({ name: pb.name, color: pb.color, daysUntil, date });
    }
  }

  return { nextPeriod, daysUntilNext, avgLength, transitions };
}

const WAKE_MOODS = ["😴", "😔", "😐", "🙂", "✨"];
const WAKE_LABELS = ["Zwaar", "Moeizaam", "Oké", "Fris", "Uitgerust"];
const DAILY_THOUGHT = "Wat als de vermoeidheid die je voelt geen zwakte is, maar een signaal dat je iets nodig hebt wat je jezelf nog niet gegund hebt?";

function getZodiac(birthdate) {
  if (!birthdate) return null;
  const [, m, d] = birthdate.split("-").map(Number);
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Ram ♈";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Stier ♉";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "Tweelingen ♊";
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "Kreeft ♋";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Leeuw ♌";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Maagd ♍";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "Weegschaal ♎";
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "Schorpioen ♏";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Boogschutter ♐";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Steenbok ♑";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Waterman ♒";
  return "Vissen ♓";
}

function generateLolaObservation(checkin, recentCheckins, cycleDay, phase) {
  const MOODS = ["Zwaar", "Moeizaam", "Oké", "Fris", "Uitgerust"];
  const lowEnergyStreak = recentCheckins.filter(c => c.energy <= 2).length;
  const name = "";

  if (checkin) {
    if (checkin.energy <= 2 && lowEnergyStreak >= 3)
      return `Je energie is al ${lowEnergyStreak} dagen laag. In de ${phase.name.toLowerCase()} fase is dat niet raar — maar je lichaam vraagt duidelijk iets. Wat geef je jezelf vandaag?`;
    if (checkin.slept === "<5 uur" || checkin.slept === "5–6 uur")
      return `Je hebt kort geslapen. Dat kleurt de rest van de dag — wees zacht voor jezelf als het lastiger gaat dan normaal.`;
    if (checkin.energy >= 4)
      return `Je energie is goed vandaag ✦ ${phase.name === "Ovulatoir" ? "Perfect moment om zichtbaar te zijn en dingen te bewegen." : "Mooie dag om iets te doen dat echt telt voor jou."}`;
    if (checkin.intention)
      return `Je intentie voor vandaag: "${checkin.intention}". Ik houd dat voor je vast.`;
  }

  if (cycleDay) {
    if (cycleDay <= 5) return "Je zit in je menstruatiefase. Rust is nu productief — echt.";
    if (cycleDay >= 12 && cycleDay <= 16) return "Je bent rond je ovulatie. Je energie en helderheid zijn nu op hun piek — gebruik dat.";
    if (cycleDay >= 24) return `Dag ${cycleDay} van je cyclus. Je luteale fase vraagt meer van je — plan minder, voel meer.`;
  }

  return "Ik ben er. Hoe is het met je vandaag?";
}

const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY;
// ── AUTH SCREEN ───────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 16,
    border: `1.5px solid ${COLORS.roseBorder}`, background: COLORS.white,
    color: COLORS.text, fontSize: 14, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", marginTop: 6,
  };

  async function handleAuth() {
    setLoading(true);
    setError("");
    setSuccess("");
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess("Check je e-mail voor een bevestigingslink!");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onAuth(data.user);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}><LolaSymbol size={28} color={COLORS.fig} /></div>
        <h2 style={{ fontSize: 28, fontWeight: 500, color: COLORS.text, marginBottom: 8, letterSpacing: "-0.02em" }}>
          {mode === "login" ? "Welkom terug." : "Begin hier."}
        </h2>
        <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.7 }}>
          {mode === "login" ? "Log in om verder te gaan met Lola." : "Maak een account aan voor jouw persoonlijke Lola."}
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>E-mailadres</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jouw@email.com" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>Wachtwoord</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimaal 6 tekens" style={inputStyle} onKeyDown={e => e.key === "Enter" && handleAuth()} />
      </div>

      {error && <div style={{ background: "#FEE8E8", border: "1px solid #F4ABAB", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#C0392B", marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: COLORS.softGreen, border: `1px solid ${COLORS.softGreenBorder}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#2D7A4F", marginBottom: 16 }}>{success}</div>}

      <button onClick={handleAuth} disabled={loading} style={{ padding: "15px", borderRadius: 24, background: loading ? COLORS.roseBorder : COLORS.rose, border: "none", color: COLORS.white, fontSize: 15, fontWeight: 500, cursor: loading ? "default" : "pointer", fontFamily: "inherit", marginBottom: 12 }}>
        {loading ? "..." : mode === "login" ? "Inloggen →" : "Account aanmaken →"}
      </button>

      <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }} style={{ padding: "12px", borderRadius: 24, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        {mode === "login" ? "Nog geen account? Registreer hier" : "Al een account? Log in"}
      </button>
    </div>
  );
}

// ── AI HELPER ─────────────────────────────────────────────
async function askLola(messages, systemPrompt) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "...";
}

// ── SHARED UI ─────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: 20, border: `0.5px solid ${COLORS.roseBorder}`, padding: "16px 18px", ...style }}>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}
function ProgressBar({ value, max }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>
        <span>{value} / {max}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 6, background: COLORS.roseLight, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: COLORS.rose, borderRadius: 10, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}
function NavBar({ active, onChange }) {
  const items = [
    {
      id: "lola",
      label: "Lola",
      icon: (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
          <LolaSymbol size={18} color="currentColor" strokeWidth={2.2} />
        </div>
      ),
    },
    {
      id: "home",
      label: "Vandaag",
      icon: (
        <svg viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 7v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "loggen",
      label: "Loggen",
      icon: (
        <svg viewBox="0 0 22 22" fill="none">
          <rect x="4" y="4" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "history",
      label: "Inzichten",
      icon: (
        <svg viewBox="0 0 22 22" fill="none">
          <path d="M4 16l4-5 3 3 3-4 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Ik",
      icon: (
        <svg viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: COLORS.bone,
      borderTop: `0.5px solid ${COLORS.figBorder}`,
      display: "flex", justifyContent: "space-around",
      padding: "10px 0 env(safe-area-inset-bottom, 20px)",
      zIndex: 100,
    }}>
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              color: isActive ? COLORS.fig : COLORS.gray,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10, fontWeight: isActive ? 600 : 400,
              padding: "4px 8px", transition: "color 0.15s",
            }}
          >
            <div style={{ width: 22, height: 22 }}>{item.icon}</div>
            <span style={{ letterSpacing: isActive ? "0.02em" : 0 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── INTAKE FASE 1: FEITEN FORMULIER ───────────────────────
function IntakeFacts({ onDone, onSkip }) {
  const [form, setForm] = useState({ name: "", birthdate: "", birthtime: "", birthplace: "", lastperiod: "", cyclelength: "28–32 dagen", hdtype: "" });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 16,
    border: `1.5px solid ${COLORS.roseBorder}`, background: COLORS.white,
    color: COLORS.text, fontSize: 14, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", marginTop: 6,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}><LolaSymbol size={28} color={COLORS.fig} /></div>
        <h2 style={{ fontSize: 28, fontWeight: 500, color: COLORS.text, marginBottom: 8, letterSpacing: "-0.02em" }}>Hoi, ik ben Lola.</h2>
        <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.7 }}>Voordat we echt kennismaken, heb ik een paar feiten nodig. Daarna gaan we het gesprek aan.</p>
      </div>

      {[
        { key: "name", label: "Hoe mag ik je noemen?", type: "text", placeholder: "Jouw naam" },
        { key: "birthdate", label: "Geboortedatum", type: "date" },
        { key: "birthtime", label: "Geboortetijd (zo exact mogelijk)", type: "time" },
        { key: "birthplace", label: "Geboorteplaats", type: "text", placeholder: "Stad, land" },
      ].map(({ key, label, type, placeholder }) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{label}</label>
          <input type={type} placeholder={placeholder} value={form[key]} onChange={(e) => set(key, e.target.value)} style={inputStyle} />
        </div>
      ))}

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>Human design type <span style={{ color: COLORS.muted, fontWeight: 400 }}>(als je het weet)</span></label>
        <select value={form.hdtype} onChange={(e) => set("hdtype", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
          <option value="">Ik weet het niet — Lola berekent het</option>
          <option>Manifestor</option>
          <option>Generator</option>
          <option>Manifesting Generator</option>
          <option>Projector</option>
          <option>Reflector</option>
        </select>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>Eerste dag laatste menstruatie</label>
        <input type="date" value={form.lastperiod} onChange={(e) => set("lastperiod", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>Gemiddelde cycluslengte</label>
        <select value={form.cyclelength} onChange={(e) => set("cyclelength", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
          {["Korter dan 25 dagen", "25–28 dagen", "28–32 dagen", "Langer dan 32 dagen", "Onregelmatig"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
<button onClick={onSkip} style={{ padding: "12px", borderRadius: 24, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 8, width: "100%" }}>
  → Sla intake over (testen)
</button>
<button onClick={() => form.name && onDone(form)} style={{ padding: "15px", borderRadius: 24, background: form.name ? COLORS.rose : COLORS.roseBorder, border: "none", color: COLORS.white, fontSize: 15, fontWeight: 500, cursor: form.name ? "pointer" : "default", fontFamily: "inherit" }}>
  Verder met het gesprek →
</button>
    </div>
  );
}

// ── INTAKE FASE 2: AI GESPREK ─────────────────────────────
const INTAKE_SYSTEM = (facts) => `Je bent Lola, een warme maar eerlijke persoonlijke levenscoach voor vrouwen. Je voert nu een intake-gesprek om een diep persoonlijkheidsportret op te bouwen.

Wat je al weet over deze persoon:
- Naam: ${facts.name}
- Geboortedatum: ${facts.birthdate}
- Geboorteplaats: ${facts.birthplace}
- Human design type: ${facts.hdtype || "onbekend, later te berekenen"}
- Cycluslengte: ${facts.cyclelength}

Jouw aanpak:
- Stel ALTIJD maar één vraag tegelijk
- Reageer kort op wat ze zegt voordat je de volgende vraag stelt
- Ga de diepte in — bij oppervlakkige antwoorden vraag je door
- Wees warm maar durf te spiegelen
- Behandel deze onderwerpen in een natuurlijke volgorde (niet rigide):
  1. Werk & levenssituatie — wat doe je, hoe voelt dat?
  2. Relaties — vriendschap, liefde, familie — waar loop je tegenaan?
  3. Hechtingsstijl — hoe reageer je als iemand dichterbij komt of zich terugtrekt?
  4. Patronen & triggers — wat herken je in jezelf dat je wilt veranderen?
  5. Kernovertuigingen — wat vertel je jezelf over wie je bent en wat je verdient?
  6. Waar kom je vandaan — niet trauma benoemen maar indirect vragen naar wat je hebt meegekregen
- Na 10–15 uitwisselingen sluit je af met een korte, persoonlijke reflectie

Toon: warm, direct, geen psychologisch jargon, alsof je praat met een slimme vriendin die ook coach is. Schrijf in het Nederlands. Houd je berichten kort — max 3 zinnen + één vraag.`;

function IntakeChat({ facts, onDone }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startConversation() {
    setLoading(true);
    const opening = await askLola(
      [{ role: "user", content: `Start het gesprek. Begroet me bij naam (${facts.name}) en stel je eerste vraag over mijn werk of leven.` }],
      INTAKE_SYSTEM(facts)
    );
    setMessages([{ from: "lola", text: opening }]);
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    const newMessages = [...messages, { from: "user", text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    const count = exchangeCount + 1;
    setExchangeCount(count);

    const apiMessages = newMessages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

    let prompt = INTAKE_SYSTEM(facts);
    if (count >= 12) {
      prompt += "\n\nJe hebt nu genoeg gehoord. Sluit het gesprek af met een persoonlijke, warme reflectie van 3–4 zinnen over wat je hebt gehoord. Eindig met: 'Ik ken je nu een stukje beter. Laten we samen aan de slag gaan.'";
    }

    const reply = await askLola(apiMessages, prompt);
    setMessages((prev) => [...prev, { from: "lola", text: reply }]);
    setLoading(false);

    if (count >= 13) {
      setTimeout(async () => {
        // Genereer persoonlijkheidsportret op basis van het gesprek + alle profieldata
        const zodiac = getZodiac(facts.birthdate);
        const age = facts.birthdate ? Math.floor((Date.now() - new Date(facts.birthdate)) / (365.25 * 86400000)) : null;
        const portraitPrompt = `Op basis van dit intakegesprek, schrijf een persoonlijk portret van ${facts.name} in de derde persoon. Schrijf warm, inzichtelijk en concreet — alsof je het aan een collega-coach vertelt die haar gaat begeleiden.

Verwerk hierin:
- Wie ze is: persoonlijkheid, energie, kernkwaliteiten
- Haar leefsituatie: werk, relaties, thuis
- Kernpatronen: wat herhaalt zich, wat houdt haar tegen
- Wat ze zoekt en nodig heeft
- Haar Human Design type (${facts.hdtype || "onbekend"}) en wat dat betekent voor hoe zij werkt en beslist
- Haar sterrenbeeld (${zodiac || "onbekend"}) als extra kleur
${age ? `- Ze is ${age} jaar` : ""}
${facts.birthplace ? `- Opgegroeid in/rond ${facts.birthplace}` : ""}

Schrijf in het Nederlands. Max 450 woorden. Geen kopjes, gewoon doorlopende tekst. Eindig niet met een vraag.`;

        const allMessages = newMessages.map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
        const portrait = await askLola(allMessages, portraitPrompt);
        onDone({ facts, conversation: newMessages, personality_profile: portrait });
      }, 3000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      <div style={{ padding: "16px 0 12px", borderBottom: `0.5px solid ${COLORS.roseBorder}`, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Lola intake gesprek</div>
        <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>Vertel eerlijk — alles blijft tussen jou en Lola</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "user" ? "flex-end" : "flex-start" }}>
            {msg.from === "lola" && <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 3, fontWeight: 500 }}>Lola</div>}
            <div style={{
              maxWidth: "85%", padding: "12px 16px", borderRadius: 20, fontSize: 14, lineHeight: 1.7,
              background: msg.from === "lola" ? COLORS.roseLight : COLORS.rose,
              color: msg.from === "lola" ? COLORS.text : COLORS.white,
              borderBottomLeftRadius: msg.from === "lola" ? 4 : 20,
              borderBottomRightRadius: msg.from === "user" ? 4 : 20,
              border: msg.from === "lola" ? `0.5px solid ${COLORS.roseBorder}` : "none",
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 3, fontWeight: 500 }}>Lola</div>
            <div style={{ background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, borderBottomLeftRadius: 4, padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.rose, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: `0.5px solid ${COLORS.roseBorder}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Typ je antwoord..."
          style={{ flex: 1, minWidth: 0, padding: "12px 16px", borderRadius: 24, border: `1px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
        />
        <MicButton onResult={(text) => setInput(prev => prev ? prev + " " + text : text)} />
        <button onClick={send} disabled={loading} style={{ width: 46, height: 46, borderRadius: "50%", background: loading ? COLORS.roseBorder : COLORS.rose, border: "none", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M8 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  );
}

// ── WELKOMST SCHERM ───────────────────────────────────────
function WelcomeScreen({ profile, onStart }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 24px", textAlign: "center", background: COLORS.bone }}>
      <div style={{ marginBottom: 24 }}><LolaSymbol size={56} color={COLORS.fig} /></div>
      <h1 style={{ fontFamily: "'Italiana', serif", fontSize: 48, fontWeight: 400, color: COLORS.fig, marginBottom: 8, letterSpacing: "0.04em" }}>
        Welkom,<br />{profile.facts.name}
      </h1>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 18, color: COLORS.inkSoft, lineHeight: 1.7, maxWidth: 340, marginBottom: 36 }}>
        Ik ken je nu een stukje beter.<br/>Jouw Lola is klaar.
      </p>
      <div style={{ background: COLORS.fig, borderRadius: 16, padding: "20px 24px", maxWidth: 360, marginBottom: 36, textAlign: "left" }}>
        <div style={{ fontSize: 10, color: COLORS.goldSoft, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Lola zegt</div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 18, color: COLORS.bone, lineHeight: 1.6, margin: 0 }}>
          "Je hebt jezelf vandaag een geschenk gegeven — de bereidheid om eerlijk te kijken. Dat is zeldzamer dan je denkt."
        </p>
      </div>
      <button onClick={onStart} style={{ background: COLORS.rose, color: COLORS.white, border: "none", borderRadius: 28, padding: "16px 40px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
        Open Lola →
      </button>
    </div>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────
function HomeScreen({ profile, onCheckin, onGoToLola, user, onPeriodLogged }) {
  const name = profile?.facts?.name || "liefste";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const todayLabel = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  const { day: cycleDay, phase } = getCycleInfo(profile?.facts?.lastperiod, profile?.facts?.cyclelength);

  const [loggingPeriod, setLoggingPeriod] = useState(false);
  const [periodLogged, setPeriodLogged] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [todayAvond, setTodayAvond] = useState(null);
  const [todayFood, setTodayFood] = useState([]);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) { setLoadingData(false); return; }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    Promise.all([
      supabase.from("checkins").select("*").eq("user_id", user.id)
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
        .eq("type", "ochtend").order("created_at", { ascending: false }).limit(1),
      supabase.from("checkins").select("*").eq("user_id", user.id)
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
        .eq("type", "avond").order("created_at", { ascending: false }).limit(1),
      supabase.from("food_logs").select("*").eq("user_id", user.id)
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("checkins").select("energy,slept,wake_mood,created_at").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(7),
    ]).then(([{ data: ci }, { data: ai }, { data: fl }, { data: rc }]) => {
      setTodayCheckin(ci?.[0] || null);
      setTodayAvond(ai?.[0] || null);
      setTodayFood(fl || []);
      setRecentCheckins(rc || []);
      setLoadingData(false);
    });
  }, [user]);

  async function logNewPeriod() {
    setLoggingPeriod(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    await supabase.from("profiles").update({ lastperiod: todayStr }).eq("id", user.id);
    setPeriodLogged(true);
    setLoggingPeriod(false);
    if (onPeriodLogged) onPeriodLogged(todayStr);
  }

  const kcal = todayFood.reduce((s, f) => s + (f.kcal || 0), 0);
  const protein = todayFood.reduce((s, f) => s + (f.protein || 0), 0);
  const carbs = todayFood.reduce((s, f) => s + (f.carbs || 0), 0);
  const fat = todayFood.reduce((s, f) => s + (f.fat || 0), 0);
  const lolaObs = generateLolaObservation(todayCheckin, recentCheckins, cycleDay, phase);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 300, color: COLORS.text, lineHeight: 1.2 }}>
            {greeting},<br /><span style={{ fontWeight: 600 }}>{name}.</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{todayLabel}</div>
        </div>
        <div style={{ fontSize: 24, color: COLORS.rose }}>✦</div>
      </div>

      <div style={{ background: COLORS.roseLight, borderRadius: 20, padding: "14px 18px", border: `0.5px solid ${COLORS.roseBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: phase.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.roseDark }}>{cycleDay ? `Dag ${cycleDay}` : "Cyclus"}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 1.5 }}>{phase.tip}</div>
          </div>
        </div>
        {(() => {
          const pred = getCyclePrediction(profile?.facts?.lastperiod, profile?.facts?.cyclelength);
          if (!pred) return null;
          return (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `0.5px solid ${COLORS.roseBorder}` }}>
              <div style={{ fontSize: 11, color: COLORS.roseDark, fontWeight: 500, marginBottom: 6 }}>
                Volgende periode verwacht over {pred.daysUntilNext} dag{pred.daysUntilNext !== 1 ? "en" : ""} — {pred.nextPeriod.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
              </div>
              {pred.transitions.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {pred.transitions.map(t => (
                    <span key={t.name} style={{ fontSize: 10, background: "rgba(255,255,255,0.7)", border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "3px 10px", color: COLORS.text }}>
                      {t.name} over {t.daysUntil}d
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        {periodLogged ? (
          <div style={{ marginTop: 10, fontSize: 12, color: COLORS.rose, fontWeight: 500 }}>✦ Nieuwe cyclus gestart — dag 1!</div>
        ) : (
          <button onClick={logNewPeriod} disabled={loggingPeriod} style={{ marginTop: 10, background: "none", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "5px 14px", fontSize: 11, color: COLORS.muted, cursor: "pointer", fontFamily: "inherit" }}>
            {loggingPeriod ? "Opslaan..." : "↩ Mijn cyclus is begonnen"}
          </button>
        )}
      </div>

      <Card style={{ background: COLORS.cream, border: `0.5px solid ${COLORS.roseBorder}` }}>
        <Label>Lola zegt</Label>
        <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, fontStyle: "italic", marginBottom: 10 }}>
          "{lolaObs}"
        </p>
        <button onClick={onGoToLola} style={{ background: "none", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "6px 16px", fontSize: 12, color: COLORS.rose, cursor: "pointer", fontFamily: "inherit" }}>
          Vertel Lola →
        </button>
      </Card>

      {/* Ochtend check-in */}
      <Card>
        {todayCheckin ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Label>Ochtend check-in ✦</Label>
              <button onClick={() => onCheckin("ochtend")} style={{ background: "none", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: COLORS.muted, cursor: "pointer", fontFamily: "inherit" }}>Wijzigen</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {todayCheckin.wake_mood !== null && <span style={{ fontSize: 12, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>{WAKE_MOODS[todayCheckin.wake_mood]} {WAKE_LABELS[todayCheckin.wake_mood]}</span>}
              {todayCheckin.energy && <span style={{ fontSize: 12, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>Energie {todayCheckin.energy}/5</span>}
              {todayCheckin.slept && <span style={{ fontSize: 12, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>{todayCheckin.slept}</span>}
            </div>
            {todayCheckin.intention && <p style={{ fontSize: 12, color: COLORS.muted, fontStyle: "italic", marginTop: 8 }}>"{todayCheckin.intention}"</p>}
          </>
        ) : (
          <>
            <Label>Ochtend check-in</Label>
            <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text, marginBottom: 12, marginTop: 4 }}>Hoe ben je wakker geworden?</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {WAKE_MOODS.map((mood, i) => (
                <button key={i} onClick={() => onCheckin("ochtend")} style={{ width: 48, height: 48, borderRadius: "50%", border: `1.5px solid ${COLORS.roseBorder}`, background: COLORS.white, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {mood}
                </button>
              ))}
            </div>
            <button onClick={() => onCheckin("ochtend")} style={{ width: "100%", marginTop: 14, padding: "13px", borderRadius: 24, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Start ochtend check-in →
            </button>
          </>
        )}
      </Card>

      {/* Avond check-in — zichtbaar na 18:00 */}
      {hour >= 18 && (
        <Card style={{ background: COLORS.lavender, border: `0.5px solid ${COLORS.lavenderBorder}` }}>
          {todayAvond ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Label>Avond check-in ✦</Label>
                <button onClick={() => onCheckin("avond")} style={{ background: "none", border: `1px solid ${COLORS.lavenderBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: COLORS.muted, cursor: "pointer", fontFamily: "inherit" }}>Wijzigen</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {todayAvond.day_rating && <span style={{ fontSize: 12, background: "rgba(255,255,255,0.6)", border: `0.5px solid ${COLORS.lavenderBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>Dag: {todayAvond.day_rating}/5</span>}
                {todayAvond.moved !== null && <span style={{ fontSize: 12, background: "rgba(255,255,255,0.6)", border: `0.5px solid ${COLORS.lavenderBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>{todayAvond.moved ? "Bewogen ✓" : "Niet bewogen"}</span>}
              </div>
              {todayAvond.gratitude && <p style={{ fontSize: 12, color: COLORS.text, fontStyle: "italic", marginTop: 8 }}>"{todayAvond.gratitude}"</p>}
            </>
          ) : (
            <>
              <Label>Avond check-in</Label>
              <div style={{ fontSize: 13, color: COLORS.text, marginTop: 4, marginBottom: 12 }}>Sluit je dag af met Lola</div>
              <button onClick={() => onCheckin("avond")} style={{ width: "100%", padding: "13px", borderRadius: 24, background: "rgba(255,255,255,0.5)", border: `1.5px solid ${COLORS.lavenderBorder}`, color: COLORS.text, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Start avond check-in →
              </button>
            </>
          )}
        </Card>
      )}

      <Card>
        <Label>Voeding vandaag</Label>
        {todayFood.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.muted }}>Nog niets gelogd vandaag.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[[kcal, "kcal"], [protein + "g", "eiwit"], [carbs + "g", "koolhyd."], [fat + "g", "vet"]].map(([val, lbl]) => (
                <div key={lbl} style={{ flex: 1, background: COLORS.roseLight, borderRadius: 14, padding: "10px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text }}>{val}</div>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
            <ProgressBar value={kcal} max={1800} />
          </>
        )}
      </Card>

      <Card>
        <Label>Vandaag gelogd</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Slaap", value: todayCheckin?.slept || "Niet gelogd", color: COLORS.lavender, border: COLORS.lavenderBorder },
            { label: "Energie", value: todayCheckin?.energy ? `${todayCheckin.energy}/5` : "Niet gelogd", color: COLORS.roseLight, border: COLORS.roseBorder },
            { label: "Stemming", value: todayCheckin?.wake_mood !== null && todayCheckin?.wake_mood !== undefined ? WAKE_LABELS[todayCheckin.wake_mood] : "Niet gelogd", color: COLORS.softGreen, border: COLORS.softGreenBorder },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: COLORS.muted }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 500, background: item.color, border: `0.5px solid ${item.border}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>{item.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── CHECK-IN SCREEN ───────────────────────────────────────
function CheckInScreen({ onDone, user, checkinType: initialType = "ochtend" }) {
  const hour = new Date().getHours();
  const [activeType, setActiveType] = useState(initialType);
  const checkinType = activeType;
  const [existing, setExisting] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  // Ochtend velden
  const [wakeMood, setWakeMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [slept, setSlept] = useState("");
  const [intention, setIntention] = useState("");
  const [note, setNote] = useState("");
  const [weight, setWeight] = useState("");
  // Avond velden
  const [dayRating, setDayRating] = useState(null);
  const [moved, setMoved] = useState(null);
  const [movementNote, setMovementNote] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [release, setRelease] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    supabase.from("checkins").select("*").eq("user_id", user.id)
      .gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
      .eq("type", checkinType).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        const record = data?.[0] || null;
        if (record) {
          setExisting(record);
          // Ochtend
          setWakeMood(record.wake_mood ?? null);
          setEnergy(record.energy ?? null);
          setSlept(record.slept || "");
          setIntention(record.intention || "");
          setNote(record.note || "");
          // Avond
          setDayRating(record.day_rating ?? null);
          setMoved(record.moved ?? null);
          setMovementNote(record.movement_note || "");
          setGratitude(record.gratitude || "");
          setRelease(record.release || "");
        } else {
          setEditMode(true);
        }
        setLoading(false);
      });
  }, [user, checkinType]);

  async function save() {
    if (!user) { setSubmitted(true); return; }
    const payload = checkinType === "ochtend"
      ? { user_id: user.id, type: "ochtend", wake_mood: wakeMood, energy, slept, intention, note }
      : { user_id: user.id, type: "avond", day_rating: dayRating, moved, movement_note: movementNote, gratitude, release };
    const saves = [existing?.id
      ? supabase.from("checkins").update(payload).eq("id", existing.id)
      : supabase.from("checkins").insert(payload)];
    if (checkinType === "ochtend" && weight && user) {
      saves.push(supabase.from("weight_logs").insert({ user_id: user.id, weight: parseFloat(weight), unit: "kg" }));
    }
    await Promise.all(saves);
    setSubmitted(true);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>Laden...</div>;

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", gap: 16 }}>
        <LolaSymbol size={48} color={COLORS.fig} />
        <div style={{ fontFamily: "'Italiana', serif", fontSize: 28, letterSpacing: "0.04em", color: COLORS.fig }}>{existing ? "Gewijzigd" : "Dankjewel"}</div>
        <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.7, maxWidth: 300 }}>Lola heeft je check-in ontvangen. Ze denkt de hele dag met je mee.</p>
        {intention && (
          <div style={{ background: COLORS.roseLight, borderRadius: 20, padding: "16px 20px", border: `0.5px solid ${COLORS.roseBorder}`, maxWidth: 300 }}>
            <p style={{ fontSize: 13, color: COLORS.roseDark, fontStyle: "italic", lineHeight: 1.6 }}>"{intention}"</p>
          </div>
        )}
        <button onClick={onDone} style={{ marginTop: 8, padding: "13px 32px", borderRadius: 24, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          Terug naar home
        </button>
      </div>
    );
  }

  const isAvond = checkinType === "avond";
  const accentBg = isAvond ? COLORS.lavender : COLORS.roseLight;
  const accentBorder = isAvond ? COLORS.lavenderBorder : COLORS.roseBorder;
  const accentText = isAvond ? COLORS.text : COLORS.roseDark;
  const btnColor = isAvond ? "#9B8EC4" : COLORS.rose;

  const TypeTabs = () => (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
      {["ochtend", ...(hour >= 18 ? ["avond"] : [])].map(t => (
        <button key={t} onClick={() => { setActiveType(t); setExisting(null); setEditMode(false); setSubmitted(false); setLoading(true); }}
          style={{ flex: 1, padding: "10px", borderRadius: 16, border: `1.5px solid ${activeType === t ? (t === "avond" ? "#9B8EC4" : COLORS.rose) : COLORS.roseBorder}`, background: activeType === t ? (t === "avond" ? COLORS.lavender : COLORS.roseLight) : COLORS.white, color: activeType === t ? (t === "avond" ? "#9B8EC4" : COLORS.rose) : COLORS.muted, fontSize: 13, fontWeight: activeType === t ? 500 : 400, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
          {t === "ochtend" ? "🌤 Ochtend" : "🌙 Avond"}
        </button>
      ))}
    </div>
  );

  // Leesmodus
  if (existing && !editMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TypeTabs />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>{isAvond ? "🌙 Avond" : "🌤 Ochtend"} check-in ✦</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>Gelogd vandaag</div>
          </div>
          <button onClick={() => setEditMode(true)} style={{ background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 20, padding: "8px 18px", fontSize: 13, color: accentText, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Wijzigen</button>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!isAvond && existing.wake_mood !== null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: COLORS.muted }}>Stemming</span><span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{WAKE_MOODS[existing.wake_mood]} {WAKE_LABELS[existing.wake_mood]}</span></div>}
            {!isAvond && existing.energy && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: COLORS.muted }}>Energie</span><span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{existing.energy}/5</span></div>}
            {!isAvond && existing.slept && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: COLORS.muted }}>Geslapen</span><span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{existing.slept}</span></div>}
            {!isAvond && existing.intention && <div style={{ paddingTop: 8, borderTop: `0.5px solid ${COLORS.roseBorder}` }}><div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Intentie</div><div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic" }}>"{existing.intention}"</div></div>}
            {isAvond && existing.day_rating && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: COLORS.muted }}>Dag</span><span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{existing.day_rating}/5</span></div>}
            {isAvond && existing.moved !== null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: COLORS.muted }}>Bewogen</span><span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{existing.moved ? `Ja${existing.movement_note ? ` — ${existing.movement_note}` : ""}` : "Nee"}</span></div>}
            {isAvond && existing.gratitude && <div style={{ paddingTop: 8, borderTop: `0.5px solid ${COLORS.roseBorder}` }}><div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Dankbaar voor</div><div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic" }}>"{existing.gratitude}"</div></div>}
            {isAvond && existing.release && <div style={{ paddingTop: 8, borderTop: `0.5px solid ${COLORS.roseBorder}` }}><div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Loslaten</div><div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic" }}>"{existing.release}"</div></div>}
          </div>
        </Card>
        <button onClick={onDone} style={{ padding: "13px", borderRadius: 24, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Terug naar home</button>
      </div>
    );
  }

  // Invulformulier
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <TypeTabs />
      <div>
        <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text, marginBottom: 4 }}>
          {existing ? "Wijzigen ✦" : isAvond ? "🌙 Avond check-in ✦" : "🌤 Ochtend check-in ✦"}
        </div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>{isAvond ? "Sluit je dag af met Lola" : "Neem even 2 minuten voor jezelf"}</div>
      </div>

      {!isAvond && (
        <div style={{ background: COLORS.lavender, borderRadius: 20, padding: "16px 18px", border: `0.5px solid ${COLORS.lavenderBorder}` }}>
          <div style={{ fontSize: 10, color: "#9B8EC4", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Gedachte van de dag</div>
          <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>"{DAILY_THOUGHT}"</p>
        </div>
      )}

      {!isAvond && <>
        <Card>
          <Label>Hoe ben je wakker geworden?</Label>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {WAKE_MOODS.map((m, i) => (
              <button key={i} onClick={() => setWakeMood(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 52, padding: "8px 0", borderRadius: 16, border: `1.5px solid ${wakeMood === i ? COLORS.rose : COLORS.roseBorder}`, background: wakeMood === i ? COLORS.roseLight : COLORS.white, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 22 }}>{m}</span>
                <span style={{ fontSize: 9, color: wakeMood === i ? COLORS.rose : COLORS.muted }}>{WAKE_LABELS[i]}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <Label>Energieniveau (1–5)</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, height: 44, borderRadius: 14, border: `1.5px solid ${energy === n ? COLORS.rose : COLORS.roseBorder}`, background: energy === n ? COLORS.rose : COLORS.white, color: energy === n ? COLORS.white : COLORS.muted, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{n}</button>
            ))}
          </div>
        </Card>
        <Card>
          <Label>Hoeveel uur geslapen?</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["<5 uur","5–6 uur","6–7 uur","7–8 uur","8+ uur"].map((opt) => (
              <button key={opt} onClick={() => setSlept(opt)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${slept === opt ? COLORS.rose : COLORS.roseBorder}`, background: slept === opt ? COLORS.roseLight : COLORS.white, color: slept === opt ? COLORS.roseDark : COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: slept === opt ? 500 : 400 }}>{opt}</button>
            ))}
          </div>
        </Card>
        <Card>
          <Label>Gewicht vandaag <span style={{ fontWeight: 400, color: COLORS.muted }}>(optioneel)</span></Label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="bijv. 67.4" style={{ flex: 1, padding: "11px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 14, fontFamily: "inherit", color: COLORS.text, outline: "none" }} />
            <span style={{ fontSize: 13, color: COLORS.muted }}>kg</span>
          </div>
        </Card>
        <Card>
          <Label>Intentie voor vandaag</Label>
          <textarea value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Eén woord, één zin, één gevoel..." rows={3} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
        </Card>
        <Card>
          <Label>Iets wat je wilt kwijt aan Lola?</Label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optioneel..." rows={2} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
        </Card>
      </>}

      {isAvond && <>
        <Card>
          <Label>Hoe was je dag? (1–5)</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setDayRating(n)} style={{ flex: 1, height: 44, borderRadius: 14, border: `1.5px solid ${dayRating === n ? btnColor : COLORS.roseBorder}`, background: dayRating === n ? btnColor : COLORS.white, color: dayRating === n ? COLORS.white : COLORS.muted, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{n}</button>
            ))}
          </div>
        </Card>
        <Card>
          <Label>Bewogen vandaag?</Label>
          <div style={{ display: "flex", gap: 10, marginBottom: moved ? 12 : 0 }}>
            {[["Ja", true], ["Nee", false]].map(([lbl, val]) => (
              <button key={lbl} onClick={() => setMoved(val)} style={{ flex: 1, padding: "11px", borderRadius: 14, border: `1.5px solid ${moved === val ? btnColor : COLORS.roseBorder}`, background: moved === val ? btnColor : COLORS.white, color: moved === val ? COLORS.white : COLORS.muted, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{lbl}</button>
            ))}
          </div>
          {moved && <input type="text" value={movementNote} onChange={e => setMovementNote(e.target.value)} placeholder="Wat en hoe lang? (bijv. 30 min wandelen)" style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, outline: "none", boxSizing: "border-box", marginTop: 8 }} />}
        </Card>
        <Card>
          <Label>Waar ben je dankbaar voor vandaag?</Label>
          <textarea value={gratitude} onChange={e => setGratitude(e.target.value)} placeholder="Klein of groot..." rows={2} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
        </Card>
        <Card>
          <Label>Wat wil je loslaten?</Label>
          <textarea value={release} onChange={e => setRelease(e.target.value)} placeholder="Een gedachte, spanning, verwachting..." rows={2} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
        </Card>
      </>}

      <button onClick={save} style={{ padding: "15px", borderRadius: 24, background: btnColor, border: "none", color: COLORS.white, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
        {existing ? "Wijzigingen opslaan ✦" : "Verstuur naar Lola ✦"}
      </button>
      {existing && <button onClick={() => setEditMode(false)} style={{ padding: "12px", borderRadius: 24, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuleren</button>}
    </div>
  );
}

// ── PATROONANALYSE HELPER ─────────────────────────────────
function analyzePatterns(allCheckins, allFood, lastperiod, cyclelength) {
  const SLEEP_SCORE = { "<5 uur": 1, "5–6 uur": 2, "6–7 uur": 3, "7–8 uur": 4, "8+ uur": 5 };

  // Bouw een map van datum → voedingstotalen
  const foodByDate = {};
  allFood.forEach(f => {
    const d = f.created_at?.slice(0, 10);
    if (!d) return;
    if (!foodByDate[d]) foodByDate[d] = { kcal: 0, fat: 0, protein: 0, carbs: 0 };
    foodByDate[d].kcal += f.kcal || 0;
    foodByDate[d].fat += f.fat || 0;
    foodByDate[d].protein += f.protein || 0;
    foodByDate[d].carbs += f.carbs || 0;
  });

  // Verrijk elke check-in met cyclusdag en voeding van de vorige dag
  const enriched = allCheckins
    .filter(c => c.created_at && c.energy)
    .map(c => {
      const date = c.created_at.slice(0, 10);
      const prevDate = new Date(new Date(date) - 86400000).toISOString().slice(0, 10);
      const { day: cycleDay, phase } = getCycleInfoForDate(lastperiod, cyclelength, new Date(date));
      return {
        ...c,
        date,
        cycleDay,
        phaseName: phase.name,
        prevFood: foodByDate[prevDate] || null,
        todayFood: foodByDate[date] || null,
        sleepScore: SLEEP_SCORE[c.slept] || null,
      };
    });

  if (enriched.length < 3) return null;

  // 1. Energie per cyclusdag (groepeer per dag, min 2 datapunten)
  const energyPerCycleDay = {};
  const sleepPerCycleDay = {};
  const moodPerCycleDay = {};
  enriched.forEach(e => {
    if (!e.cycleDay) return;
    if (!energyPerCycleDay[e.cycleDay]) energyPerCycleDay[e.cycleDay] = [];
    energyPerCycleDay[e.cycleDay].push(e.energy);
    if (e.sleepScore) {
      if (!sleepPerCycleDay[e.cycleDay]) sleepPerCycleDay[e.cycleDay] = [];
      sleepPerCycleDay[e.cycleDay].push(e.sleepScore);
    }
    if (e.wake_mood !== null && e.wake_mood !== undefined) {
      if (!moodPerCycleDay[e.cycleDay]) moodPerCycleDay[e.cycleDay] = [];
      moodPerCycleDay[e.cycleDay].push(e.wake_mood);
    }
  });

  const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;

  // Cyclus-dagen met consistent lage energie (gem < 2.5, min 2 metingen)
  const lowEnergyDays = Object.entries(energyPerCycleDay)
    .filter(([, vals]) => vals.length >= 2 && avg(vals) < 2.5)
    .sort((a, b) => avg(a[1]) - avg(b[1]))
    .slice(0, 5)
    .map(([day, vals]) => `dag ${day} (gem. ${avg(vals).toFixed(1)}/5, n=${vals.length})`);

  // Cyclus-dagen met slechte slaap (gem sleepscore < 2.5)
  const poorSleepDays = Object.entries(sleepPerCycleDay)
    .filter(([, vals]) => vals.length >= 2 && avg(vals) < 2.5)
    .sort((a, b) => avg(a[1]) - avg(b[1]))
    .slice(0, 5)
    .map(([day, vals]) => `dag ${day} (gem. slaap ${avg(vals).toFixed(1)}/5, n=${vals.length})`);

  // Energie per fase
  const energyPerPhase = {};
  enriched.forEach(e => {
    if (!e.phaseName) return;
    if (!energyPerPhase[e.phaseName]) energyPerPhase[e.phaseName] = [];
    energyPerPhase[e.phaseName].push(e.energy);
  });
  const phaseEnergy = Object.entries(energyPerPhase)
    .filter(([, vals]) => vals.length >= 2)
    .map(([phase, vals]) => `${phase}: gem. ${avg(vals).toFixed(1)}/5`)
    .join(", ");

  // Voedingscorrelaties: splits op hoog/laag vet/eiwit dag ervoor
  const withPrevFood = enriched.filter(e => e.prevFood);
  let fatCorr = "", proteinCorr = "", kcalCorr = "";

  if (withPrevFood.length >= 4) {
    const medFat = withPrevFood.map(e => e.prevFood.fat).sort((a,b)=>a-b)[Math.floor(withPrevFood.length/2)];
    const highFat = withPrevFood.filter(e => e.prevFood.fat >= medFat);
    const lowFat = withPrevFood.filter(e => e.prevFood.fat < medFat);
    if (highFat.length >= 2 && lowFat.length >= 2) {
      const diff = avg(highFat.map(e => e.energy)) - avg(lowFat.map(e => e.energy));
      if (Math.abs(diff) >= 0.4) {
        fatCorr = diff > 0
          ? `Na een dag met veel vetten (>${medFat}g) is haar energie gemiddeld ${diff.toFixed(1)} punt hoger.`
          : `Na een dag met veel vetten (>${medFat}g) is haar energie gemiddeld ${Math.abs(diff).toFixed(1)} punt lager.`;
      }
    }

    const medProt = withPrevFood.map(e => e.prevFood.protein).sort((a,b)=>a-b)[Math.floor(withPrevFood.length/2)];
    const highProt = withPrevFood.filter(e => e.prevFood.protein >= medProt);
    const lowProt = withPrevFood.filter(e => e.prevFood.protein < medProt);
    if (highProt.length >= 2 && lowProt.length >= 2) {
      const diff = avg(highProt.map(e => e.energy)) - avg(lowProt.map(e => e.energy));
      if (Math.abs(diff) >= 0.4) {
        proteinCorr = diff > 0
          ? `Na een dag met veel eiwitten (>${medProt}g) is haar energie gemiddeld ${diff.toFixed(1)} punt hoger.`
          : `Na een dag met veel eiwitten (>${medProt}g) is haar energie gemiddeld ${Math.abs(diff).toFixed(1)} punt lager.`;
      }
    }

    // Slaap-vetten correlatie
    const withSleep = withPrevFood.filter(e => e.sleepScore);
    if (withSleep.length >= 4) {
      const medFatS = withSleep.map(e => e.prevFood.fat).sort((a,b)=>a-b)[Math.floor(withSleep.length/2)];
      const highFatS = withSleep.filter(e => e.prevFood.fat >= medFatS);
      const lowFatS = withSleep.filter(e => e.prevFood.fat < medFatS);
      if (highFatS.length >= 2 && lowFatS.length >= 2) {
        const diff = avg(highFatS.map(e => e.sleepScore)) - avg(lowFatS.map(e => e.sleepScore));
        if (Math.abs(diff) >= 0.4) {
          kcalCorr = diff > 0
            ? `Na een dag met veel vetten slaapt ze gemiddeld ${diff.toFixed(1)} punt beter (op schaal 1–5).`
            : `Na een dag met veel vetten slaapt ze gemiddeld ${Math.abs(diff).toFixed(1)} punt slechter.`;
        }
      }
    }
  }

  // Recente 7 dagen samenvatting
  const recent7 = enriched.slice(0, 7);
  const recentAvgEnergy = avg(recent7.map(e => e.energy)).toFixed(1);
  const recentLowDays = recent7.filter(e => e.energy <= 2).length;

  return {
    total: enriched.length,
    lowEnergyDays,
    poorSleepDays,
    phaseEnergy,
    fatCorr,
    proteinCorr,
    kcalCorr,
    recentAvgEnergy,
    recentLowDays,
    recentCount: recent7.length,
  };
}

// ── LOLA CHAT ─────────────────────────────────────────────
function LolaScreen({ profile, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [contextData, setContextData] = useState(null);
  const bottomRef = useRef(null);
  const hasScrolled = useRef(false);

  // Scroll naar beneden bij nieuwe berichten
  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: hasScrolled.current ? "smooth" : "auto" });
    hasScrolled.current = true;
  }, [messages]);

  // Laad alles tegelijk: chatgeschiedenis + check-ins + voeding
  useEffect(() => {
    if (!user) { setDataLoaded(true); return; }
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from("lola_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("food_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).then(([{ data: history }, { data: checkins }, { data: food }]) => {
      const loaded = history || [];
      setMessages(loaded.map(m => ({ id: m.id, from: m.role === "user" ? "user" : "lola", text: m.content, created_at: m.created_at })));
      setContextData({ checkins: checkins || [], food: food || [], today });
      setDataLoaded(true);

      // Stuur welkomstbericht als er nog geen geschiedenis is
      if (loaded.length === 0) {
        const name = profile?.facts?.name || "liefste";
        const greeting = { role: "assistant", content: `Hoi ${name} ✦ Ik ben er. Wat speelt er vandaag?` };
        supabase.from("lola_messages").insert({ user_id: user.id, ...greeting }).then(({ data }) => {
          setMessages([{ from: "lola", text: greeting.content, created_at: new Date().toISOString() }]);
        });
      }
    });
  }, [user]);

  function buildLolaSystem() {
    const facts = profile?.facts || {};
    const { day: cycleDay, phase } = getCycleInfo(facts.lastperiod, facts.cyclelength);
    const checkins = contextData?.checkins || [];
    const food = contextData?.food || [];
    const today = contextData?.today || new Date().toISOString().slice(0, 10);
    const MOODS = ["Zwaar", "Moeizaam", "Oké", "Fris", "Uitgerust"];
    const todayCheckin = checkins.find(c => c.created_at?.slice(0, 10) === today);
    const todayFood = food.filter(f => f.created_at?.slice(0, 10) === today);
    const totalKcal = todayFood.reduce((s, f) => s + (f.kcal || 0), 0);
    const totalProtein = todayFood.reduce((s, f) => s + (f.protein || 0), 0);
    const totalFat = todayFood.reduce((s, f) => s + (f.fat || 0), 0);
    const patterns = analyzePatterns(checkins, food, facts.lastperiod, facts.cyclelength);

    return `Je bent Lola, een warme maar eerlijke persoonlijke levenscoach voor vrouwen. Je hebt een doorlopend gesprek met haar — je kent haar goed en bouwt voort op alles wat eerder is gezegd.

── WIE ZE IS ──
${facts.personality_profile
  ? facts.personality_profile
  : `Naam: ${facts.name || "onbekend"} | Sterrenbeeld: ${getZodiac(facts.birthdate) || "?"} | HD: ${facts.hdtype || "?"} profiel ${facts.hdprofile || "?"} autoriteit ${facts.hdauthority || "?"}`
}

── FEITEN ──
Naam: ${facts.name || "onbekend"} · ${facts.birthdate ? Math.floor((Date.now() - new Date(facts.birthdate)) / (365.25 * 86400000)) + " jaar" : ""} · ${getZodiac(facts.birthdate) || ""}
Werk: ${facts.work || "onbekend"} · Relatie: ${facts.relationship_status || "onbekend"} · Kinderen: ${facts.children || "onbekend"} · Woont: ${facts.living_situation || "onbekend"}
Human Design: ${facts.hdtype || "?"} · Profiel ${facts.hdprofile || "?"} · Autoriteit ${facts.hdauthority || "?"}
Cycluslengte: ${facts.cyclelength || "onbekend"}

── CYCLUS VANDAAG ──
${phase.name}${cycleDay ? ` · dag ${cycleDay}` : ""} — ${phase.desc}

── CHECK-IN VANDAAG ──
${todayCheckin
  ? `Stemming: ${MOODS[todayCheckin.wake_mood] ?? "?"} | Energie: ${todayCheckin.energy ?? "?"}/5 | Slaap: ${todayCheckin.slept ?? "?"}`
    + (todayCheckin.intention ? `\nIntentie: "${todayCheckin.intention}"` : "")
    + (todayCheckin.note ? `\nNotitie: "${todayCheckin.note}"` : "")
  : "Geen check-in vandaag."}

── VOEDING VANDAAG ──
${todayFood.length > 0 ? `${totalKcal} kcal · ${totalProtein}g eiwit · ${totalFat}g vet` : "Nog niets gelogd."}

── PATROONANALYSE ──
${!patterns ? "Onvoldoende data (min. 3 check-ins)." : `Gem. energie 7 dagen: ${patterns.recentAvgEnergy}/5 · Lage energie cyclusdagen: ${patterns.lowEnergyDays.join(", ") || "geen"} · Slechte slaap cyclusdagen: ${patterns.poorSleepDays.join(", ") || "geen"} · ${patterns.fatCorr || ""} ${patterns.proteinCorr || ""}`}

── HOE JE REAGEERT ──
- Dit is een doorlopend gesprek. Verwijs naar wat ze eerder zei als dat relevant is.
- Benoem patronen concreet en specifiek als het aanvoelt.
- Eén vraag per bericht. Warm, eerlijk, kort. Schrijf in het Nederlands.`;
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);

    // Sla gebruikersbericht op en toon het direct
    const userRow = { user_id: user.id, role: "user", content: userMsg };
    const { data: savedUser } = await supabase.from("lola_messages").insert(userRow).select().single();
    const newUserMsg = { id: savedUser?.id, from: "user", text: userMsg, created_at: savedUser?.created_at };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    // Stuur de volledige geschiedenis naar Claude (max 60 berichten)
    const apiMessages = updatedMessages.slice(-60).map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    const reply = await askLola(apiMessages, buildLolaSystem());

    // Sla Lola's antwoord op
    const lolaRow = { user_id: user.id, role: "assistant", content: reply };
    const { data: savedLola } = await supabase.from("lola_messages").insert(lolaRow).select().single();
    setMessages(prev => [...prev, { id: savedLola?.id, from: "lola", text: reply, created_at: savedLola?.created_at }]);
    setLoading(false);
  }

  // Datum-scheider hulpfunctie
  function formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Vandaag";
    if (d.toDateString() === yesterday.toDateString()) return "Gisteren";
    return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  }

  if (!dataLoaded) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100dvh - 120px)", gap: 16 }}>
      <LolaSymbol size={40} color={COLORS.fig} />
      <div style={{ fontSize: 13, color: COLORS.gray, fontFamily: "'DM Sans', sans-serif" }}>Lola leest je gegevens...</div>
    </div>
  );

  // Groepeer berichten per dag voor datum-scheiders
  let lastDateLabel = null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 80px)", width: "100%", maxWidth: "100%", overflow: "hidden" }}>

      {/* ── Lola header ─────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px", borderBottom: `0.5px solid ${COLORS.figBorder}`, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: COLORS.fig, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.figDark}` }}>
            <LolaSymbol size={22} color={COLORS.bone} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontFamily: "'Italiana', serif", fontSize: 22, letterSpacing: "0.06em", color: COLORS.fig, lineHeight: 1 }}>LOLA</div>
            <div style={{ fontSize: 11, color: COLORS.gray, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
              {messages.length > 1 ? `${messages.length} berichten` : "Jouw persoonlijke coach"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Berichten ────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
        {messages.map((msg, i) => {
          const dateLabel = msg.created_at ? formatDateLabel(msg.created_at) : null;
          const showDate = dateLabel && dateLabel !== lastDateLabel;
          if (showDate) lastDateLabel = dateLabel;
          const isLola = msg.from === "lola";
          return (
            <div key={msg.id || i}>
              {showDate && (
                <div style={{ textAlign: "center", fontSize: 10, color: COLORS.gray, margin: "10px 0", display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif" }}>
                  <div style={{ flex: 1, height: "0.5px", background: COLORS.figBorder }} />
                  {dateLabel}
                  <div style={{ flex: 1, height: "0.5px", background: COLORS.figBorder }} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: isLola ? "flex-start" : "flex-end" }}>
                <div style={{
                  maxWidth: "80%", wordBreak: "break-word",
                  padding: isLola ? "14px 18px" : "11px 16px",
                  borderRadius: 20,
                  borderBottomLeftRadius: isLola ? 4 : 20,
                  borderBottomRightRadius: isLola ? 20 : 4,
                  // Lola: fig achtergrond met bone tekst (statement versie)
                  background: isLola ? COLORS.fig : COLORS.boneWarm,
                  color: isLola ? COLORS.bone : COLORS.ink,
                  border: isLola ? "none" : `0.5px solid ${COLORS.figBorder}`,
                  // Lola spreekt in Cormorant Garamond italic
                  fontFamily: isLola ? "'Cormorant Garamond', serif" : "'DM Sans', sans-serif",
                  fontStyle: isLola ? "italic" : "normal",
                  fontSize: isLola ? 16 : 14,
                  lineHeight: isLola ? 1.65 : 1.55,
                  fontWeight: isLola ? 400 : 400,
                }}>
                  {isLola ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ fontWeight: 600, color: COLORS.goldSoft }}>{children}</strong>,
                        em: ({ children }) => <em style={{ fontStyle: "normal", color: COLORS.bone }}>{children}</em>,
                        h1: ({ children }) => <div style={{ fontFamily: "'Italiana', serif", fontStyle: "normal", fontSize: 20, color: COLORS.bone, margin: "10px 0 4px", letterSpacing: "0.04em" }}>{children}</div>,
                        h2: ({ children }) => <div style={{ fontFamily: "'Italiana', serif", fontStyle: "normal", fontSize: 18, color: COLORS.bone, margin: "8px 0 4px" }}>{children}</div>,
                        h3: ({ children }) => <div style={{ fontStyle: "normal", fontSize: 14, fontWeight: 600, color: COLORS.bone, margin: "6px 0 2px", fontFamily: "'DM Sans', sans-serif" }}>{children}</div>,
                        ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: "4px 0" }}>{children}</ul>,
                        ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: "4px 0" }}>{children}</ol>,
                        li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
                        hr: () => <hr style={{ border: "none", borderTop: `0.5px solid rgba(244,236,221,0.3)`, margin: "10px 0" }} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : msg.text}
                </div>
                {msg.created_at && (
                  <div style={{ fontSize: 10, color: COLORS.gray, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>
                    {new Date(msg.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div style={{ background: COLORS.fig, borderRadius: 20, borderBottomLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5 }}>
              {[0,1,2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.bone, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: `0.5px solid ${COLORS.figBorder}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Zeg iets tegen Lola..."
          style={{ flex: 1, minWidth: 0, padding: "12px 16px", borderRadius: 24, border: `1px solid ${COLORS.figBorder}`, background: COLORS.white, color: COLORS.ink, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
        />
        <MicButton onResult={(text) => setInput(prev => prev ? prev + " " + text : text)} />
        <button
          onClick={send} disabled={loading}
          style={{ width: 46, height: 46, borderRadius: "50%", background: loading ? COLORS.figBorder : COLORS.fig, border: "none", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M8 3l5 5-5 5" stroke={COLORS.bone} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── FOOD SCREEN ───────────────────────────────────────────
const QUICK_PORTIONS = [
  { label: "1 stuk", grams: 100 },
  { label: "1 portie", grams: 150 },
  { label: "1 glas", grams: 200 },
  { label: "1 kom", grams: 250 },
  { label: "½ portie", grams: 75 },
];

function MacroRing({ value, goal, color, label, size = 64 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.roseBorder} strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${circ}`} strokeDashoffset={`${circ * (1 - pct)}`}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s" }} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
          fontSize={size > 80 ? 15 : 11} fontWeight={600} fill={COLORS.text} fontFamily="DM Sans, sans-serif">
          {value}
        </text>
      </svg>
      <div style={{ fontSize: 10, color: COLORS.muted, textAlign: "center" }}>
        {label}{goal > 0 ? <><br /><span style={{ color: pct >= 1 ? "#5CB85C" : COLORS.muted }}>/{goal}</span></> : ""}
      </div>
    </div>
  );
}

function FoodScreen({ user }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [grams, setGrams] = useState("100");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [meals, setMeals] = useState({ ontbijt: [], lunch: [], diner: [], snack: [] });
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [activeMeal, setActiveMeal] = useState("ontbijt");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualGrams, setManualGrams] = useState("100");
  const [recentItems, setRecentItems] = useState([]);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResults, setVisionResults] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [goals, setGoals] = useState({ kcal: 0, protein: 0, fat: 0 });
  const photoRef = useRef(null);

  const totals = Object.values(meals).flat().reduce(
    (acc, p) => ({ kcal: acc.kcal + (p.kcal || 0), protein: acc.protein + (p.protein || 0), carbs: acc.carbs + (p.carbs || 0), fat: acc.fat + (p.fat || 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Laad vandaag's voedingslogs + doelen + recente items
  useEffect(() => {
    if (!user) { setLoadingMeals(false); return; }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    Promise.all([
      supabase.from("food_logs").select("*").eq("user_id", user.id)
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("kcal_goal,protein_goal,fat_goal").eq("id", user.id).maybeSingle(),
      supabase.from("food_logs").select("product_name,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
    ]).then(([{ data: logs }, { data: profile }, { data: recentLogs }]) => {
      // Groepeer logs per maaltijd
      const grouped = { ontbijt: [], lunch: [], diner: [], snack: [] };
      (logs || []).forEach(f => {
        const meal = f.meal || "snack";
        if (grouped[meal]) grouped[meal].push({
          id: f.id,
          name: f.product_name,
          grams: f.grams || 100,
          kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
          per100: f.kcal_per_100g ? { kcal: f.kcal_per_100g, protein: f.protein_per_100g, carbs: f.carbs_per_100g, fat: f.fat_per_100g } : null,
        });
      });
      setMeals(grouped);
      setLoadingMeals(false);

      if (profile) setGoals({ kcal: profile.kcal_goal || 0, protein: profile.protein_goal || 0, fat: profile.fat_goal || 0 });

      // Recente items: unieke producten met per-100g waarden
      const seen = new Set();
      const unique = (recentLogs || []).filter(f => {
        if (seen.has(f.product_name)) return false;
        seen.add(f.product_name);
        return f.kcal_per_100g > 0;
      }).slice(0, 8).map(f => ({
        name: f.product_name,
        kcal: f.kcal_per_100g, protein: f.protein_per_100g,
        carbs: f.carbs_per_100g, fat: f.fat_per_100g, source: "recent"
      }));
      setRecentItems(unique);
    });
  }, [user]);

  async function saveToSharedDB(product) {
    const { data: existing } = await supabase.from("food_products").select("id,times_logged").eq("name", product.name).limit(1);
    if (existing?.length > 0) {
      await supabase.from("food_products").update({ times_logged: (existing[0].times_logged || 1) + 1, updated_at: new Date().toISOString() }).eq("id", existing[0].id);
    } else {
      await supabase.from("food_products").insert({ name: product.name, brand: product.brand || "", kcal: product.kcal, protein: product.protein, carbs: product.carbs, fat: product.fat });
    }
  }

  async function searchLocal(q) {
    const { data } = await supabase.from("food_products").select("*").ilike("name", `%${q}%`).order("times_logged", { ascending: false }).limit(6);
    return (data || []).map(p => ({ ...p, source: "Lola DB" }));
  }

  async function searchOFF(q) {
    try {
      const res = await fetch(`/api/food?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      return (data.products || []).filter(p => p.product_name).slice(0, 6).map(p => ({
        name: p.product_name, brand: p.brands || "",
        kcal: Math.round(p.nutriments?.["energy-kcal_100g"] || 0),
        protein: Math.round(p.nutriments?.proteins_100g || 0),
        carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
        fat: Math.round(p.nutriments?.fat_100g || 0),
        source: "Open Food Facts"
      }));
    } catch { return []; }
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true); setResults([]); setVisionResults([]);
    const [local, off] = await Promise.all([searchLocal(query), searchOFF(query)]);
    const combined = [...local, ...off.filter(o => !local.some(l => l.name.toLowerCase() === o.name.toLowerCase()))];
    setResults(combined.slice(0, 12));
    setSearching(false);
  }

  async function scanPhoto(file) {
    setVisionLoading(true); setResults([]);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const res = await fetch("/api/food-vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: e.target.result.split(",")[1], mediaType: file.type || "image/jpeg" }) });
        const data = await res.json();
        setVisionResults(data.products || []);
      } finally { setVisionLoading(false); }
    };
    reader.readAsDataURL(file);
  }

  async function addProduct(product, gramsAmount = 100) {
    const per100 = { kcal: product.kcal, protein: product.protein, carbs: product.carbs, fat: product.fat };
    const factor = gramsAmount / 100;
    const scaled = { name: product.name, grams: gramsAmount, per100,
      kcal: Math.round(per100.kcal * factor), protein: Math.round(per100.protein * factor),
      carbs: Math.round(per100.carbs * factor), fat: Math.round(per100.fat * factor) };

    if (user) {
      const { data: inserted } = await supabase.from("food_logs").insert({
        user_id: user.id, meal: activeMeal, product_name: product.name,
        grams: gramsAmount, kcal: scaled.kcal, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat,
        kcal_per_100g: per100.kcal, protein_per_100g: per100.protein, carbs_per_100g: per100.carbs, fat_per_100g: per100.fat,
      }).select().single();
      if (inserted) scaled.id = inserted.id;
      saveToSharedDB({ name: product.name, brand: product.brand || "", ...per100 });
    }

    setMeals(prev => ({ ...prev, [activeMeal]: [...prev[activeMeal], scaled] }));
    setResults([]); setVisionResults([]); setQuery(""); setSelectedProduct(null);
    setRecentItems(prev => {
      const filtered = prev.filter(r => r.name !== product.name);
      return [{ name: product.name, ...per100, source: "recent" }, ...filtered].slice(0, 8);
    });
  }

  function updatePortion(meal, index, newGrams) {
    setMeals(prev => {
      const updated = [...prev[meal]];
      const item = updated[index];
      if (!item.per100) return prev;
      const f = newGrams / 100;
      updated[index] = { ...item, grams: newGrams, kcal: Math.round(item.per100.kcal * f), protein: Math.round(item.per100.protein * f), carbs: Math.round(item.per100.carbs * f), fat: Math.round(item.per100.fat * f) };
      return { ...prev, [meal]: updated };
    });
  }

  async function removeProduct(meal, index) {
    const item = meals[meal][index];
    setMeals(prev => ({ ...prev, [meal]: prev[meal].filter((_, i) => i !== index) }));
    if (editingItem?.meal === meal && editingItem?.index === index) setEditingItem(null);
    if (item.id && user) await supabase.from("food_logs").delete().eq("id", item.id);
  }

  const mealKcal = (meal) => meals[meal].reduce((s, p) => s + (p.kcal || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>Voeding <span style={{ fontWeight: 300 }}>vandaag</span></div>

      {/* Macro-ringen */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-start", padding: "4px 0" }}>
          <MacroRing value={totals.kcal} goal={goals.kcal} color={COLORS.rose} label="kcal" size={80} />
          <MacroRing value={totals.protein} goal={goals.protein} color="#A0C4E8" label="eiwit g" size={64} />
          <MacroRing value={totals.carbs} goal={0} color="#A0E8C4" label="koolhyd g" size={64} />
          <MacroRing value={totals.fat} goal={goals.fat} color="#E8C4A0" label="vet g" size={64} />
        </div>
        {goals.kcal > 0 && (
          <div style={{ textAlign: "center", fontSize: 11, color: totals.kcal > goals.kcal ? COLORS.rose : COLORS.muted, marginTop: 6 }}>
            {totals.kcal > goals.kcal ? `${totals.kcal - goals.kcal} kcal over doel` : `Nog ${goals.kcal - totals.kcal} kcal over`}
          </div>
        )}
      </Card>

      {/* Maaltijd tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {["ontbijt", "lunch", "diner", "snack"].map(meal => (
          <button key={meal} onClick={() => setActiveMeal(meal)} style={{ flex: 1, padding: "8px 4px", borderRadius: 16, border: `1.5px solid ${activeMeal === meal ? COLORS.rose : COLORS.roseBorder}`, background: activeMeal === meal ? COLORS.roseLight : COLORS.white, color: activeMeal === meal ? COLORS.rose : COLORS.muted, fontSize: 11, fontWeight: activeMeal === meal ? 500 : 400, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
            {meal}
            {meals[meal].length > 0 && <div style={{ fontSize: 9, color: activeMeal === meal ? COLORS.rose : COLORS.muted }}>{mealKcal(meal)} kcal</div>}
          </button>
        ))}
      </div>

      {/* Zoekbalk */}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder={`Zoek voor ${activeMeal}...`} style={{ flex: 1, minWidth: 0, padding: "12px 16px", borderRadius: 20, border: `1px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        <button onClick={search} disabled={searching} style={{ padding: "12px 16px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          {searching ? "..." : "Zoek"}
        </button>
        <button onClick={() => photoRef.current?.click()} style={{ width: 46, height: 46, borderRadius: "50%", background: COLORS.roseLight, border: `1px solid ${COLORS.roseBorder}`, color: COLORS.rose, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          📷
        </button>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => e.target.files?.[0] && scanPhoto(e.target.files[0])} />
      </div>

      {/* Foto-herkenning laden */}
      {visionLoading && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.muted, fontSize: 13 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${COLORS.rose}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            Lola herkent je eten...
          </div>
        </Card>
      )}

      {/* Foto-resultaten */}
      {visionResults.length > 0 && (
        <Card style={{ background: COLORS.softGreen, border: `0.5px solid ${COLORS.softGreenBorder}` }}>
          <Label>Herkend op foto ✦</Label>
          {visionResults.map((p, i) => (
            <div key={i} onClick={() => { setSelectedProduct(p); setGrams(String(p.grams_estimate || 100)); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${COLORS.softGreenBorder}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{p.name}</div>
                <div style={{ fontSize: 10, color: COLORS.muted }}>~{p.grams_estimate || 100}g · {p.kcal} kcal/100g</div>
              </div>
              <span style={{ fontSize: 16, color: COLORS.rose }}>+</span>
            </div>
          ))}
        </Card>
      )}

      {/* Zoekresultaten */}
      {results.length > 0 && (
        <Card>
          <Label>Resultaten</Label>
          {results.map((p, i) => (
            <div key={i} onClick={() => { setSelectedProduct(p); setGrams("100"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${COLORS.roseBorder}`, cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: COLORS.muted }}>{p.brand ? `${p.brand} · ` : ""}{p.kcal} kcal · {p.protein}g eiwit · {p.fat}g vet per 100g · <span style={{ color: p.source === "Lola DB" ? COLORS.rose : COLORS.muted }}>{p.source}</span></div>
              </div>
              <span style={{ fontSize: 18, color: COLORS.rose, marginLeft: 10, flexShrink: 0 }}>+</span>
            </div>
          ))}
        </Card>
      )}

      {/* Recente items */}
      {recentItems.length > 0 && !results.length && !visionResults.length && (
        <Card>
          <Label>Recent gelogd</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {recentItems.map((p, i) => (
              <button key={i} onClick={() => { setSelectedProduct(p); setGrams("100"); }} style={{ padding: "8px 14px", borderRadius: 20, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, fontSize: 12, color: COLORS.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: COLORS.muted }}>{p.kcal} kcal · {p.protein}g eiwit per 100g</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Portie kiezen */}
      {selectedProduct && (
        <Card style={{ border: `1.5px solid ${COLORS.rose}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Label>{selectedProduct.name}</Label>
            <button onClick={() => setSelectedProduct(null)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {QUICK_PORTIONS.map(qp => (
              <button key={qp.label} onClick={() => setGrams(String(qp.grams))} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${grams === String(qp.grams) ? COLORS.rose : COLORS.roseBorder}`, background: grams === String(qp.grams) ? COLORS.roseLight : COLORS.white, color: grams === String(qp.grams) ? COLORS.rose : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {qp.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" value={grams} onChange={e => setGrams(e.target.value)} style={{ flex: 1, padding: "11px 14px", borderRadius: 16, border: `1px solid ${COLORS.roseBorder}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <span style={{ fontSize: 13, color: COLORS.muted, flexShrink: 0 }}>gram</span>
            <button onClick={() => addProduct(selectedProduct, Number(grams) || 100)} style={{ padding: "11px 20px", borderRadius: 16, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Voeg toe</button>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8, display: "flex", gap: 12 }}>
            <span><strong style={{ color: COLORS.text }}>{Math.round(selectedProduct.kcal * (Number(grams) || 100) / 100)}</strong> kcal</span>
            <span><strong style={{ color: COLORS.text }}>{Math.round(selectedProduct.protein * (Number(grams) || 100) / 100)}g</strong> eiwit</span>
            <span><strong style={{ color: COLORS.text }}>{Math.round(selectedProduct.fat * (Number(grams) || 100) / 100)}g</strong> vet</span>
          </div>
        </Card>
      )}

      {/* Maaltijdlijst */}
      {loadingMeals && <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 13, padding: 20 }}>Laden...</div>}

      {!loadingMeals && ["ontbijt", "lunch", "diner", "snack"].map(meal => meals[meal].length > 0 && (
        <Card key={meal}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Label style={{ textTransform: "capitalize" }}>{meal}</Label>
            <span style={{ fontSize: 11, color: COLORS.muted }}>{mealKcal(meal)} kcal</span>
          </div>
          {meals[meal].map((p, i) => {
            const isEditing = editingItem?.meal === meal && editingItem?.index === i;
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: isEditing ? "none" : `0.5px solid ${COLORS.roseBorder}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ color: COLORS.muted, fontSize: 11 }}>{p.grams}g</span></div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{p.protein}g eiwit · {p.carbs}g koolhyd · {p.fat}g vet</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: COLORS.rose, fontWeight: 600 }}>{p.kcal}</span>
                    {p.per100 && <button onClick={() => setEditingItem(isEditing ? null : { meal, index: i, grams: p.grams })} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13, padding: 0 }}>✏️</button>}
                    <button onClick={() => removeProduct(meal, i)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                </div>
                {isEditing && p.per100 && (
                  <div style={{ background: COLORS.roseLight, borderRadius: 12, padding: "10px 12px", marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>Grammen aanpassen — macros worden herberekend</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {QUICK_PORTIONS.map(qp => (
                        <button key={qp.label} onClick={() => { setEditingItem(e => ({ ...e, grams: qp.grams })); updatePortion(meal, i, qp.grams); }}
                          style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${editingItem.grams === qp.grams ? COLORS.rose : COLORS.roseBorder}`, background: editingItem.grams === qp.grams ? COLORS.white : "transparent", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: editingItem.grams === qp.grams ? COLORS.rose : COLORS.muted }}>
                          {qp.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" value={editingItem.grams} onChange={e => { const g = Number(e.target.value) || 0; setEditingItem(ev => ({ ...ev, grams: g })); updatePortion(meal, i, g); }}
                        style={{ width: 72, padding: "7px 10px", borderRadius: 10, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", outline: "none", background: COLORS.white }} />
                      <span style={{ fontSize: 11, color: COLORS.muted }}>{Math.round(p.per100.kcal * (editingItem.grams || 0) / 100)} kcal</span>
                      <button onClick={() => setEditingItem(null)} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Klaar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      ))}

      {/* Handmatig */}
      {showManual && (
        <Card>
          <Label>Handmatig toevoegen</Label>
          <input placeholder="Productnaam" value={manualName} onChange={e => setManualName(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginTop: 8, marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
            {[["gram", manualGrams, setManualGrams], ["kcal/100g", manualKcal, setManualKcal], ["eiwit g", manualProtein, setManualProtein], ["koolhyd g", manualCarbs, setManualCarbs], ["vet g", manualFat, setManualFat]].map(([lbl, val, setter]) => (
              <div key={lbl}>
                <div style={{ fontSize: 9, color: COLORS.muted, marginBottom: 3 }}>{lbl}</div>
                <input type="number" value={val} onChange={e => setter(e.target.value)} style={{ width: "100%", padding: "8px 6px", borderRadius: 10, border: `1px solid ${COLORS.roseBorder}`, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => {
              if (!manualName) return;
              addProduct({ name: manualName, kcal: Number(manualKcal) || 0, protein: Number(manualProtein) || 0, carbs: Number(manualCarbs) || 0, fat: Number(manualFat) || 0 }, Number(manualGrams) || 100);
              setManualName(""); setManualKcal(""); setManualProtein(""); setManualCarbs(""); setManualFat(""); setManualGrams("100"); setShowManual(false);
            }} style={{ flex: 1, padding: "11px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Toevoegen
            </button>
            <button onClick={() => setShowManual(false)} style={{ padding: "11px 16px", borderRadius: 20, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuleer</button>
          </div>
        </Card>
      )}

      <button onClick={() => setShowManual(!showManual)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 20, border: `1.5px dashed ${COLORS.roseBorder}`, background: "transparent", color: COLORS.rose, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        + Handmatig toevoegen
      </button>
    </div>
  );
}

// ── GESCHIEDENIS KALENDER ─────────────────────────────────
function HistoryScreen({ user, profile }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [checkins, setCheckins] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const monthLabel = firstDay.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const from = new Date(year, month, 1); from.setHours(0,0,0,0);
    const to = new Date(year, month, lastDay.getDate()); to.setHours(23,59,59,999);
    Promise.all([
      supabase.from("checkins").select("*").eq("user_id", user.id)
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      supabase.from("food_logs").select("*").eq("user_id", user.id)
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      supabase.from("weight_logs").select("*").eq("user_id", user.id)
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
    ]).then(([{ data: ci }, { data: fl }, { data: wl }]) => {
      setCheckins(ci || []);
      setFoodLogs(fl || []);
      setWeightLogs(wl || []);
      setLoading(false);
    });
  }, [viewDate, user]);

  function localDateKey(isoStr) {
    return new Date(isoStr).toLocaleDateString("en-CA");
  }

  // Groepeer per dag — ochtend en avond apart
  const ochtendByDay = {}, avondByDay = {};
  checkins.forEach(c => {
    const k = localDateKey(c.created_at);
    if (c.type === "avond") avondByDay[k] = c;
    else ochtendByDay[k] = c;
  });

  const foodByDay = {};
  foodLogs.forEach(f => {
    const k = localDateKey(f.created_at);
    if (!foodByDay[k]) foodByDay[k] = [];
    foodByDay[k].push(f);
  });

  const weightByDay = {};
  weightLogs.forEach(w => { weightByDay[localDateKey(w.created_at)] = w.weight; });

  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((startOffset + lastDay.getDate()) / 7) * 7 }, (_, i) => {
    const d = i - startOffset + 1;
    return d >= 1 && d <= lastDay.getDate() ? d : null;
  });

  function dayKey(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const todayKey = today.toLocaleDateString("en-CA");
  const selectedKey = selectedDay ? dayKey(selectedDay) : null;
  const selOchtend = selectedKey ? ochtendByDay[selectedKey] : null;
  const selAvond = selectedKey ? avondByDay[selectedKey] : null;
  const selFood = selectedKey ? (foodByDay[selectedKey] || []) : [];
  const selWeight = selectedKey ? weightByDay[selectedKey] : null;
  const selCycle = selectedDay
    ? getCycleInfoForDate(profile?.facts?.lastperiod, profile?.facts?.cyclelength, new Date(year, month, selectedDay))
    : null;

  const MOODS = ["😴","😔","😐","🙂","✨"];
  const MOOD_LABELS = ["Zwaar","Moeizaam","Oké","Fris","Uitgerust"];

  const foodTotals = selFood.reduce((a, f) => ({ kcal: a.kcal+(f.kcal||0), protein: a.protein+(f.protein||0), carbs: a.carbs+(f.carbs||0), fat: a.fat+(f.fat||0) }), { kcal:0, protein:0, carbs:0, fat:0 });

  const Row = ({ label, value }) => value ? (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `0.5px solid ${COLORS.roseBorder}` }}>
      <span style={{ fontSize: 12, color: COLORS.muted }}>{label}</span>
      <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 500 }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Maand navigatie */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 20, padding: "4px 8px" }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text, textTransform: "capitalize" }}>{monthLabel}</div>
        <button onClick={() => { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(null); }} disabled={viewDate >= new Date(today.getFullYear(), today.getMonth(), 1)} style={{ background: "none", border: "none", cursor: "pointer", color: viewDate >= new Date(today.getFullYear(), today.getMonth(), 1) ? COLORS.roseBorder : COLORS.muted, fontSize: 20, padding: "4px 8px" }}>›</button>
      </div>

      {/* Kalender grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {["Ma","Di","Wo","Do","Vr","Za","Zo"].map(d => (
          <div key={d} style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500, textAlign: "center", padding: "4px 0" }}>{d}</div>
        ))}
        {cells.map((dayNum, i) => {
          if (!dayNum) return <div key={i} />;
          const key = dayKey(dayNum);
          const hasOchtend = !!ochtendByDay[key];
          const hasAvond = !!avondByDay[key];
          const hasFood = (foodByDay[key] || []).length > 0;
          const hasWeight = !!weightByDay[key];
          const cycleInfo = getCycleInfoForDate(profile?.facts?.lastperiod, profile?.facts?.cyclelength, new Date(year, month, dayNum));
          const isToday = key === todayKey;
          const isSelected = selectedDay === dayNum;
          const isPast = new Date(year, month, dayNum) <= today;

          return (
            <button key={i} onClick={() => isPast && setSelectedDay(selectedDay === dayNum ? null : dayNum)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", padding: "2px", borderRadius: 10, cursor: isPast ? "pointer" : "default",
                border: isToday ? `1.5px solid ${COLORS.rose}` : isSelected ? `1.5px solid ${COLORS.roseDark}` : "1.5px solid transparent",
                background: isSelected ? COLORS.roseLight : "transparent", opacity: isPast ? 1 : 0.2, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, color: isToday ? COLORS.rose : COLORS.text, lineHeight: 1 }}>{dayNum}</div>
              <div style={{ display: "flex", gap: 1.5, alignItems: "center", marginTop: 3 }}>
                {cycleInfo.day && <div style={{ width: 4, height: 4, borderRadius: "50%", background: cycleInfo.phase.color }} />}
                {hasOchtend && <div style={{ width: 4, height: 4, borderRadius: "50%", background: COLORS.rose }} />}
                {hasAvond && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#9B8EC4" }} />}
                {hasFood && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#A0C4A8" }} />}
                {hasWeight && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#E8C4A0" }} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legende */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 10, color: COLORS.muted }}>
        {[["Cyclus dag", COLORS.roseBorder], ["🌤 Ochtend", COLORS.rose], ["🌙 Avond", "#9B8EC4"], ["Voeding", "#A0C4A8"], ["Gewicht", "#E8C4A0"]].map(([lbl, col]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />{lbl}
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 13, padding: 20 }}>Laden...</div>}

      {/* Dagdetail */}
      {selectedDay && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Header */}
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>
            {new Date(year, month, selectedDay).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
          </div>

          {/* Cyclus */}
          {selCycle?.day && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: COLORS.roseLight, borderRadius: 12, border: `0.5px solid ${COLORS.roseBorder}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: selCycle.phase.color }} />
              <span style={{ fontSize: 12, color: COLORS.text }}>Dag {selCycle.day} — {selCycle.phase.tip}</span>
            </div>
          )}

          {/* Gewicht */}
          {selWeight && (
            <Card style={{ background: "#FFF8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Label>Gewicht</Label>
                <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>{selWeight} kg</span>
              </div>
            </Card>
          )}

          {/* Ochtend check-in */}
          {selOchtend ? (
            <Card>
              <Label>🌤 Ochtend check-in</Label>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 0 }}>
                <Row label="Stemming bij opstaan" value={selOchtend.wake_mood !== null ? `${MOODS[selOchtend.wake_mood]} ${MOOD_LABELS[selOchtend.wake_mood]}` : null} />
                <Row label="Energie" value={selOchtend.energy ? `${selOchtend.energy}/5 ${"●".repeat(selOchtend.energy)}${"○".repeat(5 - selOchtend.energy)}` : null} />
                <Row label="Geslapen" value={selOchtend.slept} />
              </div>
              {selOchtend.intention && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: COLORS.roseLight, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>Intentie</div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic" }}>"{selOchtend.intention}"</div>
                </div>
              )}
              {selOchtend.note && (
                <div style={{ marginTop: 6, fontSize: 12, color: COLORS.muted }}>Notitie: {selOchtend.note}</div>
              )}
            </Card>
          ) : (
            <Card style={{ opacity: 0.6 }}>
              <div style={{ fontSize: 13, color: COLORS.muted }}>🌤 Geen ochtend check-in op deze dag</div>
            </Card>
          )}

          {/* Avond check-in */}
          {selAvond ? (
            <Card style={{ background: COLORS.lavender, border: `0.5px solid ${COLORS.lavenderBorder}` }}>
              <Label>🌙 Avond check-in</Label>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 0 }}>
                <Row label="Hoe was de dag" value={selAvond.day_rating ? `${selAvond.day_rating}/5 ${"●".repeat(selAvond.day_rating)}${"○".repeat(5 - selAvond.day_rating)}` : null} />
                <Row label="Bewogen" value={selAvond.moved !== null ? (selAvond.moved ? `Ja${selAvond.movement_note ? ` — ${selAvond.movement_note}` : ""}` : "Nee") : null} />
              </div>
              {selAvond.gratitude && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,255,255,0.5)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>Dankbaar voor</div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic" }}>"{selAvond.gratitude}"</div>
                </div>
              )}
              {selAvond.release && (
                <div style={{ marginTop: 6, padding: "8px 12px", background: "rgba(255,255,255,0.5)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>Losgelaten</div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic" }}>"{selAvond.release}"</div>
                </div>
              )}
            </Card>
          ) : null}

          {/* Voeding */}
          {selFood.length > 0 ? (
            <Card>
              <Label>Voeding</Label>
              <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 10 }}>
                {[["kcal", foodTotals.kcal, COLORS.rose], ["eiwit", `${foodTotals.protein}g`, "#A0C4E8"], ["koolhyd.", `${foodTotals.carbs}g`, "#A0E8C4"], ["vet", `${foodTotals.fat}g`, "#E8C4A0"]].map(([lbl, val, col]) => (
                  <div key={lbl} style={{ flex: 1, background: COLORS.roseLight, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{val}</div>
                    <div style={{ fontSize: 9, color: COLORS.muted }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {["ontbijt","lunch","diner","snack"].map(meal => {
                const items = selFood.filter(f => f.meal === meal);
                if (!items.length) return null;
                const mealKcal = items.reduce((s, f) => s + (f.kcal || 0), 0);
                return (
                  <div key={meal} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.muted, textTransform: "capitalize", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                      <span>{meal}</span><span>{mealKcal} kcal</span>
                    </div>
                    {items.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.text, padding: "3px 0", borderBottom: `0.5px solid ${COLORS.roseBorder}` }}>
                        <span>{f.product_name}{f.grams ? ` (${f.grams}g)` : ""}</span>
                        <span style={{ color: COLORS.rose, fontWeight: 500 }}>{f.kcal} kcal</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Card>
          ) : (
            <Card style={{ opacity: 0.6 }}>
              <div style={{ fontSize: 13, color: COLORS.muted }}>Geen voeding gelogd op deze dag</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}


// ── HUMAN DESIGN SCREEN ───────────────────────────────────
const HD_CENTERS = [
  { id: "Head",     label: "Hoofd",       x: 185, y: 18,  w: 70, h: 50, shape: "triangle-up" },
  { id: "Ajna",     label: "Ajna",        x: 185, y: 88,  w: 70, h: 50, shape: "triangle-down" },
  { id: "Throat",   label: "Keel",        x: 175, y: 168, w: 90, h: 42, shape: "rect" },
  { id: "G",        label: "G / Zelf",    x: 165, y: 240, w: 110,h: 80, shape: "diamond" },
  { id: "Heart",    label: "Hart / Ego",  x: 88,  y: 242, w: 60, h: 60, shape: "triangle-down" },
  { id: "Sacral",   label: "Sacraal",     x: 165, y: 348, w: 110,h: 60, shape: "rect" },
  { id: "Spleen",   label: "Milt",        x: 68,  y: 310, w: 75, h: 75, shape: "triangle-up" },
  { id: "Solar",    label: "Zonnevlecht", x: 283, y: 310, w: 75, h: 75, shape: "triangle-up" },
  { id: "Root",     label: "Wortel",      x: 165, y: 432, w: 110,h: 60, shape: "rect" },
];

function HdCenter({ center, defined }) {
  const fill = defined ? COLORS.rose : COLORS.roseLight;
  const stroke = defined ? COLORS.roseDark : COLORS.roseBorder;
  const textColor = defined ? COLORS.white : COLORS.muted;
  const { x, y, w, h, label, shape } = center;
  const cx = x + w / 2;
  const cy = y + h / 2;

  let path = null;
  if (shape === "triangle-up") {
    path = `M${cx},${y} L${x + w},${y + h} L${x},${y + h} Z`;
  } else if (shape === "triangle-down") {
    path = `M${x},${y} L${x + w},${y} L${cx},${y + h} Z`;
  } else if (shape === "diamond") {
    path = `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
  }

  return (
    <g>
      {shape === "rect" ? (
        <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={1.5} />
      ) : (
        <path d={path} fill={fill} stroke={stroke} strokeWidth={1.5} />
      )}
      <text x={cx} y={cy + (shape === "triangle-up" ? 10 : shape === "triangle-down" ? -5 : 0)} textAnchor="middle" dominantBaseline="middle" fill={textColor} fontSize={shape === "rect" ? 11 : 9} fontFamily="DM Sans, sans-serif" fontWeight={defined ? 600 : 400}>
        {label}
      </text>
    </g>
  );
}

function HumanDesignScreen({ profile, user }) {
  const facts = profile?.facts || {};
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const canCalculate = facts.birthdate && facts.birthtime && facts.birthplace;

  useEffect(() => {
    if (canCalculate) fetchChart();
  }, []);

  async function fetchChart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hd-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthdate: facts.birthdate, birthtime: facts.birthtime, birthplace: facts.birthplace }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChart(data);
      // Sla type, profiel, autoriteit automatisch op in profiel
      if (user && data.type) {
        await supabase.from("profiles").update({
          hdtype: data.type,
          hdprofile: data.profile,
          hdauthority: data.authority,
        }).eq("id", user.id);
        setSaved(true);
      }
    } catch (e) {
      setError("Kon de chart niet berekenen. Controleer of je geboortegegevens volledig zijn ingevuld.");
    }
    setLoading(false);
  }

  const TYPE_DESC = {
    "Generator": "Je bent er om te doen wat je energie geeft. Jouw kracht zit in je respons — niet in initiatief nemen.",
    "Manifesting Generator": "Je combineert energie met actie. Je bent snel, multi-gepassioneerd en gemaakt om te experimenteren.",
    "Projector": "Jij ziet mensen door en door. Je bent er om te begeleiden — wacht op de uitnodiging.",
    "Manifestor": "Jij initieert. Je bent hier om impact te maken — informeer de mensen om je heen.",
    "Reflector": "Jij weerspiegelt de gezondheid van je omgeving. Neem de tijd voor grote beslissingen.",
  };

  const AUTHORITY_DESC = {
    "Sacral": "Luister naar je buikgevoel — een direct ja of nee gevoel in je lijf.",
    "Emotional": "Wacht op emotionele helderheid voor grote beslissingen. Slaap er een nacht over.",
    "Splenic": "Vertrouw op je spontane instinct in het moment.",
    "Ego": "Vertrouw op wat jij echt wilt. Jouw wil is jouw autoriteit.",
    "Self": "Luister naar wat jou vrolijk maakt en je richting geeft.",
    "Mental": "Praat je beslissing uit met vertrouwde mensen — niet voor advies, maar om te horen wat je zelf zegt.",
    "Lunar": "Wacht een volledige maancyclus (28 dagen) voor grote beslissingen.",
  };

  if (!canCalculate) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>Human Design ✦</div>
      <Card>
        <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>
          Om je Human Design chart te berekenen heb ik je geboortedatum, geboortetijd en geboorteplaats nodig. Vul deze in via je profiel.
        </p>
      </Card>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>Human Design ✦</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{facts.birthdate} · {facts.birthtime} · {facts.birthplace}</div>
        </div>
        <button onClick={fetchChart} disabled={loading} style={{ background: "none", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: COLORS.rose, cursor: "pointer", fontFamily: "inherit" }}>
          {loading ? "..." : "↺ Herbereken"}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.muted, fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
          Lola berekent je chart...
        </div>
      )}

      {error && <Card><p style={{ fontSize: 13, color: COLORS.rose }}>{error}</p></Card>}

      {chart && !loading && (
        <>
          {saved && <div style={{ fontSize: 12, color: COLORS.rose, textAlign: "center" }}>✦ Profiel automatisch bijgewerkt</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Type", value: chart.type },
              { label: "Profiel", value: chart.profile },
              { label: "Autoriteit", value: chart.authority },
              { label: "Definitie", value: chart.definition },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: COLORS.roseLight, borderRadius: 16, padding: "14px", border: `0.5px solid ${COLORS.roseBorder}` }}>
                <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{value || "—"}</div>
              </div>
            ))}
          </div>

          {chart.incarnation_cross && (
            <Card>
              <Label>Incarnatiekruis</Label>
              <div style={{ fontSize: 13, color: COLORS.text, marginTop: 4, lineHeight: 1.6 }}>{chart.incarnation_cross}</div>
            </Card>
          )}

          {chart.type && TYPE_DESC[chart.type] && (
            <Card style={{ background: COLORS.cream }}>
              <Label>Wat dit betekent voor jou</Label>
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, marginTop: 6 }}>{TYPE_DESC[chart.type]}</p>
              {chart.authority && AUTHORITY_DESC[chart.authority] && (
                <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7, marginTop: 8, paddingTop: 8, borderTop: `0.5px solid ${COLORS.roseBorder}` }}>
                  <strong style={{ color: COLORS.text }}>Autoriteit:</strong> {AUTHORITY_DESC[chart.authority]}
                </p>
              )}
            </Card>
          )}

          <Card>
            <Label>Bodygraph — gedefinieerde centra</Label>
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <svg viewBox="0 0 440 510" style={{ width: "100%", maxWidth: 440 }}>
                {HD_CENTERS.map(c => (
                  <HdCenter key={c.id} center={c} defined={(chart.centers || []).some(d => d.toLowerCase().includes(c.id.toLowerCase()) || c.label.toLowerCase().includes(d.toLowerCase()))} />
                ))}
              </svg>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: COLORS.muted }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.rose }} /> Gedefinieerd
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.roseLight, border: `1px solid ${COLORS.roseBorder}` }} /> Open
              </div>
            </div>
          </Card>

          {chart.gates && chart.gates.length > 0 && (
            <Card>
              <Label>Actieve poorten</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {chart.gates.map(g => (
                  <span key={g} style={{ fontSize: 12, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>Poort {g}</span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── MAANDDOELEN ───────────────────────────────────────────
const GOAL_CATEGORIES = ["beweging", "voeding", "slaap", "mentaal", "cyclus", "gewoonte"];
const CATEGORY_COLORS = { beweging: "#A0E8C4", voeding: "#A0C4E8", slaap: "#C4A0E8", mentaal: "#E8C4A0", cyclus: "#E8A0B4", gewoonte: "#C4748A" };

function MonthlyGoalsScreen({ user, profile }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthLabel = new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", category: "beweging", target: 20, unit: "dagen", note: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("monthly_goals").select("*").eq("user_id", user.id).eq("month", thisMonth).maybeSingle()
      .then(({ data }) => { setGoals(data?.goals || []); setLoading(false); });
  }, [user]);

  async function saveGoals(updated) {
    setGoals(updated);
    await supabase.from("monthly_goals")
      .upsert({ user_id: user.id, month: thisMonth, goals: updated, updated_at: new Date().toISOString() }, { onConflict: "user_id,month" });
  }

  async function toggleDay(idx) {
    const today = new Date().toISOString().slice(0, 10);
    const updated = goals.map((g, i) => {
      if (i !== idx) return g;
      const done = g.done_dates || [];
      const alreadyDone = done.includes(today);
      return { ...g, done_dates: alreadyDone ? done.filter(d => d !== today) : [...done, today] };
    });
    await saveGoals(updated);
  }

  async function removeGoal(idx) {
    await saveGoals(goals.filter((_, i) => i !== idx));
  }

  async function addGoal() {
    if (!newGoal.title.trim()) return;
    await saveGoals([...goals, { ...newGoal, done_dates: [], created_at: new Date().toISOString() }]);
    setNewGoal({ title: "", category: "beweging", target: 20, unit: "dagen", note: "" });
    setShowAdd(false);
  }

  async function generateGoals() {
    setGenerating(true);
    const facts = profile?.facts || {};
    const { day: cycleDay, phase } = getCycleInfo(facts.lastperiod, facts.cyclelength);
    const prompt = `Stel 4 haalbare maanddoelen voor voor ${facts.name || "deze vrouw"} voor de maand ${monthLabel}.

Context:
- Human Design: ${facts.hdtype || "onbekend"}, profiel ${facts.hdprofile || "?"}, autoriteit ${facts.hdauthority || "?"}
- Sterrenbeeld: ${getZodiac(facts.birthdate) || "onbekend"}
- Cyclusfase nu: ${phase.name}${cycleDay ? `, dag ${cycleDay}` : ""}
- Cycluslengte: ${facts.cyclelength || "onbekend"}
- Werk: ${facts.work || "onbekend"}
- Relatie: ${facts.relationship_status || "onbekend"}

Geef de doelen terug als JSON array:
[{"title": "...", "category": "beweging|voeding|slaap|mentaal|cyclus|gewoonte", "target": 20, "unit": "dagen", "note": "korte uitleg waarom dit past bij haar"}]

Zorg dat de doelen:
- Realistisch en concreet zijn (niet vaag)
- Passen bij haar HD-type en cyclusfase
- Variëren in categorie
- Aanvoelen als afgesproken met een coach, niet opgelegd

Alleen de JSON array, geen uitleg.`;

    const reply = await askLola([{ role: "user", content: prompt }],
      "Je bent Lola, een warme coach. Geef praktische maanddoelen terug als JSON. Geen uitleg, alleen de JSON array."
    );
    try {
      const match = reply.match(/\[[\s\S]*\]/);
      const suggested = match ? JSON.parse(match[0]) : [];
      const withDates = suggested.map(g => ({ ...g, done_dates: [], created_at: new Date().toISOString() }));
      await saveGoals([...goals, ...withDates]);
    } catch {}
    setGenerating(false);
  }

  const today = new Date().toISOString().slice(0, 10);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysPassed = new Date().getDate();

  if (loading) return <div style={{ padding: 20, color: COLORS.muted, fontSize: 13 }}>Laden...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text, textTransform: "capitalize" }}>{monthLabel}</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>Dag {daysPassed} van {daysInMonth}</div>
        </div>
        <button onClick={generateGoals} disabled={generating} style={{ padding: "9px 16px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
          {generating ? "Denken..." : "✦ Lola stelt voor"}
        </button>
      </div>

      {goals.length === 0 && !generating && (
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
          <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7, marginBottom: 12 }}>Nog geen doelen voor deze maand. Laat Lola er een paar voorstellen op basis van jouw profiel, of voeg zelf een doel toe.</p>
        </Card>
      )}

      {goals.map((g, i) => {
        const doneDates = g.done_dates || [];
        const doneCount = doneDates.length;
        const doneToday = doneDates.includes(today);
        const progress = Math.min(doneCount / (g.target || 1), 1);
        const catColor = CATEGORY_COLORS[g.category] || COLORS.roseLight;

        return (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, background: catColor, borderRadius: 20, padding: "2px 10px", color: COLORS.text, fontWeight: 500 }}>{g.category}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{g.title}</span>
                </div>
                {g.note && <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>{g.note}</div>}
              </div>
              <button onClick={() => removeGoal(i)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, padding: "0 0 0 8px", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: COLORS.roseLight, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ width: `${progress * 100}%`, height: "100%", background: catColor, borderRadius: 10, transition: "width 0.3s" }} />
              </div>
              <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0 }}>{doneCount}/{g.target} {g.unit}</span>
            </div>

            <button onClick={() => toggleDay(i)} style={{ marginTop: 10, width: "100%", padding: "10px", borderRadius: 16, border: `1.5px solid ${doneToday ? catColor : COLORS.roseBorder}`, background: doneToday ? catColor : "transparent", color: doneToday ? COLORS.text : COLORS.muted, fontSize: 13, fontWeight: doneToday ? 500 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              {doneToday ? "✓ Vandaag gedaan" : "Vandaag markeren"}
            </button>
          </Card>
        );
      })}

      {showAdd && (
        <Card>
          <Label>Nieuw doel toevoegen</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <input placeholder="Doel omschrijving..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} style={{ padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", color: COLORS.text, outline: "none" }} />
            <select value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} style={{ padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", color: COLORS.text, outline: "none", appearance: "none" }}>
              {GOAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: Number(e.target.value) }))} style={{ width: 80, padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", color: COLORS.text, outline: "none" }} />
              <input placeholder="eenheid (bijv. dagen, keer)" value={newGoal.unit} onChange={e => setNewGoal(p => ({ ...p, unit: e.target.value }))} style={{ flex: 1, padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", color: COLORS.text, outline: "none" }} />
            </div>
            <input placeholder="Toelichting (optioneel)" value={newGoal.note} onChange={e => setNewGoal(p => ({ ...p, note: e.target.value }))} style={{ padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", color: COLORS.text, outline: "none" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addGoal} style={{ flex: 1, padding: "11px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Toevoegen</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: "11px 16px", borderRadius: 20, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuleer</button>
            </div>
          </div>
        </Card>
      )}

      {!showAdd && (
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 20, border: `1.5px dashed ${COLORS.roseBorder}`, background: "transparent", color: COLORS.rose, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          + Zelf doel toevoegen
        </button>
      )}
    </div>
  );
}

// ── PROFIEL SCREEN ────────────────────────────────────────
function WeightChart({ user }) {
  const [logs, setLogs] = useState([]);
  const [newWeight, setNewWeight] = useState("");
  useEffect(() => {
    if (!user) return;
    supabase.from("weight_logs").select("weight,created_at").eq("user_id", user.id)
      .order("created_at", { ascending: true }).limit(60)
      .then(({ data }) => setLogs(data || []));
  }, [user]);

  async function logWeight() {
    if (!newWeight) return;
    const w = parseFloat(newWeight);
    await supabase.from("weight_logs").insert({ user_id: user.id, weight: w, unit: "kg" });
    setLogs(prev => [...prev, { weight: w, created_at: new Date().toISOString() }]);
    setNewWeight("");
  }

  const last = logs.slice(-30);
  const min = last.length ? Math.min(...last.map(l => l.weight)) - 1 : 60;
  const max = last.length ? Math.max(...last.map(l => l.weight)) + 1 : 80;
  const range = max - min || 1;
  const W = 300, H = 80;

  return (
    <Card>
      <Label>Gewicht</Label>
      {last.length > 1 && (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", marginTop: 8, marginBottom: 4 }}>
          <polyline
            points={last.map((l, i) => `${(i / (last.length - 1)) * W},${H - ((l.weight - min) / range) * H}`).join(" ")}
            fill="none" stroke={COLORS.rose} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
          {last.map((l, i) => (
            <circle key={i} cx={(i / (last.length - 1)) * W} cy={H - ((l.weight - min) / range) * H} r="3" fill={COLORS.rose} />
          ))}
        </svg>
      )}
      {last.length > 0 && (
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>
          Laatste: <strong style={{ color: COLORS.text }}>{last[last.length - 1].weight} kg</strong>
          {last.length > 1 && ` · ${(last[last.length - 1].weight - last[0].weight > 0 ? "+" : "")}${(last[last.length - 1].weight - last[0].weight).toFixed(1)} kg in ${last.length} metingen`}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Gewicht in kg" style={{ flex: 1, padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", color: COLORS.text, outline: "none" }} />
        <button onClick={logWeight} style={{ padding: "10px 16px", borderRadius: 14, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Log</button>
      </div>
    </Card>
  );
}

function ProfileScreen({ profile, user, onProfileUpdated, onRestartIntake }) {
  const facts = profile?.facts || {};
  const [form, setForm] = useState({
    name: facts.name || "",
    birthdate: facts.birthdate || "",
    birthtime: facts.birthtime || "",
    birthplace: facts.birthplace || "",
    work: facts.work || "",
    relationship_status: facts.relationship_status || "",
    children: facts.children || "",
    living_situation: facts.living_situation || "",
    hdtype: facts.hdtype || "",
    hdprofile: facts.hdprofile || "",
    hdauthority: facts.hdauthority || "",
    cyclelength: facts.cyclelength || "28–32 dagen",
    lastperiod: facts.lastperiod || "",
    kcal_goal: facts.kcal_goal || "",
    protein_goal: facts.protein_goal || "",
    fat_goal: facts.fat_goal || "",
  });
  const [portrait, setPortrait] = useState(facts.personality_profile || "");
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false); };

  async function regeneratePortrait() {
    setRegenerating(true);
    const zodiac = getZodiac(form.birthdate);
    const age = form.birthdate ? Math.floor((Date.now() - new Date(form.birthdate)) / (365.25 * 86400000)) : null;
    const prompt = `Schrijf een persoonlijk portret van ${form.name} in de derde persoon, op basis van haar profielgegevens. Schrijf warm, inzichtelijk en concreet.

Profielgegevens:
- Naam: ${form.name}
- Leeftijd: ${age ? age + " jaar" : "onbekend"}
- Geboorteplaats: ${form.birthplace || "onbekend"}
- Sterrenbeeld: ${zodiac || "onbekend"}
- Werk: ${form.work || "onbekend"}
- Relatiestatus: ${form.relationship_status || "onbekend"}
- Kinderen: ${form.children || "onbekend"}
- Woonsituatie: ${form.living_situation || "onbekend"}
- Human Design type: ${form.hdtype || "onbekend"}
- HD Profiel: ${form.hdprofile || "onbekend"}
- HD Autoriteit: ${form.hdauthority || "onbekend"}
- Cycluslengte: ${form.cyclelength || "onbekend"}
${portrait ? `\nHuidig portret (gebruik dit als basis, vul aan of pas aan):\n${portrait}` : ""}

Schrijf in het Nederlands. Max 450 woorden. Doorlopende tekst, geen kopjes. Verwerk HD, sterrenbeeld en cyclus als context voor wie ze is.`;

    const newPortrait = await askLola([{ role: "user", content: prompt }],
      "Je bent Lola, een persoonlijke coach. Schrijf op basis van de gegeven informatie een portret. Geen vragen, geen kopjes. Gewoon een helder, warm beschrijvend portret in het Nederlands."
    );
    setPortrait(newPortrait);
    setSaved(false);
    setRegenerating(false);
  }

  const zodiac = getZodiac(form.birthdate);
  const age = form.birthdate ? Math.floor((Date.now() - new Date(form.birthdate)) / (365.25 * 86400000)) : null;

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 14, border: `1.5px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginTop: 6 };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

  async function save() {
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, ...form, personality_profile: portrait });
    onProfileUpdated({ ...facts, ...form, personality_profile: portrait });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text, marginBottom: 4 }}>Jouw profiel</div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>Alles wat Lola over jou weet</div>
      </div>

      {(zodiac || age) && (
        <div style={{ display: "flex", gap: 10 }}>
          {zodiac && <div style={{ flex: 1, background: COLORS.roseLight, borderRadius: 16, padding: "12px 14px", border: `0.5px solid ${COLORS.roseBorder}` }}>
            <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>Sterrenbeeld</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text }}>{zodiac}</div>
          </div>}
          {age && <div style={{ flex: 1, background: COLORS.roseLight, borderRadius: 16, padding: "12px 14px", border: `0.5px solid ${COLORS.roseBorder}` }}>
            <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>Leeftijd</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text }}>{age} jaar</div>
          </div>}
        </div>
      )}

      <Card style={{ background: COLORS.cream }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Label>Lola's portret van jou</Label>
          <button onClick={regeneratePortrait} disabled={regenerating} style={{ background: "none", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "5px 12px", fontSize: 11, color: COLORS.rose, cursor: "pointer", fontFamily: "inherit" }}>
            {regenerating ? "Schrijven..." : "↺ Herschrijven"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Dit is wat Lola onthoudt over wie jij bent. Je kunt het zelf aanpassen — bijvoorbeeld als je werk of relatiestatus verandert.
        </p>
        {portrait ? (
          <textarea
            value={portrait}
            onChange={e => { setPortrait(e.target.value); setSaved(false); }}
            rows={10}
            style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.7 }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
            <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
              Nog geen portret. Doe de intake om er een te genereren, of laat Lola er nu een schrijven op basis van je profielgegevens.
            </p>
            <button onClick={regeneratePortrait} disabled={regenerating} style={{ padding: "10px 20px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {regenerating ? "Schrijven..." : "✦ Portret laten schrijven"}
            </button>
          </div>
        )}
      </Card>

      <Card>
        <Label>Persoonlijk</Label>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
          {[["name","Naam","text","Jouw naam"],["birthdate","Geboortedatum","date",null],["birthtime","Geboortetijd","time",null],["birthplace","Geboorteplaats","text","Stad, land"]].map(([k,lbl,type,ph]) => (
            <div key={k}>
              <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>{lbl}</label>
              <input type={type} value={form[k]} placeholder={ph || ""} onChange={e => set(k, e.target.value)} style={inputStyle} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Leefsituatie</Label>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Werk / beroep</label>
            <input type="text" value={form.work} placeholder="bijv. Zelfstandig ondernemer, marketeer..." onChange={e => set("work", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Relatiestatus</label>
            <select value={form.relationship_status} onChange={e => set("relationship_status", e.target.value)} style={selectStyle}>
              <option value="">Liever niet zeggen</option>
              {["Single","Daterend","Relatie","Samenwonend","Getrouwd","Gescheiden","Weduwe"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Kinderen</label>
            <select value={form.children} onChange={e => set("children", e.target.value)} style={selectStyle}>
              <option value="">Niet ingevuld</option>
              {["Geen kinderen","1 kind","2 kinderen","3 of meer kinderen","Zwanger"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Woonsituatie</label>
            <select value={form.living_situation} onChange={e => set("living_situation", e.target.value)} style={selectStyle}>
              <option value="">Niet ingevuld</option>
              {["Alleen","Met partner","Met kinderen","Met partner en kinderen","Met huisgenoten","Bij familie"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <Label>Human Design</Label>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Type</label>
            <select value={form.hdtype} onChange={e => set("hdtype", e.target.value)} style={selectStyle}>
              <option value="">Onbekend</option>
              {["Manifestor","Generator","Manifesting Generator","Projector","Reflector"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Profiel (bijv. 2/4)</label>
            <input type="text" value={form.hdprofile} placeholder="bijv. 2/4, 1/3, 6/2..." onChange={e => set("hdprofile", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Autoriteit</label>
            <select value={form.hdauthority} onChange={e => set("hdauthority", e.target.value)} style={selectStyle}>
              <option value="">Onbekend</option>
              {["Emotioneel","Sacraal","Splenisch","Ego/Hart","Zelf/G-centrum","Mentaal","Maanautoriteit"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <Label>Cyclus</Label>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Gemiddelde cycluslengte</label>
            <select value={form.cyclelength} onChange={e => set("cyclelength", e.target.value)} style={selectStyle}>
              {["Korter dan 25 dagen","25–28 dagen","28–32 dagen","Langer dan 32 dagen","Onregelmatig"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.muted }}>Eerste dag laatste menstruatie</label>
            <input type="date" value={form.lastperiod} onChange={e => set("lastperiod", e.target.value)} style={inputStyle} />
          </div>
        </div>
      </Card>

      <Card>
        <Label>Dagelijkse voedingsdoelen</Label>
        <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10, marginTop: 4, lineHeight: 1.5 }}>Stel doelen in voor de voortgangsbalken in de voedingstracker.</p>
        <div style={{ display: "flex", gap: 10 }}>
          {[["kcal_goal","Kcal","bijv. 1800"], ["protein_goal","Eiwit (g)","bijv. 100"], ["fat_goal","Vetten (g)","bijv. 60"]].map(([k, lbl, ph]) => (
            <div key={k} style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 500 }}>{lbl}</label>
              <input type="number" value={form[k]} placeholder={ph} onChange={e => set(k, e.target.value)} style={{ ...inputStyle, marginTop: 4, padding: "9px 12px", fontSize: 13 }} />
            </div>
          ))}
        </div>
      </Card>

      <button onClick={save} disabled={saving} style={{ padding: "15px", borderRadius: 24, background: saved ? COLORS.softGreen : COLORS.rose, border: saved ? `1px solid ${COLORS.softGreenBorder}` : "none", color: saved ? COLORS.text : COLORS.white, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 0.3s" }}>
        {saving ? "Opslaan..." : saved ? "✓ Opgeslagen" : "Profiel opslaan"}
      </button>

      <Card style={{ background: COLORS.lavender, border: `0.5px solid ${COLORS.lavenderBorder}` }}>
        <Label>Intakegesprek</Label>
        <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.6, marginTop: 6, marginBottom: 12 }}>
          Het intakegesprek helpt Lola om jou echt te leren kennen. Aan het einde schrijft ze een persoonlijk portret op basis van het gesprek.
        </p>
        <button onClick={onRestartIntake} style={{ width: "100%", padding: "13px", borderRadius: 24, background: "transparent", border: `1.5px solid ${COLORS.lavenderBorder}`, color: COLORS.text, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          ↺ Intakegesprek (opnieuw) starten
        </button>
      </Card>

      <WeightChart user={user} />

      <HumanDesignScreen profile={profile} user={user} />
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("auth");
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("lola");
  const [user, setUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkinType, setCheckinType] = useState("ochtend");

  function goHome() {
    setScreen("home");
    setRefreshKey(k => k + 1);
  }

  function navigateTo(id) {
    if (id === "home") setRefreshKey(k => k + 1);
    setScreen(id);
  }

  function openCheckin(type = "ochtend") {
    setCheckinType(type);
    setScreen("checkin");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle().then(({ data, error }) => {
          if (data?.id) {
            // Profiel gevonden — ga direct naar de app
            setProfile({ facts: data });
            setPhase("app");
          } else if (!error) {
            // Geen profiel — nieuwe gebruiker, start intake
            setPhase("facts");
          } else {
            // DB-fout — ga toch naar de app om te voorkomen dat bestaande gebruiker opnieuw intake doet
            console.error("Profile load error:", error);
            setProfile({ facts: {} });
            setPhase("app");
          }
        });
      }
    });
  }, []);

  if (phase === "auth") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bone, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${COLORS.bone}; overflow-x: hidden; } input, button, textarea, select { max-width: 100%; font-family: inherit; } ::-webkit-scrollbar { display: none; }`}</style>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 60px" }}>
          <div style={{ marginBottom: 40 }}>
            <LolaLogo size="md" />
          </div>
          <AuthScreen onAuth={(u) => { setUser(u); setPhase("facts"); }} />
        </div>
      </div>
    );
  }
  if (phase === "facts") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bone, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${COLORS.bone}; overflow-x: hidden; } input, button, textarea, select { max-width: 100%; font-family: inherit; } ::-webkit-scrollbar { display: none; }`}</style>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 60px" }}>
          <div style={{ marginBottom: 40 }}>
            <LolaLogo size="md" />
          </div>
<IntakeFacts onDone={async (facts) => {
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    name: facts.name,
    birthdate: facts.birthdate,
    birthtime: facts.birthtime,
    birthplace: facts.birthplace,
    hdtype: facts.hdtype,
    cyclelength: facts.cyclelength,
    lastperiod: facts.lastperiod,
  });
  if (error) console.error(error);
  setProfile({ facts });
  setPhase("chat");
}}
onSkip={async () => {
  const facts = { name: "Iris", hdtype: "Projector", cyclelength: "28–32 dagen", lastperiod: "2025-04-07" };
  await supabase.from("profiles").upsert({ id: user.id, ...facts });
  setProfile({ facts });
  setPhase("app");
}}
/>
        </div>
      </div>
    );
  }

  if (phase === "chat") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bone, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${COLORS.bone}; overflow-x: hidden; } input, button, textarea, select { max-width: 100%; font-family: inherit; } ::-webkit-scrollbar { display: none; }`}</style>
        <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 60px" }}>
          <div style={{ marginBottom: 24 }}>
            <LolaLogo size="md" />
          </div>
          <IntakeChat facts={profile.facts} onDone={async (fullProfile) => {
            if (fullProfile.personality_profile && user) {
              await supabase.from("profiles").update({ personality_profile: fullProfile.personality_profile }).eq("id", user.id);
            }
            setProfile(fullProfile);
            setPhase("welcome");
          }} />
        </div>
      </div>
    );
  }

  if (phase === "welcome") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bone, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${COLORS.bone}; overflow-x: hidden; } input, button, textarea, select { max-width: 100%; font-family: inherit; } ::-webkit-scrollbar { display: none; }`}</style>
        <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
        <WelcomeScreen profile={profile} onStart={() => setPhase("app")} />
      </div>
    );
  }

  const { day: cycleDay, phase: currentPhase } = getCycleInfo(profile?.facts?.lastperiod, profile?.facts?.cyclelength);

  // "loggen" tab: check-in keuze + voedingstracker
  function LoggenScreen() {
    const hour = new Date().getHours();
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 26, fontWeight: 300, color: COLORS.fig, lineHeight: 1.1 }}>
          Loggen
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { setCheckinType("ochtend"); setScreen("checkin"); }}
            style={{ flex: 1, padding: "18px 14px", borderRadius: 16, background: COLORS.figLight, border: `1px solid ${COLORS.figBorder}`, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>🌤</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.ink }}>Ochtend</div>
            <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Stemming, energie, slaap</div>
          </button>
          <button
            onClick={() => { setCheckinType("avond"); setScreen("checkin"); }}
            style={{ flex: 1, padding: "18px 14px", borderRadius: 16, background: COLORS.boneWarm, border: `1px solid ${COLORS.figBorder}`, cursor: "pointer", fontFamily: "inherit", textAlign: "left", opacity: hour >= 16 ? 1 : 0.5 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>🌙</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.ink }}>Avond</div>
            <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Dag, dankbaarheid</div>
          </button>
        </div>
        <FoodScreen user={user} />
      </div>
    );
  }

  const screenMap = {
    lola: <LolaScreen profile={profile} user={user} />,
    home: <HomeScreen
      key={refreshKey}
      profile={profile}
      onCheckin={(type) => openCheckin(type)}
      onGoToLola={() => setScreen("lola")}
      user={user}
      onPeriodLogged={(dateStr) => setProfile(p => ({ ...p, facts: { ...p.facts, lastperiod: dateStr } }))}
    />,
    loggen: <LoggenScreen />,
    checkin: <CheckInScreen key={checkinType} user={user} checkinType={checkinType} onDone={() => { setScreen("loggen"); setRefreshKey(k => k + 1); }} />,
    food: <FoodScreen user={user} />,
    history: <HistoryScreen user={user} profile={profile} />,
    goals: <MonthlyGoalsScreen user={user} profile={profile} />,
    profile: <ProfileScreen profile={profile} user={user} onProfileUpdated={(updated) => setProfile(p => ({ ...p, facts: updated }))} onRestartIntake={() => setPhase("chat")} />,
  };

  // NavBar toont de 5 hoofd-tabs; checkin/food/goals vallen er buiten
  const navScreen = ["lola", "home", "loggen", "history", "profile"].includes(screen) ? screen
    : screen === "checkin" ? "loggen"
    : screen === "food" ? "loggen"
    : screen === "goals" ? "home"
    : "lola";

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bone, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${COLORS.bone}; overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
  @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
  @keyframes spin { to{transform:rotate(360deg)} }
`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "32px 20px 100px" }}>
        {/* Header — alleen tonen buiten de Lola-chat */}
        {screen !== "lola" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <LolaLogo size="md" />
            {cycleDay && (
              <div style={{ fontSize: 11, color: COLORS.gray, background: COLORS.figLight, padding: "4px 12px", borderRadius: 20, border: `0.5px solid ${COLORS.figBorder}`, fontFamily: "'DM Sans', sans-serif" }}>
                Dag {cycleDay}
              </div>
            )}
          </div>
        )}
        {screenMap[screen]}
      </div>
      <NavBar active={navScreen} onChange={(id) => {
        if (id === "loggen") { setScreen("loggen"); }
        else navigateTo(id);
      }} />
    </div>
  );
}
