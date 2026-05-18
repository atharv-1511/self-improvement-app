import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { RAGAgent } from './RAGAgent';
import './index.css';

const HABITS = [
  {
    id: 1,
    title: 'Protein at every meal',
    description: 'Breakfast + lunch + evening + night',
    category: 'Nutrition',
    color: '#10b981',
  },
  {
    id: 2,
    title: 'Phone-free hour',
    description: '1 hour without phone touching',
    category: 'Phone',
    color: '#3b82f6',
  },
  {
    id: 3,
    title: 'One conversation',
    description: '10 min talk with parent (real, no phone)',
    category: 'Communication',
    color: '#a855f7',
  },
  {
    id: 4,
    title: 'Hair routine',
    description: 'Oil massage or leave-in conditioner',
    category: 'Health',
    color: '#f59e0b',
  },
  {
    id: 5,
    title: 'No random snacking',
    description: 'Only planned meals, no biscuits/coffee',
    category: 'Nutrition',
    color: '#10b981',
  },
  {
    id: 6,
    title: 'Eye contact practice',
    description: '5-7 sec windows with someone',
    category: 'Communication',
    color: '#a855f7',
  },
  {
    id: 7,
    title: 'Bed by 11 PM',
    description: 'Lights off, phone away',
    category: 'Sleep',
    color: '#14b8a6',
  },
];

const MOTIVATION_QUOTES = [
  'Every small step counts. Keep going.',
  'Progress over perfection. You are doing great.',
  'Today is a fresh start. Make it count.',
  'Consistency is the key to success.',
  'You are stronger than your excuses.',
  'Small habits, big results.',
  'One day at a time, one habit at a time.',
  'Your future self will thank you.',
  'Discipline is choosing what you want most over what you want now.',
  'Build the life you want, one habit at a time.',
];

let db = null;
let auth = null;
let currentUser = null;

