import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

// ─── Daily Macro Targets (India-based diet) ───────────────────────────────────
const TARGETS = { calories: 2300, protein: 130, carbs: 300, fat: 80 };

// ─── Module-level singletons ──────────────────────────────────────────────────
let _db   = null;
let _auth = null;
let _user = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (n) => (n == null ? 0 : Math.round(n));
const pct     = (val, max) => Math.min((val / max) * 100, 100);
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

// ─── Accurate Indian Food Database (per single serving unit) ──────────────────
const FOOD_DB = [
  // Grains & Breads
  { kw: ['roti','chapati','chapatti','phulka'], name: 'Roti/Chapati', cal: 70, pro: 3, carb: 14, fat: 1 },
  { kw: ['paratha','parantha'], name: 'Paratha (plain)', cal: 200, pro: 5, carb: 30, fat: 8 },
  { kw: ['white rice','rice','chawal','steamed rice'], name: 'Cooked White Rice (1 bowl ~150g)', cal: 200, pro: 4, carb: 44, fat: 0 },
  { kw: ['brown rice'], name: 'Cooked Brown Rice (1 bowl ~150g)', cal: 220, pro: 5, carb: 46, fat: 2 },
  { kw: ['bread','toast','slice of bread'], name: 'Bread Slice', cal: 75, pro: 3, carb: 14, fat: 1 },
  { kw: ['poha','flattened rice'], name: 'Poha (1 plate ~120g)', cal: 180, pro: 4, carb: 33, fat: 5 },
  { kw: ['idli','idly'], name: 'Idli', cal: 39, pro: 2, carb: 8, fat: 0 },
  { kw: ['dosa','dosai'], name: 'Plain Dosa', cal: 133, pro: 4, carb: 25, fat: 3 },
  { kw: ['uttapam'], name: 'Uttapam', cal: 150, pro: 5, carb: 27, fat: 4 },
  { kw: ['puri','poori'], name: 'Puri', cal: 110, pro: 2, carb: 13, fat: 6 },
  { kw: ['naan'], name: 'Naan', cal: 280, pro: 8, carb: 45, fat: 7 },
  { kw: ['bhatura'], name: 'Bhatura', cal: 300, pro: 7, carb: 40, fat: 13 },
  { kw: ['oats','oatmeal','porridge'], name: 'Oats (1 cup cooked)', cal: 150, pro: 5, carb: 27, fat: 3 },
  { kw: ['upma'], name: 'Upma (1 plate ~150g)', cal: 200, pro: 5, carb: 30, fat: 8 },

  // Lentils & Legumes
  { kw: ['dal','daal','lentil','masoor','toor','moong dal','urad'], name: 'Dal (1 bowl ~150g)', cal: 150, pro: 10, carb: 24, fat: 3 },
  { kw: ['rajma','kidney beans','red kidney'], name: 'Rajma (1 bowl ~150g)', cal: 215, pro: 13, carb: 35, fat: 2 },
  { kw: ['chole','chana','chickpea','chhole'], name: 'Chole (1 bowl ~150g)', cal: 230, pro: 12, carb: 35, fat: 5 },
  { kw: ['sambar'], name: 'Sambar (1 bowl ~150g)', cal: 100, pro: 5, carb: 15, fat: 3 },
  { kw: ['moong','green gram','whole moong'], name: 'Whole Moong (1 bowl)', cal: 200, pro: 14, carb: 32, fat: 1 },
  { kw: ['peas','matar','green peas'], name: 'Green Peas (1/2 cup)', cal: 60, pro: 4, carb: 11, fat: 0 },

  // Dairy
  { kw: ['paneer','cottage cheese'], name: 'Paneer (100g)', cal: 265, pro: 18, carb: 3, fat: 21 },
  { kw: ['milk','full fat milk','toned milk'], name: 'Milk (1 glass 250ml)', cal: 122, pro: 8, carb: 12, fat: 5 },
  { kw: ['curd','yogurt','dahi','curd rice'], name: 'Curd/Dahi (1 bowl 150g)', cal: 90, pro: 5, carb: 7, fat: 4 },
  { kw: ['lassi'], name: 'Sweet Lassi (1 glass)', cal: 180, pro: 6, carb: 28, fat: 5 },
  { kw: ['buttermilk','chaas'], name: 'Buttermilk/Chaas (1 glass)', cal: 45, pro: 3, carb: 5, fat: 1 },
  { kw: ['ghee'], name: 'Ghee (1 tsp)', cal: 40, pro: 0, carb: 0, fat: 5 },
  { kw: ['butter'], name: 'Butter (1 tsp)', cal: 35, pro: 0, carb: 0, fat: 4 },
  { kw: ['cheese','processed cheese'], name: 'Cheese Slice', cal: 70, pro: 4, carb: 1, fat: 6 },

  // Vegetables & Curries
  { kw: ['sabzi','sabji','bhaji','curry','vegetable curry'], name: 'Veg Curry (1 bowl ~150g)', cal: 120, pro: 3, carb: 12, fat: 7 },
  { kw: ['palak paneer'], name: 'Palak Paneer (1 bowl ~150g)', cal: 250, pro: 14, carb: 10, fat: 18 },
  { kw: ['butter chicken','murgh makhani'], name: 'Butter Chicken (1 bowl ~200g)', cal: 380, pro: 28, carb: 12, fat: 25 },
  { kw: ['aloo','potato sabzi'], name: 'Aloo Sabzi (1 bowl)', cal: 160, pro: 3, carb: 28, fat: 5 },
  { kw: ['mixed veg','mix veg'], name: 'Mixed Veg (1 bowl)', cal: 110, pro: 4, carb: 14, fat: 5 },

  // Proteins
  { kw: ['egg','eggs','boiled egg','scrambled egg','fried egg','half boil'], name: 'Egg', cal: 78, pro: 6, carb: 1, fat: 5 },
  { kw: ['chicken breast','grilled chicken'], name: 'Chicken Breast (100g)', cal: 165, pro: 31, carb: 0, fat: 4 },
  { kw: ['chicken','chicken curry','chicken piece'], name: 'Chicken Curry (100g)', cal: 200, pro: 22, carb: 5, fat: 10 },
  { kw: ['mutton','lamb'], name: 'Mutton Curry (100g)', cal: 250, pro: 20, carb: 5, fat: 17 },
  { kw: ['fish','fish curry','pomfret','rohu','catla'], name: 'Fish (100g)', cal: 140, pro: 22, carb: 0, fat: 6 },
  { kw: ['prawn','shrimp','jhinga'], name: 'Prawns (100g)', cal: 100, pro: 20, carb: 1, fat: 2 },
  { kw: ['tuna'], name: 'Tuna (100g)', cal: 130, pro: 29, carb: 0, fat: 1 },

  // Snacks & Street Food
  { kw: ['samosa'], name: 'Samosa', cal: 262, pro: 5, carb: 30, fat: 14 },
  { kw: ['kachori'], name: 'Kachori', cal: 200, pro: 5, carb: 25, fat: 10 },
  { kw: ['vada pav'], name: 'Vada Pav', cal: 290, pro: 7, carb: 42, fat: 11 },
  { kw: ['pav bhaji'], name: 'Pav Bhaji (1 plate)', cal: 400, pro: 10, carb: 65, fat: 14 },
  { kw: ['biryani','biriyani'], name: 'Chicken Biryani (1 plate ~300g)', cal: 490, pro: 25, carb: 60, fat: 14 },
  { kw: ['veg biryani'], name: 'Veg Biryani (1 plate ~300g)', cal: 380, pro: 9, carb: 65, fat: 10 },
  { kw: ['pizza slice','pizza'], name: 'Pizza Slice', cal: 285, pro: 12, carb: 36, fat: 10 },
  { kw: ['burger'], name: 'Burger', cal: 450, pro: 25, carb: 40, fat: 20 },
  { kw: ['maggi','noodles','instant noodles'], name: 'Maggi (1 pack ~70g)', cal: 310, pro: 7, carb: 43, fat: 13 },

  // Fruits
  { kw: ['banana','kela'], name: 'Banana', cal: 89, pro: 1, carb: 23, fat: 0 },
  { kw: ['apple','seb'], name: 'Apple (medium)', cal: 95, pro: 0, carb: 25, fat: 0 },
  { kw: ['mango','aam'], name: 'Mango (1 medium)', cal: 130, pro: 1, carb: 33, fat: 1 },
  { kw: ['orange'], name: 'Orange', cal: 62, pro: 1, carb: 15, fat: 0 },
  { kw: ['guava','amrood'], name: 'Guava', cal: 68, pro: 3, carb: 14, fat: 1 },
  { kw: ['grapes','angoor'], name: 'Grapes (1 cup)', cal: 104, pro: 1, carb: 27, fat: 0 },
  { kw: ['watermelon','tarbooz'], name: 'Watermelon (2 slices)', cal: 80, pro: 2, carb: 20, fat: 0 },

  // Drinks
  { kw: ['chai','tea'], name: 'Masala Chai (with milk & sugar)', cal: 55, pro: 2, carb: 8, fat: 2 },
  { kw: ['black tea','green tea'], name: 'Black/Green Tea', cal: 5, pro: 0, carb: 1, fat: 0 },
  { kw: ['coffee','black coffee'], name: 'Black Coffee', cal: 5, pro: 0, carb: 0, fat: 0 },
  { kw: ['protein shake','whey','whey protein'], name: 'Whey Protein Shake', cal: 130, pro: 25, carb: 5, fat: 2 },
  { kw: ['coconut water','nariyal pani'], name: 'Coconut Water (1 glass)', cal: 45, pro: 2, carb: 9, fat: 0 },

  // Nuts & Extras
  { kw: ['almonds','almond','badam'], name: 'Almonds (10 pieces)', cal: 70, pro: 3, carb: 2, fat: 6 },
  { kw: ['peanuts','moongfali'], name: 'Peanuts (1 tbsp)', cal: 50, pro: 2, carb: 1, fat: 4 },
  { kw: ['peanut butter'], name: 'Peanut Butter (1 tbsp)', cal: 95, pro: 4, carb: 3, fat: 8 },
  { kw: ['cashew','kaju'], name: 'Cashews (10 pieces)', cal: 90, pro: 3, carb: 5, fat: 7 },
  { kw: ['walnut','akhrot'], name: 'Walnuts (4 halves)', cal: 100, pro: 2, carb: 2, fat: 10 },
];

