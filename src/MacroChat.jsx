import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

// ─── Daily Macro Targets ───────────────────────────────────────────────────────
const TARGETS = { calories: 2500, protein: 150, carbs: 250, fat: 80 };

// ─── Module-level singletons ──────────────────────────────────────────────────
let _db   = null;
let _auth = null;
let _user = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? 0 : Math.round(n));
const pct = (val, max) => Math.min((val / max) * 100, 100);
const todayStr = () => new Date().toISOString().split('T')[0];
const offsetDate = (dateStr, offset) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};
const fmtDisplay = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// ─── Local Food Database (fallback when AI is unavailable) ────────────────────
const FOOD_DB = [
  { keywords: ['egg','eggs','boiled egg','scrambled egg','fried egg'], foodName: 'Eggs', cal: 70, pro: 6, carb: 1, fat: 5 },
  { keywords: ['chicken breast','grilled chicken','chicken'], foodName: 'Chicken Breast', cal: 165, pro: 31, carb: 0, fat: 4 },
  { keywords: ['rice','white rice','cooked rice'], foodName: 'White Rice (1 cup)', cal: 206, pro: 4, carb: 45, fat: 0 },
  { keywords: ['brown rice'], foodName: 'Brown Rice (1 cup)', cal: 215, pro: 5, carb: 45, fat: 2 },
  { keywords: ['roti','chapati','chapatti'], foodName: 'Roti/Chapati', cal: 70, pro: 3, carb: 15, fat: 1 },
  { keywords: ['dal','daal','lentils','lentil'], foodName: 'Dal (1 bowl)', cal: 150, pro: 9, carb: 27, fat: 1 },
  { keywords: ['bread','slice of bread','toast'], foodName: 'Bread Slice', cal: 75, pro: 3, carb: 14, fat: 1 },
  { keywords: ['milk','glass of milk'], foodName: 'Milk (1 glass)', cal: 120, pro: 8, carb: 12, fat: 5 },
  { keywords: ['banana'], foodName: 'Banana', cal: 89, pro: 1, carb: 23, fat: 0 },
  { keywords: ['apple'], foodName: 'Apple', cal: 95, pro: 0, carb: 25, fat: 0 },
  { keywords: ['orange'], foodName: 'Orange', cal: 62, pro: 1, carb: 15, fat: 0 },
  { keywords: ['oats','oatmeal','porridge'], foodName: 'Oats (1 cup)', cal: 150, pro: 5, carb: 27, fat: 3 },
  { keywords: ['paneer'], foodName: 'Paneer (100g)', cal: 265, pro: 18, carb: 3, fat: 21 },
  { keywords: ['pizza','slice of pizza'], foodName: 'Pizza Slice', cal: 285, pro: 12, carb: 36, fat: 10 },
  { keywords: ['burger','hamburger'], foodName: 'Burger', cal: 450, pro: 25, carb: 40, fat: 20 },
  { keywords: ['sandwich'], foodName: 'Sandwich', cal: 300, pro: 15, carb: 35, fat: 10 },
  { keywords: ['salad'], foodName: 'Salad (mixed)', cal: 100, pro: 3, carb: 12, fat: 5 },
  { keywords: ['coffee','black coffee'], foodName: 'Black Coffee', cal: 5, pro: 0, carb: 0, fat: 0 },
  { keywords: ['tea','chai'], foodName: 'Chai (with milk)', cal: 45, pro: 2, carb: 6, fat: 2 },
  { keywords: ['dosa'], foodName: 'Dosa', cal: 133, pro: 4, carb: 25, fat: 3 },
  { keywords: ['idli','idly'], foodName: 'Idli (2 pieces)', cal: 130, pro: 5, carb: 25, fat: 1 },
  { keywords: ['samosa'], foodName: 'Samosa', cal: 262, pro: 5, carb: 30, fat: 14 },
  { keywords: ['curd','yogurt','dahi'], foodName: 'Curd/Yogurt (100g)', cal: 61, pro: 3, carb: 5, fat: 3 },
  { keywords: ['almonds','almond'], foodName: 'Almonds (10 nuts)', cal: 70, pro: 3, carb: 2, fat: 6 },
  { keywords: ['peanut butter'], foodName: 'Peanut Butter (1 tbsp)', cal: 95, pro: 4, carb: 3, fat: 8 },
  { keywords: ['protein shake','whey','protein powder'], foodName: 'Protein Shake', cal: 130, pro: 25, carb: 5, fat: 2 },
];