function HabitTrackerFirebase() {
  const [darkMode, setDarkMode] = useState(false);
  const [habits] = useState(HABITS);
  const [dailyData, setDailyData] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [quote, setQuote] = useState(MOTIVATION_QUOTES[0]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configInput, setConfigInput] = useState('');
  const [syncStatus, setSyncStatus] = useState('syncing');

  // Initialize Firebase
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
  }, []);

  const setupFirebase = async (config) => {
    try {
      const app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);

      const userCred = await signInAnonymously(auth);
      currentUser = userCred.user;
      setUser(currentUser);
      console.log('Anonymous user signed in:', currentUser.uid);

      const syncDeviceId = 'shared-habits';
      console.log('Sync Device ID:', syncDeviceId);

      const pollInterval = setInterval(async () => {
        try {
          const habitsRef = collection(db, 'syncDevices', syncDeviceId, 'habits');
          const snapshot = await getDocs(habitsRef);

          const data = {};
          snapshot.forEach((doc) => {
            data[doc.id] = doc.data().completed || {};
          });
          setDailyData(data);
          setSyncStatus('synced');
          console.log('Firestore data polled:', snapshot.docs.length, 'documents');
        } catch (error) {
          console.error('Firestore poll error:', error);
          setSyncStatus('error');
          if (error.code === 'permission-denied') {
            console.error('Permission issue: Check your Firestore rules');
          }
        }
      }, 3000);

      const savedMode = localStorage.getItem('habitTrackerDarkMode');
      if (savedMode) setDarkMode(JSON.parse(savedMode));

      setQuote(
        MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]
      );

      setLoading(false);

      return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Setup error:', error);
      setSyncStatus('error');
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
      alert('Invalid Firebase config. Make sure it is valid JSON.');
    }
  };

  const getDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const today = getDateKey(currentDate);
  const todayData = dailyData[today] || {};

  const toggleHabit = async (habitId) => {
    if (!db || !user) {
      console.warn('Cannot toggle: db or user not ready');
      return;
    }

    setSyncStatus('syncing');
    try {
      const newValue = !todayData[habitId];
      const habitRef = doc(db, 'syncDevices', 'shared-habits', 'habits', today);

      console.log('Writing habit:', { habitId, newValue, today });

      await setDoc(
        habitRef,
        {
          completed: {
            ...todayData,
            [habitId]: newValue,
          },
        },
        { merge: true }
      );

      console.log('Habit written successfully');
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error updating habit:', error);
      setSyncStatus('error');
      if (error.code === 'permission-denied') {
        console.error('Permission denied! Check Firestore rules for path: syncDevices/shared-habits/habits/{today}');
      }
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

    for (let i = weekDays.length - 1; i >= 0; i--) {
      const { completed, total } = getCompletionForDay(weekDays[i]);
      totalCompleted += completed;

      if (completed === total) {
        perfectDays++;
        maxStreak = Math.max(maxStreak, perfectDays);
      } else if (completed >= 5) {
        perfectDays = 0;
      } else {
        perfectDays = 0;
      }
    }

    return {
      totalCompleted,
      perfectDays,
      weekStreak: maxStreak,
      weekPercentage: Math.round((totalCompleted / (habits.length * 7)) * 100),
    };
  };

  const resetWeek = async () => {
    if (!db || !user) return;

    try {
      setSyncStatus('syncing');
      const weekDays = getWeekDays();
      const syncDeviceId = localStorage.getItem('syncDeviceId');

      for (const date of weekDays) {
        const key = getDateKey(date);
        const habitRef = doc(db, 'syncDevices', syncDeviceId, 'habits', key);
        await setDoc(habitRef, { completed: {} }, { merge: true });
      }

      setShowResetConfirm(false);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error resetting:', error);
      setSyncStatus('error');
    }
  };

  const exportData = () => {
    const weekDays = getWeekDays();
    const stats = getWeekStats();
    let content = `HABIT TRACKER - WEEKLY REPORT\n`;
    content += `Week of ${weekDays[0].toDateString()} to ${weekDays[6].toDateString()}\n\n`;
    content += `WEEKLY STATS\n`;
    content += `============\n`;
    content += `Total Habits Completed: ${stats.totalCompleted}/${habits.length * 7}\n`;
    content += `Perfect Days (7/7): ${stats.perfectDays}\n`;
    content += `Weekly Streak: ${stats.weekStreak} days\n`;
    content += `Completion Rate: ${stats.weekPercentage}%\n\n`;

    content += `DAILY BREAKDOWN\n`;
    content += `===============\n`;

    weekDays.forEach((date) => {
      const { completed, total } = getCompletionForDay(date);
      const dayName = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      content += `\n${dayName}: ${completed}/${total}\n`;

      habits.forEach((habit) => {
        const key = getDateKey(date);
        const dayData = dailyData[key] || {};
        const status = dayData[habit.id] ? 'Completed' : 'Missed';
        content += `  [${status}] ${habit.title}\n`;
      });
    });

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
    );
    element.setAttribute('download', `habit-tracker-${today}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  useEffect(() => {
    localStorage.setItem('habitTrackerDarkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  const weekDays = getWeekDays();
  const stats = getWeekStats();

  const getDayColor = (completed, total) => {
    if (completed === total) return '#10b981';
    if (completed >= 5) return '#fbbf24';
    return '#9ca3af';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }} className="gradient-text">
            Loading...
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Preparing Habit Tracker</div>
        </div>
      </div>
    );
  }

  if (showConfigForm) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }} className="gradient-text">
            First Time Setup
          </h1>
          <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
            To enable phone and web sync, you need to:
          </p>
          <ol style={{ marginBottom: '24px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Create a free Firebase project at firebase.google.com</li>
            <li>Set up Firestore Database (production mode)</li>
            <li>Enable Anonymous Authentication</li>
            <li>Copy your Firebase config from Project Settings</li>
            <li>Paste it below</li>
          </ol>

          <form onSubmit={handleConfigSubmit}>
            <textarea
              value={configInput}
              onChange={(e) => setConfigInput(e.target.value)}
              placeholder={`Paste your Firebase config here:\n{\n  "apiKey": "...",\n  "authDomain": "...",\n  ...\n}`}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '13px',
                marginBottom: '20px',
                resize: 'vertical',
              }}
            />
            <button
              type="submit"
              className="glass-button"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#10b981',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Connect to Firebase
            </button>
          </form>

          <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Refer to the Firebase Setup Guide for detailed instructions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px' }}>
      <style>{`
        input[type="checkbox"] {
          width: 22px;
          height: 22px;
          cursor: pointer;
          accent-color: #10b981;
        }
        .btn {
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-primary { background-color: #10b981; color: white; }
        .btn-primary:hover { background-color: #059669; transform: translateY(-1px); }
        .btn-danger { background-color: #ef4444; color: white; }
        .btn-danger:hover { background-color: #dc2626; transform: translateY(-1px); }
        .btn-secondary { background-color: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); }
        .btn-secondary:hover { background-color: var(--hover-bg); }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
              Habit Tracker
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '600px' }}>
              "{quote}"
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              className="glass-panel"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                color: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'synced' ? 'Synced' : 'Sync Error'}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="glass-button"
              style={{ padding: '8px 16px', borderRadius: '16px', cursor: 'pointer', border: 'none', fontWeight: '600', color: 'var(--text-primary)' }}
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>

        {/* Current Date */}
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: 'var(--text-primary)' }}>
          Today: {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Weekly Progress', value: \`\${stats.totalCompleted} / \${habits.length * 7}\` },
            { label: 'Perfect Days', value: stats.perfectDays },
            { label: 'Best Streak', value: \`\${stats.weekStreak} Days\` },
            { label: 'Completion Rate', value: \`\${stats.weekPercentage}%\` },
          ].map((stat, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Daily Habits */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Today's Habits
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="glass-panel"
                style={{
                  borderLeft: \`4px solid \${todayData[habit.id] ? habit.color : 'var(--border-color)'}\`,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: todayData[habit.id] ? 0.7 : 1,
                  transform: todayData[habit.id] ? 'scale(0.98)' : 'scale(1)',
                }}
                onClick={() => toggleHabit(habit.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <input
                    type="checkbox"
                    checked={todayData[habit.id] || false}
                    onChange={() => toggleHabit(habit.id)}
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        textDecoration: todayData[habit.id] ? 'line-through' : 'none',
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                      }}
                    >
                      {habit.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                      {habit.description}
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {habit.category}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly View */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Weekly Overview
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
            {weekDays.map((date) => {
              const { completed, total } = getCompletionForDay(date);
              const dayColor = getDayColor(completed, total);
              const isToday = getDateKey(date) === today;

              return (
                <div
                  key={getDateKey(date)}
                  onClick={() => setCurrentDate(date)}
                  className="glass-panel"
                  style={{
                    border: isToday ? \`2px solid \${dayColor}\` : '1px solid var(--border-color)',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isToday ? 'var(--hover-bg)' : 'var(--glass-bg)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '14px', color: dayColor, fontWeight: 'bold', marginBottom: '12px' }}>
                    {completed} / {total}
                  </div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: \`\${(completed / total) * 100}%\`, backgroundColor: dayColor, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Habit Coach */}
        <RAGAgent dailyData={dailyData} habits={habits} currentDate={currentDate} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '40px' }}>
          <button onClick={exportData} className="btn btn-primary glass-button">
            Export Data
          </button>
          <button onClick={() => setShowResetConfirm(true)} className="btn btn-danger glass-button">
            Reset Week
          </button>
        </div>

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000' }}>
            <div className="glass-panel" style={{ padding: '32px', maxWidth: '90%', width: '400px', backgroundColor: 'var(--bg-primary)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
                Reset This Week?
              </h3>
              <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
                This action will clear all habit data for the current week. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={resetWeek} className="btn btn-danger" style={{ flex: 1 }}>
                  Confirm Reset
                </button>
                <button onClick={() => setShowResetConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HabitTrackerFirebase;
