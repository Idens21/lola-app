import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

const COLORS = {
  cream: "#FEF9F5",
  rose: "#C4748A",
  roseDark: "#A85A72",
  roseLight: "#F5EAF0",
  roseBorder: "#E8C4D0",
  lavender: "#EDE8F5",
  lavenderBorder: "#D8CCF0",
  text: "#3D2828",
  muted: "#A89090",
  white: "#FFFFFF",
  softGreen: "#EAF4EE",
  softGreenBorder: "#C4DDC8",
};

const PHASES = [
  { name: "Menstruatie", days: "Dag 1–5", color: "#E8A0B4", desc: "Rust en herstel. Je lichaam werkt hard. Zacht bewegen, ijzerrijke voeding." },
  { name: "Folliculair", days: "Dag 6–13", color: "#A0C4E8", desc: "Energie stijgt. Goed moment voor nieuwe plannen en intensiever bewegen." },
  { name: "Ovulatoir", days: "Dag 14–16", color: "#A0E8C4", desc: "Piek energie. Sociale connectie, intensief sporten, zichtbaar zijn." },
  { name: "Luteaal", days: "Dag 17–28", color: "#C4748A", desc: "Naar binnen. Meer behoefte aan koolhydraten en warmte. Zachtheid mag." },
];

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
        <div style={{ fontSize: 36, color: COLORS.rose, marginBottom: 12 }}>✦</div>
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
    { id: "home", label: "Home", icon: <svg viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { id: "checkin", label: "Check-in", icon: <svg viewBox="0 0 22 22" fill="none"><rect x="4" y="6" width="14" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M8 11l2.5 2.5L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: "food", label: "Voeding", icon: <svg viewBox="0 0 22 22" fill="none"><path d="M11 18C11 18 5 14 5 9C5 6 7.5 4 11 4C14.5 4 17 6 17 9C17 14 11 18 11 18Z" stroke="currentColor" strokeWidth="1.5"/><line x1="11" y1="18" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { id: "history", label: "Kalender", icon: <svg viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 9h16" stroke="currentColor" strokeWidth="1.5"/><path d="M7 3v4M15 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="13" r="1" fill="currentColor"/><circle cx="11" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/></svg> },
    { id: "lola", label: "Lola", icon: <svg viewBox="0 0 22 22" fill="none"><path d="M11 4l1.5 4.5H17l-3.8 2.8 1.5 4.5L11 13l-3.7 2.8 1.5-4.5L5 8.5h4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: COLORS.cream, borderTop: `0.5px solid ${COLORS.roseBorder}`, display: "flex", justifyContent: "space-around", padding: "10px 0 env(safe-area-inset-bottom, 20px)", zIndex: 100 }}>
      {items.map((item) => (
        <button key={item.id} onClick={() => onChange(item.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: active === item.id ? COLORS.rose : COLORS.muted, fontFamily: "inherit", fontSize: 10, fontWeight: active === item.id ? 500 : 400 }}>
          <div style={{ width: 22, height: 22 }}>{item.icon}</div>
          {item.label}
        </button>
      ))}
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
        <div style={{ fontSize: 36, color: COLORS.rose, marginBottom: 12 }}>✦</div>
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
      setTimeout(() => onDone({ facts, conversation: newMessages }), 3000);
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
          style={{ flex: 1, padding: "12px 16px", borderRadius: 24, border: `1px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={send} disabled={loading} style={{ width: 46, height: 46, borderRadius: "50%", background: loading ? COLORS.roseBorder : COLORS.rose, border: "none", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M8 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }`}</style>
    </div>
  );
}

// ── WELKOMST SCHERM ───────────────────────────────────────
function WelcomeScreen({ profile, onStart }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
      <h1 style={{ fontSize: 36, fontWeight: 300, color: COLORS.text, marginBottom: 8, letterSpacing: "-0.02em" }}>
        Welkom,<br /><span style={{ fontWeight: 600 }}>{profile.facts.name}</span>
      </h1>
      <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.8, maxWidth: 340, marginBottom: 32 }}>
        Ik ken je nu een stukje beter. Jouw Lola is klaar — persoonlijk, voor jou.
      </p>
      <div style={{ background: COLORS.roseLight, borderRadius: 24, padding: "20px 24px", maxWidth: 360, marginBottom: 36, border: `1px solid ${COLORS.roseBorder}`, textAlign: "left" }}>
        <div style={{ fontSize: 10, color: COLORS.rose, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Lola zegt</div>
        <p style={{ fontSize: 14, color: COLORS.text, fontStyle: "italic", lineHeight: 1.7, margin: 0 }}>
          "Je hebt jezelf vandaag een geschenk gegeven — de bereidheid om eerlijk te kijken. Dat is zeldzamer dan je denkt. Laten we samen aan de slag gaan."
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
  const todayKey = new Date().toISOString().slice(0, 10);
  const { day: cycleDay, phase } = getCycleInfo(profile?.facts?.lastperiod, profile?.facts?.cyclelength);

  const [loggingPeriod, setLoggingPeriod] = useState(false);
  const [periodLogged, setPeriodLogged] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [todayFood, setTodayFood] = useState([]);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) { setLoadingData(false); return; }
    Promise.all([
      supabase.from("checkins").select("*").eq("user_id", user.id)
        .gte("created_at", todayKey + "T00:00:00").lte("created_at", todayKey + "T23:59:59")
        .eq("type", "ochtend").maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", user.id)
        .gte("created_at", todayKey + "T00:00:00").lte("created_at", todayKey + "T23:59:59"),
      supabase.from("checkins").select("energy,slept,wake_mood,created_at").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(7),
    ]).then(([{ data: ci }, { data: fl }, { data: rc }]) => {
      setTodayCheckin(ci);
      setTodayFood(fl || []);
      setRecentCheckins(rc || []);
      setLoadingData(false);
    });
  }, [user, todayKey]);

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
            <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.roseDark }}>{phase.name}{cycleDay ? ` · Dag ${cycleDay}` : ""}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 1.5 }}>{phase.desc}</div>
          </div>
        </div>
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

      <Card>
        {todayCheckin ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Label>Ochtend check-in gedaan ✦</Label>
              <button onClick={onCheckin} style={{ background: "none", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: COLORS.muted, cursor: "pointer", fontFamily: "inherit" }}>Wijzigen</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {todayCheckin.wake_mood !== null && <span style={{ fontSize: 12, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>{WAKE_MOODS[todayCheckin.wake_mood]} {WAKE_LABELS[todayCheckin.wake_mood]}</span>}
              {todayCheckin.energy && <span style={{ fontSize: 12, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>Energie {todayCheckin.energy}/5</span>}
              {todayCheckin.slept && <span style={{ fontSize: 12, background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "4px 12px", color: COLORS.text }}>{todayCheckin.slept}</span>}
            </div>
            {todayCheckin.intention && <p style={{ fontSize: 12, color: COLORS.muted, fontStyle: "italic", marginTop: 8 }}>"{todayCheckin.intention}"</p>}
            {hour >= 18 && (
              <button onClick={() => onCheckin("avond")} style={{ width: "100%", marginTop: 12, padding: "12px", borderRadius: 24, background: COLORS.lavender, border: `1px solid ${COLORS.lavenderBorder}`, color: COLORS.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Avond check-in starten →
              </button>
            )}
          </>
        ) : (
          <>
            <Label>Ochtend check-in</Label>
            <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text, marginBottom: 12, marginTop: 4 }}>Hoe ben je wakker geworden?</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {WAKE_MOODS.map((mood, i) => (
                <button key={i} onClick={onCheckin} style={{ width: 48, height: 48, borderRadius: "50%", border: `1.5px solid ${COLORS.roseBorder}`, background: COLORS.white, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {mood}
                </button>
              ))}
            </div>
            <button onClick={onCheckin} style={{ width: "100%", marginTop: 14, padding: "13px", borderRadius: 24, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Start check-in →
            </button>
          </>
        )}
      </Card>

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
function CheckInScreen({ onDone, user, checkinType = "ochtend" }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const [existing, setExisting] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wakeMood, setWakeMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [slept, setSlept] = useState("");
  const [intention, setIntention] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("checkins").select("*").eq("user_id", user.id)
      .gte("created_at", todayKey + "T00:00:00").lte("created_at", todayKey + "T23:59:59")
      .eq("type", checkinType).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setWakeMood(data.wake_mood);
          setEnergy(data.energy);
          setSlept(data.slept || "");
          setIntention(data.intention || "");
          setNote(data.note || "");
        } else {
          setEditMode(true);
        }
        setLoading(false);
      });
  }, [user, todayKey, checkinType]);

  async function save() {
    if (!user) { setSubmitted(true); return; }
    const payload = { user_id: user.id, type: checkinType, wake_mood: wakeMood, energy, slept, intention, note };
    if (existing?.id) {
      await supabase.from("checkins").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("checkins").insert(payload);
    }
    setSubmitted(true);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>Laden...</div>;

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>✦</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>{existing ? "Gewijzigd" : "Dankjewel"}</div>
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

  // Bestaande check-in weergeven (leesmodus)
  if (existing && !editMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>Ochtend check-in ✦</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>Gelogd vandaag</div>
          </div>
          <button onClick={() => setEditMode(true)} style={{ background: COLORS.roseLight, border: `1px solid ${COLORS.roseBorder}`, borderRadius: 20, padding: "8px 18px", fontSize: 13, color: COLORS.roseDark, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Wijzigen</button>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {existing.wake_mood !== null && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>Stemming bij opstaan</span>
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{WAKE_MOODS[existing.wake_mood]} {WAKE_LABELS[existing.wake_mood]}</span>
              </div>
            )}
            {existing.energy && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>Energie</span>
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{existing.energy}/5</span>
              </div>
            )}
            {existing.slept && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>Geslapen</span>
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{existing.slept}</span>
              </div>
            )}
            {existing.intention && (
              <div style={{ paddingTop: 8, borderTop: `0.5px solid ${COLORS.roseBorder}` }}>
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Intentie</div>
                <div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic" }}>"{existing.intention}"</div>
              </div>
            )}
            {existing.note && (
              <div style={{ paddingTop: 8, borderTop: `0.5px solid ${COLORS.roseBorder}` }}>
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Notitie aan Lola</div>
                <div style={{ fontSize: 13, color: COLORS.text }}>{existing.note}</div>
              </div>
            )}
          </div>
        </Card>
        <button onClick={onDone} style={{ padding: "13px", borderRadius: 24, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          Terug naar home
        </button>
      </div>
    );
  }

  // Invulformulier (nieuw of bewerken)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text, marginBottom: 4 }}>
          {existing ? "Check-in wijzigen ✦" : "Ochtend check-in ✦"}
        </div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>Neem even 2 minuten voor jezelf</div>
      </div>
      <div style={{ background: COLORS.lavender, borderRadius: 20, padding: "16px 18px", border: `0.5px solid ${COLORS.lavenderBorder}` }}>
        <div style={{ fontSize: 10, color: "#9B8EC4", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Gedachte van de dag</div>
        <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>"{DAILY_THOUGHT}"</p>
      </div>
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
            <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, height: 44, borderRadius: 14, border: `1.5px solid ${energy === n ? COLORS.rose : COLORS.roseBorder}`, background: energy === n ? COLORS.rose : COLORS.white, color: energy === n ? COLORS.white : COLORS.muted, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              {n}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <Label>Hoeveel uur geslapen?</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["<5 uur","5–6 uur","6–7 uur","7–8 uur","8+ uur"].map((opt) => (
            <button key={opt} onClick={() => setSlept(opt)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${slept === opt ? COLORS.rose : COLORS.roseBorder}`, background: slept === opt ? COLORS.roseLight : COLORS.white, color: slept === opt ? COLORS.roseDark : COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: slept === opt ? 500 : 400 }}>
              {opt}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <Label>Intentie voor vandaag</Label>
        <textarea value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Eén woord, één zin, één gevoel dat je wilt vasthouden..." rows={3} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
      </Card>
      <Card>
        <Label>Iets wat je wilt kwijt aan Lola?</Label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optioneel..." rows={2} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
      </Card>
      <button onClick={save} style={{ padding: "15px", borderRadius: 24, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!user) { setDataLoaded(true); return; }
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from("checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("food_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).then(([{ data: checkins }, { data: food }]) => {
      setContextData({ checkins: checkins || [], food: food || [], today });
      setDataLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!dataLoaded) return;
    const name = profile?.facts?.name || "liefste";
    setMessages([{ from: "lola", text: `Hoi ${name} ✦ Ik ben er. Wat speelt er vandaag?` }]);
  }, [dataLoaded]);

  function buildLolaSystem() {
    const facts = profile?.facts || {};
    const { day: cycleDay, phase } = getCycleInfo(facts.lastperiod, facts.cyclelength);
    const checkins = contextData?.checkins || [];
    const food = contextData?.food || [];
    const today = contextData?.today || new Date().toISOString().slice(0, 10);
    const MOODS = ["Zwaar", "Moeizaam", "Oké", "Fris", "Uitgerust"];

    // Vandaag
    const todayCheckin = checkins.find(c => c.created_at?.slice(0, 10) === today);
    const todayFood = food.filter(f => f.created_at?.slice(0, 10) === today);
    const totalKcal = todayFood.reduce((s, f) => s + (f.kcal || 0), 0);
    const totalProtein = todayFood.reduce((s, f) => s + (f.protein || 0), 0);
    const totalFat = todayFood.reduce((s, f) => s + (f.fat || 0), 0);

    // Patroonanalyse over alle data
    const patterns = analyzePatterns(checkins, food, facts.lastperiod, facts.cyclelength);

    return `Je bent Lola, een warme maar eerlijke persoonlijke levenscoach voor vrouwen. Je leest haar volledige data actief mee en herkent patronen.

── PROFIEL ──
Naam: ${facts.name || "onbekend"}
Leeftijd: ${facts.birthdate ? Math.floor((Date.now() - new Date(facts.birthdate)) / (365.25 * 86400000)) + " jaar" : "onbekend"}
Sterrenbeeld: ${getZodiac(facts.birthdate) || "onbekend"}
Human Design type: ${facts.hdtype || "onbekend"}
HD Profiel: ${facts.hdprofile || "onbekend"}
HD Autoriteit: ${facts.hdauthority || "onbekend"}
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
${todayFood.length > 0
  ? `${totalKcal} kcal · ${totalProtein}g eiwit · ${totalFat}g vet\nProducten: ${todayFood.map(f => f.product_name).join(", ")}`
  : "Nog niets gelogd."}

── PATROONANALYSE (${patterns?.total ?? 0} check-ins totaal) ──
${!patterns ? "Onvoldoende data voor patroonherkenning (minimaal 3 check-ins nodig)." : `
Energie afgelopen 7 dagen: gem. ${patterns.recentAvgEnergy}/5 · ${patterns.recentLowDays} dag(en) met energie ≤2

Energie per cyclusfase: ${patterns.phaseEnergy || "onvoldoende data"}

Cyclus-dagen met consistent lage energie:
${patterns.lowEnergyDays.length > 0 ? patterns.lowEnergyDays.map(d => `  • ${d}`).join("\n") : "  • Geen duidelijk patroon gevonden"}

Cyclus-dagen met consistent slechte slaap:
${patterns.poorSleepDays.length > 0 ? patterns.poorSleepDays.map(d => `  • ${d}`).join("\n") : "  • Geen duidelijk patroon gevonden"}

Voeding → energie correlaties:
${patterns.fatCorr ? `  • ${patterns.fatCorr}` : ""}
${patterns.proteinCorr ? `  • ${patterns.proteinCorr}` : ""}
${patterns.kcalCorr ? `  • ${patterns.kcalCorr}` : ""}
${!patterns.fatCorr && !patterns.proteinCorr && !patterns.kcalCorr ? "  • Onvoldoende data voor voedingscorrelaties" : ""}`.trim()}

── HOE JE REAGEERT ──
- Je benoemt patronen die je in de data ziet wanneer het relevant aanvoelt, concreet en specifiek
- Voorbeeldstijl: "Ik zie dat je op dag 28-29 van je cyclus bijna altijd slecht slaapt. Als je de dag ervoor meer vetten eet, lijkt dat iets te helpen — wil je dat proberen?"
- Je verbindt altijd data aan wat ze zegt of voelt
- Eén vraag per bericht. Warm, eerlijk, kort. Schrijf in het Nederlands.`;
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    const newMessages = [...messages, { from: "user", text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    const apiMessages = newMessages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    const reply = await askLola(apiMessages, buildLolaSystem());
    setMessages((prev) => [...prev, { from: "lola", text: reply }]);
    setLoading(false);
  }

  if (!dataLoaded) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100dvh - 160px)", gap: 12 }}>
      <div style={{ fontSize: 28, color: COLORS.rose }}>✦</div>
      <div style={{ fontSize: 13, color: COLORS.muted }}>Lola leest je gegevens...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 160px)", width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.roseLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${COLORS.roseBorder}` }}>✦</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text }}>Lola</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Jouw persoonlijke coach</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "user" ? "flex-end" : "flex-start" }}>
            {msg.from === "lola" && <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 3, fontWeight: 500 }}>Lola</div>}
            <div style={{ maxWidth: "75%", wordBreak: "break-word", padding: "11px 15px", borderRadius: 18, fontSize: 13, lineHeight: 1.6, background: msg.from === "lola" ? COLORS.roseLight : COLORS.rose, color: msg.from === "lola" ? COLORS.text : COLORS.white, borderBottomLeftRadius: msg.from === "lola" ? 4 : 18, borderBottomRightRadius: msg.from === "user" ? 4 : 18, border: msg.from === "lola" ? `0.5px solid ${COLORS.roseBorder}` : "none" }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 3, fontWeight: 500 }}>Lola</div>
            <div style={{ background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}`, borderRadius: 18, borderBottomLeftRadius: 4, padding: "11px 15px", display: "flex", gap: 4 }}>
              {[0,1,2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.rose, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: `0.5px solid ${COLORS.roseBorder}` }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Zeg iets tegen Lola..." style={{ flex: 1, minWidth: 0, padding: "11px 16px", borderRadius: 24, border: `1px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ width: 44, height: 44, borderRadius: "50%", background: loading ? COLORS.roseBorder : COLORS.rose, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }`}</style>
    </div>
  );
}

// ── FOOD SCREEN ───────────────────────────────────────────
function FoodScreen({ user }) {
  const [manualGrams, setManualGrams] = useState("100");
  const [selectedProduct, setSelectedProduct] = useState(null);
const [grams, setGrams] = useState("100");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [meals, setMeals] = useState({ ontbijt: [], lunch: [], diner: [], snack: [] });
  const [activeMeal, setActiveMeal] = useState("ontbijt");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [showBarcode, setShowBarcode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  const totals = Object.values(meals).flat().reduce(
    (acc, p) => ({ kcal: acc.kcal + (p.kcal || 0), protein: acc.protein + (p.protein || 0), carbs: acc.carbs + (p.carbs || 0), fat: acc.fat + (p.fat || 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  async function searchOFF(q) {
    const res = await fetch(`/api/food?query=${encodeURIComponent(q)}`);
    const data = await res.json();
    return (data.products || []).filter(p => p.product_name).map(p => ({
      name: p.product_name,
      brand: p.brands || "",
      kcal: Math.round(p.nutriments?.["energy-kcal_100g"] || 0),
      protein: Math.round(p.nutriments?.proteins_100g || 0),
      carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
      fat: Math.round(p.nutriments?.fat_100g || 0),
      source: "OFF"
    }));
  }

  async function searchUSDA(q) {
    try {
      const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=6&api_key=${import.meta.env.VITE_USDA_KEY}`);
      const data = await res.json();
      return (data.foods || []).map(f => {
        const get = (name) => Math.round(f.foodNutrients?.find(n => n.nutrientName === name)?.value || 0);
        return {
          name: f.description,
          brand: f.brandOwner || "",
          kcal: get("Energy"),
          protein: get("Protein"),
          carbs: get("Carbohydrate, by difference"),
          fat: get("Total lipid (fat)"),
          source: "USDA"
        };
      });
    } catch { return []; }
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    const [off, usda] = await Promise.all([searchOFF(query), searchUSDA(query)]);
    const combined = [...off, ...usda].filter(p => p.name);
    setResults(combined.slice(0, 12));
    setSearching(false);
  }

  async function searchBarcode(barcode) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        return {
          name: p.product_name || "Onbekend product",
          brand: p.brands || "",
          kcal: Math.round(p.nutriments?.["energy-kcal_100g"] || 0),
          protein: Math.round(p.nutriments?.proteins_100g || 0),
          carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
          fat: Math.round(p.nutriments?.fat_100g || 0),
        };
      }
    } catch {}
    return null;
  }

  async function addProduct(product, gramsAmount = 100) {
    const factor = gramsAmount / 100;
    const scaled = {
      ...product,
      grams: gramsAmount,
      kcal: Math.round(product.kcal * factor),
      protein: Math.round(product.protein * factor),
      carbs: Math.round(product.carbs * factor),
      fat: Math.round(product.fat * factor),
    };
    setMeals(prev => ({ ...prev, [activeMeal]: [...prev[activeMeal], scaled] }));
    setResults([]);
    setQuery("");
    if (user) {
      await supabase.from("food_logs").insert({
        user_id: user.id,
        meal: activeMeal,
        product_name: product.name,
        kcal: product.kcal,
        protein: product.protein,
        carbs: product.carbs,
        fat: product.fat,
      });
    }
  }

  function removeProduct(meal, index) {
    setMeals(prev => ({ ...prev, [meal]: prev[meal].filter((_, i) => i !== index) }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>Voeding <span style={{ fontWeight: 300 }}>vandaag</span></div>

      <div style={{ display: "flex", gap: 8 }}>
        {[["kcal", totals.kcal], ["proteïne", `${totals.protein}g`], ["koolhyd.", `${totals.carbs}g`], ["vet", `${totals.fat}g`]].map(([lbl, val]) => (
          <div key={lbl} style={{ flex: 1, background: COLORS.roseLight, borderRadius: 16, padding: "12px 8px", textAlign: "center", border: `0.5px solid ${COLORS.roseBorder}` }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: COLORS.text }}>{val}</div>
            <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 3 }}>{lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {["ontbijt", "lunch", "diner", "snack"].map(meal => (
          <button key={meal} onClick={() => setActiveMeal(meal)} style={{ flex: 1, padding: "8px 4px", borderRadius: 16, border: `1.5px solid ${activeMeal === meal ? COLORS.rose : COLORS.roseBorder}`, background: activeMeal === meal ? COLORS.roseLight : COLORS.white, color: activeMeal === meal ? COLORS.rose : COLORS.muted, fontSize: 11, fontWeight: activeMeal === meal ? 500 : 400, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
            {meal}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder={`Zoek voor ${activeMeal}...`} style={{ flex: 1, padding: "12px 16px", borderRadius: 20, border: `1px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        <button onClick={search} style={{ padding: "12px 16px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          {searching ? "..." : "Zoek"}
        </button>
<button onClick={() => setShowBarcode(!showBarcode)} style={{ padding: "12px 16px", borderRadius: 20, background: COLORS.roseLight, border: `1px solid ${COLORS.roseBorder}`, color: COLORS.rose, fontSize: 16, cursor: "pointer" }}>
  📷
</button>
      </div>

      {showBarcode && (
        <Card>
          <Label>Voer barcode in</Label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              placeholder="Scan of typ barcode nummer..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              style={{ flex: 1, padding: "11px 14px", borderRadius: 16, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
            <button onClick={async () => {
              if (!barcodeInput) return;
              const product = await searchBarcode(barcodeInput);
              if (product) { addProduct(product); setBarcodeInput(""); setShowBarcode(false); }
              else alert("Product niet gevonden — voeg het handmatig toe.");
            }} style={{ padding: "11px 16px", borderRadius: 16, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Zoek
            </button>
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <Label>Resultaten — klik om toe te voegen</Label>
          {results.map((p, i) => (
<div key={i} onClick={() => { setSelectedProduct(p); setGrams("100"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${COLORS.roseBorder}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{p.brand} · per 100g · {p.source}</div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.rose, fontWeight: 500 }}>{p.kcal} kcal</div>
            </div>
          ))}
        </Card>
      )}

      {showManual && (
        <Card>
          <Label>Zelf toevoegen</Label>
          <input placeholder="Productnaam" value={manualName} onChange={e => setManualName(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[["gram", manualGrams, setManualGrams], ["kcal/100g", manualKcal, setManualKcal], ["eiwit g", manualProtein, setManualProtein], ["koolhyd g", manualCarbs, setManualCarbs], ["vet g", manualFat, setManualFat]].map(([lbl, val, setter]) => (
              <div key={lbl} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>{lbl}</div>
                <input type="number" value={val} onChange={(e) => { setter(e.target.value); }} style={{ width: "100%", padding: "8px", borderRadius: 12, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <button onClick={() => {
            if (manualName) {
              const factor = (Number(manualGrams) || 100) / 100;
              addProduct({
                name: manualName,
                kcal: Math.round((Number(manualKcal) || 0) * factor),
                protein: Math.round((Number(manualProtein) || 0) * factor),
                carbs: Math.round((Number(manualCarbs) || 0) * factor),
                fat: Math.round((Number(manualFat) || 0) * factor),
              }, Number(manualGrams) || 100);
              setManualName(""); setManualKcal(""); setManualProtein(""); setManualCarbs(""); setManualFat(""); setManualGrams("100"); setShowManual(false);
            }
          }} style={{ width: "100%", padding: "11px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Toevoegen aan {activeMeal}
          </button>
        </Card>
      )}

      {["ontbijt", "lunch", "diner", "snack"].map(meal => meals[meal].length > 0 && (
        <Card key={meal}>
          <Label>{meal}</Label>
          {meals[meal].map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `0.5px solid ${COLORS.roseBorder}` }}>
              <div>
                <div style={{ fontSize: 13, color: COLORS.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{p.protein}g eiwit · {p.carbs}g koolh · {p.fat}g vet</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: COLORS.rose, fontWeight: 500 }}>{p.kcal} kcal</span>
                <button onClick={() => removeProduct(meal, i)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
              </div>
            </div>
          ))}
        </Card>
      ))}

      <button onClick={() => setShowManual(!showManual)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 20, border: `1.5px dashed ${COLORS.roseBorder}`, background: "transparent", color: COLORS.rose, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        + Zelf product toevoegen
      </button>

      <Card style={{ background: COLORS.roseLight, border: `0.5px solid ${COLORS.roseBorder}` }}>
        <div style={{ fontSize: 11, color: COLORS.rose, fontWeight: 500, marginBottom: 4 }}>✦ Lola tip</div>
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>In je luteale fase heeft je lichaam meer magnesium nodig. Denk aan donkere chocolade of pompoenpitten vanavond.</div>
      </Card>
      {selectedProduct && (
  <Card>
    <Label>Hoeveel gram van {selectedProduct.name}?</Label>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="number"
        value={grams}
        onChange={e => setGrams(e.target.value)}
        style={{ flex: 1, padding: "11px 14px", borderRadius: 16, border: `1px solid ${COLORS.roseBorder}`, fontSize: 14, fontFamily: "inherit", outline: "none" }}
      />
      <span style={{ fontSize: 13, color: COLORS.muted }}>gram</span>
      <button onClick={() => { addProduct(selectedProduct, Number(grams) || 100); setSelectedProduct(null); setResults([]); }} style={{ padding: "11px 20px", borderRadius: 16, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        Voeg toe
      </button>
    </div>
    <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
      {Math.round(selectedProduct.kcal * (Number(grams) || 100) / 100)} kcal · {Math.round(selectedProduct.protein * (Number(grams) || 100) / 100)}g eiwit
    </div>
  </Card>
)}
    </div>
  );
}

// ── GESCHIEDENIS KALENDER ─────────────────────────────────
function HistoryScreen({ user, profile }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [checkins, setCheckins] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
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
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    Promise.all([
      supabase.from("checkins").select("*").eq("user_id", user.id).gte("created_at", from).lte("created_at", to + "T23:59:59"),
      supabase.from("food_logs").select("*").eq("user_id", user.id).gte("created_at", from).lte("created_at", to + "T23:59:59"),
    ]).then(([{ data: ci }, { data: fl }]) => {
      setCheckins(ci || []);
      setFoodLogs(fl || []);
      setLoading(false);
    });
  }, [viewDate, user]);

  function dateKey(d) {
    return new Date(d).toISOString().slice(0, 10);
  }

  const checkinByDay = {};
  checkins.forEach(c => { checkinByDay[dateKey(c.created_at)] = c; });

  const foodByDay = {};
  foodLogs.forEach(f => {
    const k = dateKey(f.created_at);
    if (!foodByDay[k]) foodByDay[k] = [];
    foodByDay[k].push(f);
  });

  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  const cells = Array.from({ length: rows * 7 }, (_, i) => {
    const dayNum = i - startOffset + 1;
    return dayNum >= 1 && dayNum <= lastDay.getDate() ? dayNum : null;
  });

  function dayKey(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const selectedKey = selectedDay ? dayKey(selectedDay) : null;
  const selectedCheckin = selectedKey ? checkinByDay[selectedKey] : null;
  const selectedFood = selectedKey ? (foodByDay[selectedKey] || []) : [];
  const selectedCycle = selectedDay
    ? getCycleInfoForDate(profile?.facts?.lastperiod, profile?.facts?.cyclelength, new Date(year, month, selectedDay))
    : null;

  const WAKE_MOODS_ARR = ["😴", "😔", "😐", "🙂", "✨"];
  const WAKE_LABELS_ARR = ["Zwaar", "Moeizaam", "Oké", "Fris", "Uitgerust"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 20, padding: "4px 8px" }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text, textTransform: "capitalize" }}>{monthLabel}</div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} disabled={viewDate >= new Date(today.getFullYear(), today.getMonth(), 1)} style={{ background: "none", border: "none", cursor: viewDate >= new Date(today.getFullYear(), today.getMonth(), 1) ? "default" : "pointer", color: viewDate >= new Date(today.getFullYear(), today.getMonth(), 1) ? COLORS.roseBorder : COLORS.muted, fontSize: 20, padding: "4px 8px" }}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map(d => (
          <div key={d} style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500, textAlign: "center", padding: "4px 0" }}>{d}</div>
        ))}
        {cells.map((dayNum, i) => {
          if (!dayNum) return <div key={i} />;
          const key = dayKey(dayNum);
          const hasCheckin = !!checkinByDay[key];
          const hasFood = (foodByDay[key] || []).length > 0;
          const cycleInfo = getCycleInfoForDate(profile?.facts?.lastperiod, profile?.facts?.cyclelength, new Date(year, month, dayNum));
          const isToday = key === today.toISOString().slice(0, 10);
          const isSelected = selectedDay === dayNum;
          const isPast = new Date(year, month, dayNum) <= today;

          return (
            <button
              key={i}
              onClick={() => isPast && setSelectedDay(selectedDay === dayNum ? null : dayNum)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                aspectRatio: "1", padding: "2px", borderRadius: 10, cursor: isPast ? "pointer" : "default",
                border: isToday ? `1.5px solid ${COLORS.rose}` : isSelected ? `1.5px solid ${COLORS.roseDark}` : "1.5px solid transparent",
                background: isSelected ? COLORS.roseLight : "transparent",
                opacity: isPast ? 1 : 0.25,
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, color: isToday ? COLORS.rose : COLORS.text, lineHeight: 1 }}>{dayNum}</div>
              <div style={{ display: "flex", gap: 2, alignItems: "center", marginTop: 3, flexWrap: "nowrap" }}>
                {cycleInfo.day && <div style={{ width: 4, height: 4, borderRadius: "50%", background: cycleInfo.phase.color, flexShrink: 0 }} />}
                {hasCheckin && <div style={{ width: 4, height: 4, borderRadius: "50%", background: COLORS.rose, flexShrink: 0 }} />}
                {hasFood && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#A0C4A8", flexShrink: 0 }} />}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, fontSize: 11, color: COLORS.muted }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.rose }} />Check-in</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#A0C4A8" }} />Voeding</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.roseBorder }} />Cyclus</div>
      </div>

      {loading && <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 13, padding: 20 }}>Laden...</div>}

      {selectedDay && !loading && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.roseDark, marginBottom: 12 }}>
            {new Date(year, month, selectedDay).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
          </div>

          {selectedCycle?.day && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: COLORS.roseLight, borderRadius: 12, border: `0.5px solid ${COLORS.roseBorder}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedCycle.phase.color }} />
              <span style={{ fontSize: 12, color: COLORS.text }}>{selectedCycle.phase.name} · Dag {selectedCycle.day}</span>
            </div>
          )}

          {selectedCheckin ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <Label>Ochtend check-in</Label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selectedCheckin.wake_mood !== null && (
                  <div style={{ background: COLORS.roseLight, borderRadius: 10, padding: "6px 12px", fontSize: 12, color: COLORS.text }}>
                    {WAKE_MOODS_ARR[selectedCheckin.wake_mood]} {WAKE_LABELS_ARR[selectedCheckin.wake_mood]}
                  </div>
                )}
                {selectedCheckin.energy && (
                  <div style={{ background: COLORS.roseLight, borderRadius: 10, padding: "6px 12px", fontSize: 12, color: COLORS.text }}>
                    Energie {selectedCheckin.energy}/5
                  </div>
                )}
                {selectedCheckin.slept && (
                  <div style={{ background: COLORS.roseLight, borderRadius: 10, padding: "6px 12px", fontSize: 12, color: COLORS.text }}>
                    {selectedCheckin.slept}
                  </div>
                )}
              </div>
              {selectedCheckin.intention && (
                <div style={{ fontSize: 12, color: COLORS.muted, fontStyle: "italic", lineHeight: 1.5 }}>
                  "{selectedCheckin.intention}"
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Geen check-in op deze dag.</div>
          )}

          {selectedFood.length > 0 ? (
            <div>
              <Label>Voeding</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, marginTop: 4 }}>
                {["kcal", "protein", "carbs", "fat"].map(k => {
                  const total = selectedFood.reduce((s, f) => s + (f[k] || 0), 0);
                  const labels = { kcal: "kcal", protein: "eiwit", carbs: "koolhyd.", fat: "vet" };
                  return (
                    <div key={k} style={{ flex: 1, background: COLORS.roseLight, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{total}{k !== "kcal" ? "g" : ""}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>{labels[k]}</div>
                    </div>
                  );
                })}
              </div>
              {selectedFood.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: COLORS.muted, padding: "4px 0", borderBottom: `0.5px solid ${COLORS.roseBorder}` }}>
                  {f.product_name} <span style={{ color: COLORS.rose }}>{f.kcal} kcal</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: COLORS.muted }}>Geen voeding gelogd op deze dag.</div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── PROFIEL SCREEN ────────────────────────────────────────
function ProfileScreen({ profile, user, onProfileUpdated }) {
  const facts = profile?.facts || {};
  const [form, setForm] = useState({
    name: facts.name || "",
    birthdate: facts.birthdate || "",
    birthtime: facts.birthtime || "",
    birthplace: facts.birthplace || "",
    hdtype: facts.hdtype || "",
    hdprofile: facts.hdprofile || "",
    hdauthority: facts.hdauthority || "",
    cyclelength: facts.cyclelength || "28–32 dagen",
    lastperiod: facts.lastperiod || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false); };

  const zodiac = getZodiac(form.birthdate);
  const age = form.birthdate ? Math.floor((Date.now() - new Date(form.birthdate)) / (365.25 * 86400000)) : null;

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 14, border: `1.5px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginTop: 6 };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

  async function save() {
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, ...form });
    onProfileUpdated({ ...facts, ...form });
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

      <button onClick={save} disabled={saving} style={{ padding: "15px", borderRadius: 24, background: saved ? COLORS.softGreen : COLORS.rose, border: saved ? `1px solid ${COLORS.softGreenBorder}` : "none", color: saved ? COLORS.text : COLORS.white, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 0.3s" }}>
        {saving ? "Opslaan..." : saved ? "✓ Opgeslagen" : "Profiel opslaan"}
      </button>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("auth");
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("home");
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) {
            setProfile({ facts: data });
            setPhase("app");
          } else {
            setPhase("facts");
          }
        });
      }
    });
  }, []);

  if (phase === "auth") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 40 }}>
            <span style={{ fontSize: 16, color: COLORS.rose }}>✦</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.02em" }}>lola</span>
          </div>
          <AuthScreen onAuth={(u) => { setUser(u); setPhase("facts"); }} />
        </div>
      </div>
    );
  }
  if (phase === "facts") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 40 }}>
            <span style={{ fontSize: 16, color: COLORS.rose }}>✦</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.02em" }}>lola</span>
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
      <div style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
        <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <span style={{ fontSize: 16, color: COLORS.rose }}>✦</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.02em" }}>lola</span>
          </div>
          <IntakeChat facts={profile.facts} onDone={(fullProfile) => { setProfile(fullProfile); setPhase("welcome"); }} />
        </div>
      </div>
    );
  }

  if (phase === "welcome") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
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

  const screenMap = {
    home: <HomeScreen
      profile={profile}
      onCheckin={() => setScreen("checkin")}
      onGoToLola={() => setScreen("lola")}
      user={user}
      onPeriodLogged={(dateStr) => setProfile(p => ({ ...p, facts: { ...p.facts, lastperiod: dateStr } }))}
    />,
    checkin: <CheckInScreen user={user} onDone={() => setScreen("home")} />,
    food: <FoodScreen user={user} />,
    history: <HistoryScreen user={user} profile={profile} />,
    lola: <LolaScreen profile={profile} user={user} />,
    profile: <ProfileScreen profile={profile} user={user} onProfileUpdated={(updated) => setProfile(p => ({ ...p, facts: updated }))} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { overflow-x: hidden; }
  input, button, textarea, select { max-width: 100%; font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, color: COLORS.rose }}>✦</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.02em" }}>lola</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, color: COLORS.muted, background: COLORS.roseLight, padding: "4px 12px", borderRadius: 20, border: `0.5px solid ${COLORS.roseBorder}` }}>
              {cycleDay ? `Dag ${cycleDay} · ` : ""}{currentPhase.name}
            </div>
            <button onClick={() => setScreen("profile")} style={{ width: 32, height: 32, borderRadius: "50%", background: screen === "profile" ? COLORS.rose : COLORS.roseLight, border: `1px solid ${COLORS.roseBorder}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="8" r="4" stroke={screen === "profile" ? "white" : COLORS.rose} strokeWidth="1.5"/>
                <path d="M4 19c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke={screen === "profile" ? "white" : COLORS.rose} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        {screenMap[screen]}
      </div>
      <NavBar active={screen} onChange={setScreen} />
    </div>
  );
}