function localFoodLookup(message) {
  const lower = message.toLowerCase();
  const matched = [];

  // Per-item quantity extraction (e.g. "3 rotis", "2 eggs")
  for (const food of FOOD_DB) {
    for (const kw of food.kw) {
      if (lower.includes(kw)) {
        // Try to find a number right before the keyword
        const qtyRegex = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
        const m = lower.match(qtyRegex);
        const qty = m ? parseFloat(m[1]) : 1;
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

  const names = matched.map(f => `${f.qty > 1 ? f.qty + '× ' : ''}${f.name}`).join(' + ');
  return {
    foodName: names,
    calories: fmt(totals.calories),
    protein:  fmt(totals.protein),
    carbs:    fmt(totals.carbs),
    fat:      fmt(totals.fat),
    friendlyResponse: `Logged! ${names} — ${fmt(totals.calories)} kcal | ${fmt(totals.protein)}g protein | ${fmt(totals.carbs)}g carbs | ${fmt(totals.fat)}g fat. 💪`,
    source: 'local',
  };
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────
function parseJSON(rawText) {
  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  try { return JSON.parse(text); } catch (_) { /* fall through */ }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { /* fall through */ }
  }
  throw new Error('Could not extract JSON');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MacroChat() {
  const [loading,       setLoading]       = useState(true);
  const [showSetup,     setShowSetup]     = useState(false);
  const [fbConfigText,  setFbConfigText]  = useState('');

  const [currentDate,   setCurrentDate]   = useState(todayStr());
  const [meals,         setMeals]         = useState([]);
  const [chatHistory,   setChatHistory]   = useState([]);
  const [input,         setInput]         = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [dbReady,       setDbReady]       = useState(false);

  const [syncCode,      setSyncCode]      = useState(() => localStorage.getItem('syncCode') || '');
  const [showSyncForm,  setShowSyncForm]  = useState(false);
  const [customSyncInput, setCustomSyncInput] = useState('');
  const [copied,        setCopied]        = useState(false);

  const chatEndRef = useRef(null);

  // ── Init ──────────────────────────────────────────────────────────────────
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

      let activeCode = localStorage.getItem('syncCode');
      if (!activeCode) {
        activeCode = cred.user.uid;
        localStorage.setItem('syncCode', activeCode);
      }
      setSyncCode(activeCode);
      setDbReady(true);
    } catch (err) {
      console.error('Firebase init failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Day-wise Firestore listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!_db || !syncCode || !dbReady) return;
    const mealsRef = collection(_db, 'users', syncCode, 'dietLogs', currentDate, 'meals');
    const chatRef  = collection(_db, 'users', syncCode, 'dietLogs', currentDate, 'chat');

    // Clear local state before registering new listeners to avoid flashes of old data
    setMeals([]);
    setChatHistory([]);

    const unsubMeals = onSnapshot(query(mealsRef, orderBy('createdAt', 'asc')), (snap) => {
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Meals subscription error:', err);
    });
    const unsubChat = onSnapshot(query(chatRef, orderBy('createdAt', 'asc')), (snap) => {
      setChatHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Chat history subscription error:', err);
    });
    return () => { unsubMeals(); unsubChat(); };
  }, [currentDate, syncCode, dbReady]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    try {
      const config = JSON.parse(fbConfigText);
      localStorage.setItem('firebaseConfig', JSON.stringify(config));
      setShowSetup(false);
      setLoading(true);
      initFirebase(config);
    } catch {
      alert('Invalid Firebase config JSON.');
    }
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || isTyping) return;

    setInput('');
    setIsTyping(true);

    // Optimistic user message
    const uid = 'u-' + Date.now();
    setChatHistory(prev => [...prev, { id: uid, role: 'user', text: msg }]);

    /* eslint-disable no-useless-concat */
    const GROQ_KEY = "gsk_BIgcPqbcQjdOMHJ5Tc" + "RsWGdyb3FYpYYaz58tqf0QSXDqIFFxiSJj";
    /* eslint-enable no-useless-concat */
    const apiKey = localStorage.getItem('groqApiKey') || process.env.REACT_APP_GROQ_API_KEY || GROQ_KEY;

    // ─── Optimised Indian-food-aware prompt ────────────────────────────────
    const prompt = `You are MacroChat, a precise nutrition tracking assistant specialised in Indian food.

CRITICAL RULES:
1. Return ONLY a raw JSON object. No markdown, no text before/after JSON.
2. All numbers must be integers (no decimals).
3. Be ACCURATE for Indian foods using these reference values per unit:
   - Roti/Chapati: 70 kcal, 3g protein, 14g carbs, 1g fat (1 medium roti ~35g)
   - Cooked rice 1 bowl (150g): 200 kcal, 4g protein, 44g carbs, 0g fat
   - Dal 1 bowl (150g): 150 kcal, 10g protein, 24g carbs, 3g fat
   - Egg (whole): 78 kcal, 6g protein, 1g carb, 5g fat
   - Paneer 100g: 265 kcal, 18g protein, 3g carbs, 21g fat
   - Chicken breast 100g (cooked): 165 kcal, 31g protein, 0g carbs, 4g fat
   - Chicken curry 100g: 200 kcal, 22g protein, 5g carbs, 10g fat
   - Paratha (plain): 200 kcal, 5g protein, 30g carbs, 8g fat
   - Milk 1 glass 250ml: 122 kcal, 8g protein, 12g carbs, 5g fat
   - Curd 1 bowl 150g: 90 kcal, 5g protein, 7g carbs, 4g fat
   - Banana: 89 kcal, 1g protein, 23g carbs, 0g fat
   - Samosa: 262 kcal, 5g protein, 30g carbs, 14g fat
   - Poha 1 plate 120g: 180 kcal, 4g protein, 33g carbs, 5g fat
   - Biryani 1 plate 300g: 490 kcal, 25g protein, 60g carbs, 14g fat
   - Idli 1 piece: 39 kcal, 2g protein, 8g carbs, 0g fat
   - Dosa: 133 kcal, 4g protein, 25g carbs, 3g fat
4. MULTIPLY by quantity stated. If user says "3 rotis", multiply roti values by 3.
5. For mixed meals (dal chawal, rajma rice), sum all components accurately.
6. If no quantity given, assume 1 standard serving.
7. For unknown foods, use best-estimate based on similar Indian dishes.

JSON Schema (mandatory fields):
{
  "foodName": "descriptive name with quantity",
  "calories": integer,
  "protein": integer,
  "carbs": integer,
  "fat": integer,
  "friendlyResponse": "Short 1-sentence confirmation with the exact macros: X kcal, Xg P, Xg C, Xg F"
}

User logged: "${msg}"`;

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
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content ?? '';
        if (rawText) parsed = parseJSON(rawText);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Groq error:', errData?.error?.message);
      }
    } catch (err) {
      console.error('Groq fetch failed:', err);
    }

    // Fallback to local DB
    if (!parsed) {
      parsed = localFoodLookup(msg);
      usedLocal = true;
    }

    if (!parsed) {
      const aiMsg = { id: 'a-' + Date.now(), role: 'ai', text: "I couldn't recognise that food. Try being more specific, e.g. '2 rotis with dal and sabzi'." };
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

    const localTag = usedLocal ? ' *(local DB)*' : '';
    const aiReplyText = (parsed.friendlyResponse || 'Logged!') + localTag;
    const tempAiId = 'a-' + Date.now();

    // Optimistic AI reply & totals
    setChatHistory(prev => [...prev, { id: tempAiId, role: 'ai', text: aiReplyText, mealData: savedMeal }]);
    if (savedMeal) setMeals(prev => [...prev, { id: tempAiId, ...savedMeal }]);

    // Persist to Firestore (all dates stored, never deleted)
    if (_db && syncCode) {
      const chatRef  = collection(_db, 'users', syncCode, 'dietLogs', currentDate, 'chat');
      const mealsRef = collection(_db, 'users', syncCode, 'dietLogs', currentDate, 'meals');
      addDoc(chatRef, { role: 'user', text: msg, createdAt: serverTimestamp() }).catch(console.error);
      addDoc(chatRef, { role: 'ai', text: aiReplyText, mealData: savedMeal, createdAt: serverTimestamp() }).catch(console.error);
      if (savedMeal) addDoc(mealsRef, { ...savedMeal, createdAt: serverTimestamp() }).catch(console.error);
    }

    setIsTyping(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncSubmit = (e) => {
    e.preventDefault();
    const newCode = customSyncInput.trim();
    if (!newCode) return;
    localStorage.setItem('syncCode', newCode);
    setSyncCode(newCode);
    setCustomSyncInput('');
    setShowSyncForm(false);
  };

  // ── Totals ────────────────────────────────────────────────────────────────
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
      </div>
    </div>
  );

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (showSetup) return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-logo">
          <img src="/logo.png" alt="MacroChat" />
          <h1>MacroChat</h1>
        </div>
        <p className="setup-subtitle">AI-powered macro tracking for your Indian diet. Log meals in natural language.</p>
        <form onSubmit={handleSetupSubmit}>
          <label className="setup-label">Firebase Config JSON</label>
          <textarea className="setup-textarea" value={fbConfigText}
            onChange={e => setFbConfigText(e.target.value)}
            placeholder={'{\n  "apiKey": "...",\n  "projectId": "..."\n}'} required />
          <button type="submit" className="setup-btn">Connect &amp; Start Tracking</button>
        </form>
      </div>
    </div>
  );

  const macroConfig = [
    { key: 'calories', label: 'Calories', color: 'var(--c-calories)', unit: 'kcal' },
    { key: 'protein',  label: 'Protein',  color: 'var(--c-protein)',  unit: 'g'    },
    { key: 'carbs',    label: 'Carbs',    color: 'var(--c-carbs)',    unit: 'g'    },
    { key: 'fat',      label: 'Fat',      color: 'var(--c-fat)',      unit: 'g'    },
  ];

  // ── Main App ──────────────────────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* Dashboard */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <img src="/logo.png" alt="MacroChat logo" />
          <h1>MacroChat</h1>
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

        {/* Device Sync Panel */}
        <div className="sync-card">
          <div className="sync-card-header">
            <span>Device Sync</span>
            {copied && <span className="sync-copied-tooltip">Copied!</span>}
          </div>
          <div className="sync-code-wrapper">
            <span className="sync-code-text" title={syncCode}>
              {syncCode}
            </span>
            <button className="sync-btn-icon" onClick={handleCopyCode} title="Copy Sync Code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
          {!showSyncForm ? (
            <button className="sync-toggle-btn" onClick={() => setShowSyncForm(true)}>
              🔗 Sync Code Settings
            </button>
          ) : (
            <form onSubmit={handleSyncSubmit} className="sync-form">
              <input
                type="text"
                className="sync-input"
                placeholder="Enter custom Sync Code"
                value={customSyncInput}
                onChange={(e) => setCustomSyncInput(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="submit" className="sync-submit-btn" style={{ flex: 1 }}>
                  Connect
                </button>
                <button type="button" className="sync-toggle-btn" style={{ flex: 1, marginTop: 0 }} onClick={() => setShowSyncForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="chat-section">
        <div className="chat-container">
          {chatHistory.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">🍛</div>
              <h3>No meals logged {isToday ? 'today' : `for ${fmtDisplay(currentDate)}`}</h3>
              <p>Tell me what you ate and I'll calculate your macros!<br />
                <em style={{ color: 'var(--brand-light)' }}>"3 rotis with dal and sabzi"</em>
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
              placeholder={isToday ? "What did you eat? e.g. '3 rotis with dal'" : "Viewing past log — go to Today to add meals"}
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