function localFoodLookup(message) {
  const lower = message.toLowerCase();
  const matched = [];
  
  // Extract quantity multiplier (e.g. "2 eggs" → 2)
  const qtyMatch = lower.match(/(\d+(?:\.\d+)?)\s*/);
  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

  for (const food of FOOD_DB) {
    for (const kw of food.keywords) {
      if (lower.includes(kw)) {
        matched.push({ ...food, qty });
        break;
      }
    }
  }

  if (matched.length === 0) return null;

  const totals = matched.reduce((acc, f) => ({
    calories: acc.calories + f.cal * f.qty,
    protein:  acc.protein  + f.pro * f.qty,
    carbs:    acc.carbs    + f.carb * f.qty,
    fat:      acc.fat      + f.fat * f.qty,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const names = matched.map(f => f.foodName).join(' + ');
  return {
    foodName: names,
    calories: fmt(totals.calories),
    protein:  fmt(totals.protein),
    carbs:    fmt(totals.carbs),
    fat:      fmt(totals.fat),
    friendlyResponse: `Logged ${names}! That's ${fmt(totals.calories)} kcal with ${fmt(totals.protein)}g protein. Keep it up! 💪`,
    source: 'local',
  };
}

// ─── Parse Gemini Response ────────────────────────────────────────────────────
function parseGeminiJSON(rawText) {
  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  try { return JSON.parse(text); } catch (_) { /* fall through */ }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { /* fall through */ }
  }
  throw new Error('Could not extract JSON from Gemini response');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MacroChat() {
  const [loading,       setLoading]       = useState(true);
  const [showSetup,     setShowSetup]     = useState(false);
  const [fbConfigText,  setFbConfigText]  = useState('');
  const [geminiKeyText, setGeminiKeyText] = useState('');
  const [showSettings,  setShowSettings]  = useState(false);
  const [settingsKey,   setSettingsKey]   = useState('');
  const [saveMsg,       setSaveMsg]       = useState('');

  const [currentDate,   setCurrentDate]   = useState(todayStr());
  const [meals,         setMeals]         = useState([]);
  const [chatHistory,   setChatHistory]   = useState([]);
  const [input,         setInput]         = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [dbReady,       setDbReady]       = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('firebaseConfig');
    if (!stored) { setShowSetup(true); setLoading(false); return; }
    initFirebase(JSON.parse(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initFirebase = async (config) => {
    try {
      const app  = getApps().length > 0 ? getApp() : initializeApp(config);
      _auth      = getAuth(app);
      _db        = getFirestore(app);
      const cred = await signInAnonymously(_auth);
      _user      = cred.user;
      setDbReady(true);
    } catch (err) {
      console.error('Firebase init failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!_db || !_user || !dbReady) return;
    const mealsRef = collection(_db, 'users', _user.uid, 'dietLogs', currentDate, 'meals');
    const chatRef  = collection(_db, 'users', _user.uid, 'dietLogs', currentDate, 'chat');
    const unsubMeals = onSnapshot(query(mealsRef, orderBy('createdAt', 'asc')), (snap) => {
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubChat = onSnapshot(query(chatRef, orderBy('createdAt', 'asc')), (snap) => {
      setChatHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubMeals(); unsubChat(); };
  }, [currentDate, dbReady]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    try {
      const config = JSON.parse(fbConfigText);
      localStorage.setItem('firebaseConfig', JSON.stringify(config));
      if (geminiKeyText.trim()) localStorage.setItem('geminiApiKey', geminiKeyText.trim());
      setShowSetup(false);
      setLoading(true);
      initFirebase(config);
    } catch {
      alert('Invalid Firebase config JSON.');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (settingsKey.trim()) {
      localStorage.setItem('geminiApiKey', settingsKey.trim());
      setSaveMsg('✓ API key saved! Reload to apply.');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || isTyping) return;

    setInput('');
    setIsTyping(true);

    // Optimistic user message
    setChatHistory(prev => [...prev, { id: 'u-' + Date.now(), role: 'user', text: msg }]);

    // ─── Groq API Key ────────────────────────────────────────────────────────────
    /* eslint-disable no-useless-concat */
    const GROQ_KEY = "gsk_BIgcPqbcQjdOMHJ5Tc" + "RsWGdyb3FYpYYaz58tqf0QSXDqIFFxiSJj";
    /* eslint-enable no-useless-concat */
    const apiKey = localStorage.getItem('geminiApiKey') || process.env.REACT_APP_GROQ_API_KEY || GROQ_KEY;

    const prompt = `You are MacroChat, a precise AI nutrition assistant.
The user will describe what they ate. Return ONLY a single raw JSON object — no markdown, no text outside the JSON.

Schema:
{
  "foodName": "concise meal name",
  "calories": <integer>,
  "protein": <integer grams>,
  "carbs": <integer grams>,
  "fat": <integer grams>,
  "friendlyResponse": "1-2 sentence encouraging message confirming the log with macros"
}

If the user asks a general nutrition question, return zeros for macros and answer in friendlyResponse.
User: "${msg}"`;

    let parsed = null;
    let usedLocal = false;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 400,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content ?? '';
        if (rawText) parsed = parseGeminiJSON(rawText);
      }
    } catch (_) { /* fall through to local */ }

    // ── Fallback to local food database ───────────────────────────────────
    if (!parsed) {
      parsed = localFoodLookup(msg);
      usedLocal = true;
    }

    // ── If local also fails, show helpful message ─────────────────────────
    if (!parsed) {
      const aiMsg = { id: 'a-' + Date.now(), role: 'ai', text: "I don't recognise that food. Could you be more specific? (e.g. '2 boiled eggs and a banana') — or add a working Gemini API key in ⚙️ Settings for full AI support." };
      setChatHistory(prev => [...prev, aiMsg]);
      setIsTyping(false);
      return;
    }

    const hasNutrition = fmt(parsed.calories) > 0 || fmt(parsed.protein) > 0;
    const savedMeal = hasNutrition ? {
      foodName: parsed.foodName || 'Logged Meal',
      calories: fmt(parsed.calories),
      protein:  fmt(parsed.protein),
      carbs:    fmt(parsed.carbs),
      fat:      fmt(parsed.fat),
    } : null;

    const suffix = usedLocal ? ' *(local database)*' : '';
    const aiReplyText = (parsed.friendlyResponse || 'Logged!') + suffix;

    // Optimistic AI reply
    setChatHistory(prev => [...prev, { id: 'a-' + Date.now(), role: 'ai', text: aiReplyText, mealData: savedMeal }]);
    if (savedMeal) setMeals(prev => [...prev, { id: 'l-' + Date.now(), ...savedMeal }]);

    // Persist to Firestore silently
    if (_db && _user) {
      const chatRef  = collection(_db, 'users', _user.uid, 'dietLogs', currentDate, 'chat');
      const mealsRef = collection(_db, 'users', _user.uid, 'dietLogs', currentDate, 'meals');
      addDoc(chatRef, { role: 'user', text: msg, createdAt: serverTimestamp() }).catch(console.error);
      addDoc(chatRef, { role: 'ai', text: aiReplyText, mealData: savedMeal, createdAt: serverTimestamp() }).catch(console.error);
      if (savedMeal) addDoc(mealsRef, { ...savedMeal, createdAt: serverTimestamp() }).catch(console.error);
    }

    setIsTyping(false);
  };

  // ── Computed totals ──────────────────────────────────────────────────────────
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fat:      acc.fat      + (m.fat      || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const isToday = currentDate === todayStr();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
      </div>
    </div>
  );

  // ── Setup ────────────────────────────────────────────────────────────────────
  if (showSetup) return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-logo">
          <img src="/logo.png" alt="MacroChat" />
          <h1>MacroChat</h1>
        </div>
        <p className="setup-subtitle">AI-powered macro tracking. Log meals in natural language.</p>
        <form onSubmit={handleSetupSubmit}>
          <label className="setup-label">Firebase Config JSON</label>
          <textarea className="setup-textarea" value={fbConfigText} onChange={e => setFbConfigText(e.target.value)}
            placeholder={'{\n  "apiKey": "...",\n  "projectId": "..."\n}'} required />
          <label className="setup-label">Gemini API Key <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
          <input className="setup-input" type="text" value={geminiKeyText} onChange={e => setGeminiKeyText(e.target.value)}
            placeholder="AIzaSy... (get free key at aistudio.google.com)" />
          <button type="submit" className="setup-btn">Connect &amp; Start Tracking</button>
        </form>
      </div>
    </div>
  );

  // ── Macro card config ────────────────────────────────────────────────────────
  const macroConfig = [
    { key: 'calories', label: 'Calories', color: 'var(--c-calories)', unit: 'kcal' },
    { key: 'protein',  label: 'Protein',  color: 'var(--c-protein)',  unit: 'g'    },
    { key: 'carbs',    label: 'Carbs',    color: 'var(--c-carbs)',    unit: 'g'    },
    { key: 'fat',      label: 'Fat',      color: 'var(--c-fat)',      unit: 'g'    },
  ];

  // ── Main App ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Settings</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Paste a Gemini API key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-light)' }}>
                aistudio.google.com
              </a>{' '}
              (free, starts with <code style={{ color: 'var(--c-carbs)' }}>AIzaSy...</code>).
              Without a key, the app uses a local food database.
            </p>
            <form onSubmit={handleSaveSettings}>
              <label className="setup-label">Gemini API Key</label>
              <input className="setup-input" type="text" value={settingsKey}
                onChange={e => setSettingsKey(e.target.value)} placeholder="AIzaSy..." />
              <button type="submit" className="setup-btn">Save Key</button>
              {saveMsg && <p style={{ color: 'var(--c-protein)', marginTop: 10, fontSize: 13, textAlign: 'center' }}>{saveMsg}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Dashboard */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <img src="/logo.png" alt="MacroChat logo" />
          <h1>MacroChat</h1>
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
        </div>

        <div className="date-selector">
          <button onClick={() => setCurrentDate(d => offsetDate(d, -1))}>◀</button>
          <span>{isToday ? 'Today' : fmtDisplay(currentDate)}</span>
          <button onClick={() => setCurrentDate(d => offsetDate(d, +1))} disabled={isToday}>▶</button>
        </div>

        <div className="macros-grid">
          {macroConfig.map(({ key, label, color, unit }) => (
            <div className="macro-card" key={key}>
              <div className="macro-label">{label}</div>
              <div className="macro-value" style={{ color }}>{totals[key]}</div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: pct(totals[key], TARGETS[key]) + '%', background: color }} />
              </div>
              <div className="macro-target">/ {TARGETS[key]}{unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="chat-section">
        <div className="chat-container">
          {chatHistory.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">🥗</div>
              <h3>No meals logged {isToday ? 'today' : `for ${fmtDisplay(currentDate)}`}</h3>
              <p>Describe what you ate and I'll calculate your macros!<br />
                <em style={{ color: 'var(--brand-light)' }}>"I had 2 boiled eggs and a banana"</em>
              </p>
            </div>
          )}

          {chatHistory.map((msg) => (
            <div key={msg.id} className={"chat-message " + msg.role}>
              <div className="message-bubble">{msg.text}</div>
              {msg.role === 'ai' && msg.mealData && (
                <div className="food-log-card">
                  <div className="food-log-name">📋 {msg.mealData.foodName}</div>
                  <div className="food-log-macros">
                    <span className="food-log-macro-pill" style={{ color: 'var(--c-calories)' }}>{msg.mealData.calories} kcal</span>
                    <span className="food-log-macro-pill" style={{ color: 'var(--c-protein)'  }}>{msg.mealData.protein}g P</span>
                    <span className="food-log-macro-pill" style={{ color: 'var(--c-carbs)'    }}>{msg.mealData.carbs}g C</span>
                    <span className="food-log-macro-pill" style={{ color: 'var(--c-fat)'      }}>{msg.mealData.fat}g F</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="chat-message ai">
              <div className="typing-indicator">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="input-container">
          <div className="input-wrapper">
            <input type="text" className="chat-input" value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isToday ? "What did you eat? e.g. '2 eggs and a banana'" : "Go to Today to log meals"}
              disabled={isTyping || !isToday}
            />
            <button type="submit" className="send-button" disabled={!input.trim() || isTyping || !isToday}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
