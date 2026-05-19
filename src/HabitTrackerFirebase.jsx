import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { RAGAgent } from './RAGAgent';
import { Notes } from './Notes';
import { Analytics } from './Analytics';
import './index.css';

const HABITS = [
  { id: 1, title: 'Protein at every meal', description: 'Breakfast + lunch + evening + night', category: 'NUTRITION', color: '#10b981' },
  { id: 2, title: 'Phone-free hour', description: '1 hour without phone touching', category: 'PHONE', color: '#3b82f6' },
  { id: 3, title: 'One conversation', description: '10 min talk with parent (real, no phone)', category: 'COMM', color: '#a855f7' },
  { id: 4, title: 'Hair routine', description: 'Oil massage or leave-in conditioner', category: 'HEALTH', color: '#f59e0b' },
  { id: 5, title: 'No random snacking', description: 'Only planned meals, no biscuits/coffee', category: 'NUTRITION', color: '#10b981' },
  { id: 6, title: 'Eye contact practice', description: '5-7 sec windows with someone', category: 'COMM', color: '#a855f7' },
  { id: 7, title: 'Bed by 11 PM', description: 'Lights off, phone away', category: 'SLEEP', color: '#14b8a6' },
];

let db = null;
let auth = null;
let currentUser = null;

function HabitTrackerFirebase() {
  const [habits] = useState(HABITS);
  const [dailyData, setDailyData] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configInput, setConfigInput] = useState('');
  const [syncStatus, setSyncStatus] = useState('SYNCING');

  useEffect(() => {
    const initFirebase = async () => {
      try {
        let config = localStorage.getItem('firebaseConfig');
        if (!config) {
          setShowConfigForm(true);
          setLoading(false);
          return;
        }
        config = JSON.parse(config);
        await setupFirebase(config);
      } catch (error) {
        console.error('Firebase init error:', error);
        setLoading(false);
      }
    };
    initFirebase();

    const handleOnline = () => setSyncStatus('SYNCED');
    const handleOffline = () => setSyncStatus('OFFLINE');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setupFirebase = async (config) => {
    try {
      const app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);

      const userCred = await signInAnonymously(auth);
      currentUser = userCred.user;
      setUser(currentUser);

      const syncDeviceId = 'shared-habits';
      const habitsRef = collection(db, 'syncDevices', syncDeviceId, 'habits');
      const unsubscribe = onSnapshot(habitsRef, (snapshot) => {
        const data = {};
        snapshot.forEach((doc) => {
          data[doc.id] = doc.data().completed || {};
        });
        setDailyData(data);
        setSyncStatus('SYNCED');
      }, (error) => {
        if (error.code === 'permission-denied') {
          setSyncStatus('ERROR');
          console.error('Firestore permissions error:', error.message);
        } else if (error.code === 'unavailable') {
          setSyncStatus('OFFLINE');
        } else {
          setSyncStatus('ERROR');
        }
      });

      setLoading(false);
      return unsubscribe;
    } catch (error) {
      console.error('Setup error:', error);
      setSyncStatus('ERROR');
      setLoading(false);
    }
  };

  const handleConfigSubmit = (e) => {
    e.preventDefault();
    try {
      const config = JSON.parse(configInput);
      localStorage.setItem('firebaseConfig', JSON.stringify(config));
      setShowConfigForm(false);
      setConfigInput('');
      setupFirebase(config);
    } catch (error) {
      alert('Invalid Firebase config.');
    }
  };

  const getDateKey = (date) => date.toISOString().split('T')[0];
  const today = getDateKey(currentDate);
  const todayData = dailyData[today] || {};

  const toggleHabit = async (habitId) => {
    if (!db || !user) return;
    setSyncStatus('SYNCING');
    try {
      const newValue = !todayData[habitId];
      const habitRef = doc(db, 'syncDevices', 'shared-habits', 'habits', today);
      await setDoc(habitRef, { completed: { ...todayData, [habitId]: newValue } }, { merge: true });
    } catch (error) {
      console.error('Error updating habit:', error);
      setSyncStatus('ERROR');
    }
  };

  const getWeekDays = () => {
    const week = [];
    const current = new Date(currentDate);
    const dayOfWeek = current.getDay();
    const date = new Date(current);
    date.setDate(current.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(date);
      dayDate.setDate(date.getDate() + i);
      week.push(dayDate);
    }
    return week;
  };

  const getCompletionForDay = (date) => {
    const key = getDateKey(date);
    const dayData = dailyData[key] || {};
    const completed = Object.values(dayData).filter(Boolean).length;
    return { completed, total: habits.length };
  };

  const getWeekStats = () => {
    const weekDays = getWeekDays();
    let totalCompleted = 0;
    let perfectDays = 0;
    let maxStreak = 0;
    let currentStreak = 0;

    for (let i = weekDays.length - 1; i >= 0; i--) {
      const { completed, total } = getCompletionForDay(weekDays[i]);
      totalCompleted += completed;
      if (completed === total) {
        perfectDays++;
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (completed >= 5) {
        currentStreak = 0;
      } else {
        currentStreak = 0;
      }
    }
    return {
      totalCompleted,
      perfectDays,
      weekStreak: maxStreak,
      weekPercentage: Math.round((totalCompleted / (habits.length * 7)) * 100) || 0,
    };
  };

  const resetWeek = async () => {
    if (!db || !user) return;
    try {
      setSyncStatus('SYNCING');
      const weekDays = getWeekDays();
      for (const date of weekDays) {
        const key = getDateKey(date);
        const habitRef = doc(db, 'syncDevices', 'shared-habits', 'habits', key);
        await setDoc(habitRef, { completed: {} }, { merge: true });
      }
      setShowResetConfirm(false);
      setSyncStatus('SYNCED');
    } catch (error) {
      console.error('Error resetting:', error);
      setSyncStatus('ERROR');
    }
  };

  const exportData = () => {
    const weekDays = getWeekDays();
    const stats = getWeekStats();
    let content = `DATA EXPORT - QUANTIFIED SELF\nPERIOD: ${weekDays[0].toISOString().split('T')[0]} TO ${weekDays[6].toISOString().split('T')[0]}\n\n`;
    content += `AGGREGATES\n----------\nTOTAL_COMPLETED: ${stats.totalCompleted}/${habits.length * 7}\nPERFECT_DAYS: ${stats.perfectDays}\nMAX_STREAK: ${stats.weekStreak}\nCOMPLETION_RATE: ${stats.weekPercentage}%\n\n`;
    content += `DAILY LOG\n---------\n`;
    weekDays.forEach((date) => {
      const { completed, total } = getCompletionForDay(date);
      const dateStr = date.toISOString().split('T')[0];
      content += `\n[${dateStr}] COMPLETED: ${completed}/${total}\n`;
      habits.forEach((habit) => {
        const key = getDateKey(date);
        const dayData = dailyData[key] || {};
        const status = dayData[habit.id] ? '1' : '0';
        content += `  ${status} | ${habit.title}\n`;
      });
    });
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `qs-export-${today}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const weekDays = getWeekDays();
  const stats = getWeekStats();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div className="mono-text" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>INITIALIZING_ENVIRONMENT...</div>
      </div>
    );
  }

  if (showConfigForm) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="qs-panel" style={{ maxWidth: '600px', width: '100%', padding: '40px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '24px', letterSpacing: '-0.02em' }}>System Setup</h1>
          <form onSubmit={handleConfigSubmit}>
            <textarea value={configInput} onChange={(e) => setConfigInput(e.target.value)} placeholder='{ "apiKey": "..." }' style={{ width: '100%', minHeight: '200px', padding: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px', marginBottom: '20px', outline: 'none' }} />
            <button type="submit" className="qs-button primary" style={{ width: '100%', padding: '14px' }}>INITIALIZE CONNECTION</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>Quantified Self</h1>
          <div className="mono-text" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>HABIT TRACKING & ANALYSIS MODULE</div>
        </div>
        <div className="mono-text" style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-color)', color: syncStatus === 'SYNCED' ? '#10b981' : '#fbbf24', backgroundColor: 'var(--bg-secondary)' }}>
          STATUS: {syncStatus}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)', marginBottom: '40px' }}>
        <div className="qs-panel" style={{ padding: '24px', border: 'none', borderRadius: '0' }}>
          <div className="mono-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>CURRENT_DATE</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>{currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
        </div>
        {[
          { label: 'WEEKLY_PROGRESS', value: `${stats.totalCompleted} / ${habits.length * 7}` },
          { label: 'PERFECT_DAYS', value: stats.perfectDays },
          { label: 'MAX_STREAK', value: stats.weekStreak },
          { label: 'COMPLETION_RATE', value: `${stats.weekPercentage}%` },
        ].map((stat, idx) => (
          <div key={idx} className="qs-panel" style={{ padding: '24px', border: 'none', borderRadius: '0' }}>
            <div className="mono-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{stat.label}</div>
            <div className="mono-text" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', textTransform: 'uppercase' }}>Daily Log</h2>
          <div className="mono-text" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>N={habits.length}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {habits.map((habit) => (
            <div key={habit.id} className="qs-panel" style={{ display: 'flex', cursor: 'pointer', opacity: todayData[habit.id] ? 0.6 : 1, borderLeft: `3px solid ${todayData[habit.id] ? 'var(--border-color)' : habit.color}` }} onClick={() => toggleHabit(habit.id)}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                <input type="checkbox" checked={todayData[habit.id] || false} readOnly style={{ width: '16px', height: '16px', accentColor: '#333' }} />
              </div>
              <div style={{ padding: '16px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '500', textDecoration: todayData[habit.id] ? 'line-through' : 'none', color: 'var(--text-primary)', marginBottom: '4px' }}>{habit.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{habit.description}</div>
                </div>
                <div className="mono-text" style={{ fontSize: '10px', padding: '4px 8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>{habit.category}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>Time Series</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1px', backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)' }}>
          {weekDays.map((date) => {
            const { completed, total } = getCompletionForDay(date);
            const isToday = getDateKey(date) === today;
            const completionRatio = total === 0 ? 0 : completed / total;
            return (
              <div key={getDateKey(date)} onClick={() => setCurrentDate(date)} className="qs-panel" style={{ padding: '20px 16px', textAlign: 'center', cursor: 'pointer', backgroundColor: isToday ? 'var(--hover-bg)' : 'var(--bg-secondary)', border: 'none', borderRadius: '0' }}>
                <div className="mono-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>
                <div style={{ width: '100%', height: '60px', backgroundColor: 'var(--bg-primary)', position: 'relative', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${completionRatio * 100}%`, backgroundColor: 'var(--text-primary)', transition: 'height 0.3s ease' }} />
                </div>
                <div className="mono-text" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{completed} / {total}</div>
              </div>
            );
          })}
        </div>
      </div>

      <RAGAgent dailyData={dailyData} habits={habits} currentDate={currentDate} />
      <Analytics dailyData={dailyData} habits={habits} currentDate={currentDate} />
      <Notes db={db} syncDeviceId="shared-habits" />

      <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '32px', marginTop: '60px' }}>
        <button onClick={exportData} className="qs-button" style={{ padding: '12px 24px' }}>EXPORT_CSV</button>
        <button onClick={() => setShowResetConfirm(true)} className="qs-button danger" style={{ padding: '12px 24px' }}>RESET_DATA</button>
      </div>

      {showResetConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 10, 10, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="qs-panel" style={{ padding: '32px', maxWidth: '400px', width: '90%', backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Confirm System Reset</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={resetWeek} className="qs-button danger" style={{ flex: 1, padding: '12px' }}>EXECUTE</button>
              <button onClick={() => setShowResetConfirm(false)} className="qs-button" style={{ flex: 1, padding: '12px' }}>ABORT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HabitTrackerFirebase;
