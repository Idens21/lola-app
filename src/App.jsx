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

const WAKE_MOODS = ["😴", "😔", "😐", "🙂", "✨"];
const WAKE_LABELS = ["Zwaar", "Moeizaam", "Oké", "Fris", "Uitgerust"];
const DAILY_THOUGHT = "Wat als de vermoeidheid die je voelt geen zwakte is, maar een signaal dat je iets nodig hebt wat je jezelf nog niet gegund hebt?";

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
function HomeScreen({ profile, onCheckin }) {
  const name = profile?.facts?.name || "liefste";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const today = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  const phase = PHASES[3];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 300, color: COLORS.text, lineHeight: 1.2 }}>
            {greeting},<br /><span style={{ fontWeight: 600 }}>{name}.</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{today}</div>
        </div>
        <div style={{ fontSize: 24, color: COLORS.rose }}>✦</div>
      </div>

      <div style={{ background: COLORS.roseLight, borderRadius: 20, padding: "14px 18px", border: `0.5px solid ${COLORS.roseBorder}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: phase.color, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.roseDark }}>{phase.name} · Dag 19</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 1.5 }}>{phase.desc}</div>
        </div>
      </div>

      <Card style={{ background: COLORS.cream, border: `0.5px solid ${COLORS.roseBorder}` }}>
        <Label>Lola zegt</Label>
        <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, fontStyle: "italic" }}>
          "Je bent al 3 dagen moe bij het opstaan. Dat is geen toeval — je lichaam vraagt iets van je. Wat eet je de avond voor het slapen?"
        </p>
      </Card>

      <Card>
        <Label>Ochtend check-in</Label>
        <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text, marginBottom: 12 }}>Hoe ben je wakker geworden?</div>
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
      </Card>

      <Card>
        <Label>Voeding vandaag</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[["1.240", "kcal"], ["68g", "proteïne"], ["142g", "koolhyd."], ["38g", "vet"]].map(([val, lbl]) => (
            <div key={lbl} style={{ flex: 1, background: COLORS.roseLight, borderRadius: 14, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text }}>{val}</div>
              <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
        <ProgressBar value={1240} max={1800} />
      </Card>

      <Card>
        <Label>Vandaag gelogd</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Slaap", value: "6,5 uur", color: COLORS.lavender, border: COLORS.lavenderBorder },
            { label: "Beweging", value: "Nog niet gelogd", color: COLORS.roseLight, border: COLORS.roseBorder },
            { label: "Water", value: "1,2L / 2L", color: COLORS.softGreen, border: COLORS.softGreenBorder },
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
function CheckInScreen({ onDone, user }) {
  const [wakeMood, setWakeMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [slept, setSlept] = useState("");
  const [intention, setIntention] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>✦</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>Dankjewel</div>
        <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.7, maxWidth: 300 }}>Lola heeft je ochtend ontvangen. Ze denkt de hele dag met je mee.</p>
        <div style={{ background: COLORS.roseLight, borderRadius: 20, padding: "16px 20px", border: `0.5px solid ${COLORS.roseBorder}`, maxWidth: 300 }}>
          <p style={{ fontSize: 13, color: COLORS.roseDark, fontStyle: "italic", lineHeight: 1.6 }}>"Je intentie voor vandaag is geplant. Laat haar groeien."</p>
        </div>
        <button onClick={onDone} style={{ marginTop: 8, padding: "13px 32px", borderRadius: 24, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          Terug naar home
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 500, color: COLORS.text, marginBottom: 4 }}>Ochtend check-in ✦</div>
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
        <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8, lineHeight: 1.5 }}>Geen doelenlijst — één woord, één zin, één gevoel dat je wilt vasthouden vandaag.</p>
        <textarea value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Bijv. 'Rustig blijven bij keuzes' of gewoon 'aanwezig zijn'..." rows={3} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
      </Card>
      <Card>
        <Label>Iets wat je wilt kwijt aan Lola?</Label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optioneel..." rows={2} style={{ width: "100%", border: `1px solid ${COLORS.roseBorder}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: COLORS.text, background: COLORS.white, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
      </Card>
    <button onClick={async () => {
  if (user) {
    await supabase.from("checkins").insert({
      user_id: user.id,
      type: "ochtend",
      wake_mood: wakeMood,
      energy,
      slept,
      intention,
      note,
    });
  }
  setSubmitted(true);
}} style={{ padding: "15px", borderRadius: 24, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
        Verstuur naar Lola ✦
      </button>
    </div>
  );
}

// ── LOLA CHAT ─────────────────────────────────────────────
function LolaScreen({ profile }) {
  const [messages, setMessages] = useState([
    { from: "lola", text: `Hoi ${profile?.facts?.name || "liefste"} ✦ Ik ben er. Wat speelt er vandaag?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);


  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

const LOLA_SYSTEM = `Je bent Lola, een warme maar eerlijke persoonlijke levenscoach. Je kent deze persoon goed vanuit de intake.
Naam: ${profile?.facts?.name}. Human design: ${profile?.facts?.hdtype || "onbekend"}. Cyclus: ${profile?.facts?.cyclelength}.
Je bent altijd beschikbaar — voor grote levensvragen én kleine dagelijkse dingen. Over relaties, werk, familie, twijfels, vreugde — alles.
Stel één vraag per keer. Reageer warm maar eerlijk. Durf te spiegelen. Houd berichten kort. Schrijf in het Nederlands.`;

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    const newMessages = [...messages, { from: "user", text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    const apiMessages = newMessages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    const reply = await askLola(apiMessages, LOLA_SYSTEM);
    setMessages((prev) => [...prev, { from: "lola", text: reply }]);
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
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
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Zeg iets tegen Lola..." style={{ flex: 1, padding: "11px 16px", borderRadius: 24, border: `1px solid ${COLORS.roseBorder}`, background: COLORS.white, color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
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
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

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

  async function startScanner() {
    setScanning(true);
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    scannerRef.current = reader;
    try {
      await reader.decodeFromVideoDevice(undefined, videoRef.current, async (result) => {
        if (result) {
          reader.reset();
          setScanning(false);
          const product = await searchBarcode(result.getText());
          if (product) addProduct(product);
          else alert("Product niet gevonden — voeg het handmatig toe.");
        }
      });
    } catch { setScanning(false); }
  }

  function stopScanner() {
    scannerRef.current?.reset();
    setScanning(false);
  }

async function addProduct(product, grams = 100) {
    const factor = grams / 100;
    const scaled = {
      ...product,
      grams,
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
<button onClick={scanning ? stopScanner : startScanner} style={{ padding: "12px 16px", borderRadius: 20, background: scanning ? COLORS.roseDark : COLORS.roseLight, border: `1px solid ${COLORS.roseBorder}`, color: scanning ? COLORS.white : COLORS.rose, fontSize: 16, cursor: "pointer" }}>
  📷
</button>
      </div>

      {scanning && (
        <Card>
          <Label>Richt je camera op de barcode</Label>
          <video ref={videoRef} style={{ width: "100%", borderRadius: 12 }} />
          <button onClick={stopScanner} style={{ marginTop: 10, width: "100%", padding: "10px", borderRadius: 16, background: "transparent", border: `1px solid ${COLORS.roseBorder}`, color: COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuleren</button>
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
 {[["gram", manualGrams, setManualGrams], ["kcal/100g", manualKcal, setManualKcal], ["eiwit g/100g", manualProtein, setManualProtein], ["koolhyd g/100g", manualCarbs, setManualCarbs], ["vet g/100g", manualFat, setManualFat]].map(([lbl, val, setter]) => (
                <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>{lbl}</div>
                <input type="number" value={val} onChange={e => setter(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 12, border: `1px solid ${COLORS.roseBorder}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <button onClick={() => { if (manualName) { addProduct({ name: manualName, kcal: Number(manualKcal) || 0, protein: Number(manualProtein) || 0, carbs: Number(manconst factor = (Number(manualGrams) || 100) / 100;
addProduct({
  name: manualName,
  kcal: Math.round((Number(manualKcal) || 0) * factor),
  protein: Math.round((Number(manualProtein) || 0) * factor),
  carbs: Math.round((Number(manualCarbs) || 0) * factor),
  fat: Math.round((Number(manualFat) || 0) * factor),
}, Number(manualGrams) || 100);ualCarbs) || 0, fat: Number(manualFat) || 0 }); setManualName(""); setManualKcal(""); setManualProtein(""); setManualCarbs(""); setManualFat(""); setShowManual(false); } }} style={{ width: "100%", padding: "11px", borderRadius: 20, background: COLORS.rose, border: "none", color: COLORS.white, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
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

  const screenMap = {
    home: <HomeScreen profile={profile} onCheckin={() => setScreen("checkin")} />,
checkin: <CheckInScreen user={user} onDone={() => setScreen("home")} />,
food: <FoodScreen user={user} />,
    lola: <LolaScreen profile={profile} />,
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
          <div style={{ fontSize: 11, color: COLORS.muted, background: COLORS.roseLight, padding: "4px 12px", borderRadius: 20, border: `0.5px solid ${COLORS.roseBorder}` }}>
            Dag 19 · Luteaal
          </div>
        </div>
        {screenMap[screen]}
      </div>
      <NavBar active={screen} onChange={setScreen} />
    </div>
  );
}

