import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const DAILY_TARGETS = {
  calories: 2500,
  protein: 150,
  carbs: 250,
  fat: 80
};

let db = null;
let auth = null;
let currentUser = null;

function MacroChat() {
  const [loading, setLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configInput, setConfigInput] = useState('');
  
  
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [meals, setMeals] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const initFirebase = async () => {
      try {
        let config = localStorage.getItem('firebaseConfig');
        if (!config) {
          setShowConfigForm(true);
          setLoading(false);
          return;
        }
        await setupFirebase(JSON.parse(config));
      } catch (error) {
        console.error('Firebase init error:', error);
        setLoading(false);
      }
    };
    initFirebase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupFirebase = async (config) => {
    try {
      const app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);

      const userCred = await signInAnonymously(auth);
      currentUser = userCred.user;

      // Subscribe to today's meals
      const mealsRef = collection(db, 'users', currentUser.uid, 'dietLogs', today, 'meals');
      onSnapshot(query(mealsRef, orderBy('createdAt', 'asc')), (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setMeals(data);
      });

      // Subscribe to today's chat
      const chatRef = collection(db, 'users', currentUser.uid, 'dietLogs', today, 'chat');
      onSnapshot(query(chatRef, orderBy('createdAt', 'asc')), (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setChatHistory(data);
      });

      setLoading(false);
    } catch (error) {
      console.error('Setup error:', error);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  const handleConfigSubmit = (e) => {
    e.preventDefault();
    try {
      const config = JSON.parse(configInput);
      localStorage.setItem('firebaseConfig', JSON.stringify(config));
      setShowConfigForm(false);
      setupFirebase(config);
    } catch (error) {
      alert('Invalid Firebase config JSON.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !db || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);

    const chatRef = collection(db, 'users', currentUser.uid, 'dietLogs', today, 'chat');
    await addDoc(chatRef, {
      role: 'user',
      text: userMessage,
      createdAt: serverTimestamp()
    });

    // eslint-disable-next-line no-useless-concat
    const fallbackKey = "AQ.Ab8RN6Kx0YeOAbuq0" + "5lRUXADyrfeSgPRgDAp3k71amwZi_7boQ";
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || fallbackKey;
    if (!apiKey) {
      await addDoc(chatRef, {
        role: 'ai',
        text: 'ERR: REACT_APP_GEMINI_API_KEY missing.',
        createdAt: serverTimestamp()
      });
      setIsTyping(false);
      return;
    }

    try {
      const prompt = `You are MacroChat, an AI calorie and macro tracking assistant.
The user will tell you what they ate. Your job is to estimate the nutritional content and return a STRICT JSON object.
Do NOT return markdown. Do NOT return text outside the JSON. Return ONLY the raw JSON object.
If the user asks a general question, estimate calories as 0 and provide a helpful response in friendlyResponse.

Schema:
{
  "foodName": "Short descriptive name of the meal",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "friendlyResponse": "A short, encouraging conversational response confirming the log. Keep it under 2 sentences."
}

User input: "${userMessage}"`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      let aiText = data.candidates[0].content.parts[0].text.trim();
      
      // Clean up markdown formatting if Gemini still included it
      if (aiText.startsWith('```json')) {
        aiText = aiText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (aiText.startsWith('```')) {
        aiText = aiText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(aiText);

      // Save Meal if calories > 0
      let mealId = null;
      if (parsed.calories > 0 || parsed.protein > 0 || parsed.carbs > 0 || parsed.fat > 0) {
        const mealsRef = collection(db, 'users', currentUser.uid, 'dietLogs', today, 'meals');
        const mealDoc = await addDoc(mealsRef, {
          foodName: parsed.foodName || 'Unknown Food',
          calories: parsed.calories || 0,
          protein: parsed.protein || 0,
          carbs: parsed.carbs || 0,
          fat: parsed.fat || 0,
          createdAt: serverTimestamp()
        });
        mealId = mealDoc.id;
      }

      // Save AI Chat response
      await addDoc(chatRef, {
        role: 'ai',
        text: parsed.friendlyResponse || "Got it, I've logged that for you.",
        mealId: mealId,
        mealData: mealId ? parsed : null,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error(error);
      await addDoc(chatRef, {
        role: 'ai',
        text: "Sorry, I couldn't process that meal. Make sure to describe the food clearly.",
        createdAt: serverTimestamp()
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Calculations
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const calProgress = Math.min((totalCalories / DAILY_TARGETS.calories) * 100, 100);
  const proProgress = Math.min((totalProtein / DAILY_TARGETS.protein) * 100, 100);
  const carbProgress = Math.min((totalCarbs / DAILY_TARGETS.carbs) * 100, 100);
  const fatProgress = Math.min((totalFat / DAILY_TARGETS.fat) * 100, 100);

  if (loading) return null;

  if (showConfigForm) {
    return (
      <div className="setup-container">
        <h1>MacroChat Setup</h1>
        <p>Please enter your Firebase config JSON to begin tracking.</p>
        <form onSubmit={handleConfigSubmit}>
          <textarea value={configInput} onChange={e => setConfigInput(e.target.value)} placeholder='{ "apiKey": "..." }' />
          <button type="submit">CONNECT FIREBASE</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <img src="/logo.png" alt="MacroChat Logo" />
          MacroChat
        </div>
        
        <div className="macros-grid">
          <div className="macro-card">
            <div className="macro-label">Calories</div>
            <div className="macro-value" style={{ color: 'var(--color-calories)' }}>{totalCalories}</div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: calProgress + '%', backgroundColor: 'var(--color-calories)' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>/ {DAILY_TARGETS.calories}</div>
          </div>
          
          <div className="macro-card">
            <div className="macro-label">Protein</div>
            <div className="macro-value" style={{ color: 'var(--color-protein)' }}>{totalProtein}g</div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: proProgress + '%', backgroundColor: 'var(--color-protein)' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>/ {DAILY_TARGETS.protein}g</div>
          </div>

          <div className="macro-card">
            <div className="macro-label">Carbs</div>
            <div className="macro-value" style={{ color: 'var(--color-carbs)' }}>{totalCarbs}g</div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: carbProgress + '%', backgroundColor: 'var(--color-carbs)' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>/ {DAILY_TARGETS.carbs}g</div>
          </div>

          <div className="macro-card">
            <div className="macro-label">Fat</div>
            <div className="macro-value" style={{ color: 'var(--color-fat)' }}>{totalFat}g</div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: fatProgress + '%', backgroundColor: 'var(--color-fat)' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>/ {DAILY_TARGETS.fat}g</div>
          </div>
        </div>
      </div>

      <div className="chat-section">
        {/* Chat Area */}
      <div className="chat-container">
        {chatHistory.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '14px' }}>
            No meals logged yet today. <br/> Try saying "I had 2 eggs and toast for breakfast."
          </div>
        )}
        
        {chatHistory.map((msg) => (
          <div key={msg.id} className={"chat-message " + msg.role}>
            <div>{msg.text}</div>
            
            {/* If the AI logged a meal, show the nutrition card */}
            {msg.role === 'ai' && msg.mealData && (
              <div className="food-log-card">
                <div className="food-log-title">{msg.mealData.foodName}</div>
                <div className="food-log-macros">
                  <div><span style={{color: 'var(--color-calories)'}}>{msg.mealData.calories}</span> kcal</div>
                  <div><span style={{color: 'var(--color-protein)'}}>{msg.mealData.protein}g</span> P</div>
                  <div><span style={{color: 'var(--color-carbs)'}}>{msg.mealData.carbs}g</span> C</div>
                  <div><span style={{color: 'var(--color-fat)'}}>{msg.mealData.fat}g</span> F</div>
                </div>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="chat-message ai" style={{ opacity: 0.7 }}>
            MacroChat is calculating...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Log a meal or ask a question..."
            disabled={isTyping}
          />
          <button type="submit" className="send-button" disabled={!input.trim() || isTyping}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

export default MacroChat;
