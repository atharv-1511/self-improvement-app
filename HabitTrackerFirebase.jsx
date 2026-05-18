import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';

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
  'Every small step counts. Keep going!',
  'Progress over perfection. You are doing great!',
  'Today is a fresh start. Make it count!',
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
  const [firebaseConfig, setFirebaseConfig] = useState(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configInput, setConfigInput] = useState('');
  const [syncStatus, setSyncStatus] = useState('syncing');

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Try to get saved config from localStorage
        let config = localStorage.getItem('firebaseConfig');

        if (!config) {
          // If no config, show setup form
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

      // Sign in anonymously
      const userCred = await signInAnonymously(auth);
      currentUser = userCred.user;
      setUser(currentUser);

      // Listen for real-time updates
      const habitsRef = collection(db, 'users', currentUser.uid, 'habits');
      const unsubscribe = onSnapshot(habitsRef, async (snapshot) => {
        const data = {};
        snapshot.forEach((doc) => {
          data[doc.id] = doc.data().completed || {};
        });
        setDailyData(data);
        setSyncStatus('synced');
      });

      // Load dark mode preference
      const savedMode = localStorage.getItem('habitTrackerDarkMode');
      if (savedMode) setDarkMode(JSON.parse(savedMode));

      // Set random quote
      setQuote(
        MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]
      );

      setLoading(false);

      return unsubscribe;
    } catch (error) {
      console.error('Setup error:', error);
      setLoading(false);
    }
  };

  const handleConfigSubmit = (e) => {
    e.preventDefault();
    try {
      const config = JSON.parse(configInput);
      localStorage.setItem('firebaseConfig', JSON.stringify(config));
      setFirebaseConfig(config);
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
    if (!db || !user) return;

    setSyncStatus('syncing');
    try {
      const newValue = !todayData[habitId];
      const habitRef = doc(db, 'users', user.uid, 'habits', today);

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
    } catch (error) {
      console.error('Error updating habit:', error);
      setSyncStatus('error');
    }
  };

  const getWeekDays = () => {
    const week = [];
    const current = new Date(currentDate);
    const first = current.getDate() - current.getDay();

    for (let i = 0; i < 7; i++) {
      const date = new Date(current.getFullYear(), current.getMonth(), first + i);
      week.push(date);
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

      for (const date of weekDays) {
        const key = getDateKey(date);
        const habitRef = doc(db, 'users', user.uid, 'habits', key);
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
        const status = dayData[habit.id] ? '✓' : '✗';
        content += `  ${status} ${habit.title}\n`;
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

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('habitTrackerDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const weekDays = getWeekDays();
  const stats = getWeekStats();

  const theme = {
    bg: darkMode ? '#1a1a1a' : '#ffffff',
    text: darkMode ? '#ffffff' : '#000000',
    border: darkMode ? '#333333' : '#e5e7eb',
    cardBg: darkMode ? '#2a2a2a' : '#f9fafb',
    hover: darkMode ? '#3a3a3a' : '#f3f4f6',
  };

  const getDayColor = (completed, total) => {
    if (completed === total) return '#10b981';
    if (completed >= 5) return '#fbbf24';
    return '#9ca3af';
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: theme.bg,
          color: theme.text,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div>Loading Habit Tracker...</div>
        </div>
      </div>
    );
  }

  if (showConfigForm) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: theme.bg,
          color: theme.text,
          padding: '20px',
        }}
      >
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            🚀 First Time Setup
          </h1>
          <p style={{ marginBottom: '20px', color: darkMode ? '#999' : '#666' }}>
            To enable phone & web sync, you need to:
          </p>
          <ol style={{ marginBottom: '20px', color: darkMode ? '#999' : '#666' }}>
            <li style={{ marginBottom: '10px' }}>
              Create a free Firebase project at{' '}
              <a
                href="https://firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'underline' }}
              >
                firebase.google.com
              </a>
            </li>
            <li style={{ marginBottom: '10px' }}>
              Set up Firestore Database (production mode)
            </li>
            <li style={{ marginBottom: '10px' }}>
              Enable Anonymous Authentication
            </li>
            <li style={{ marginBottom: '10px' }}>
              Copy your Firebase config from Project Settings
            </li>
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
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.cardBg,
                color: theme.text,
                fontFamily: 'monospace',
                fontSize: '12px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#10b981',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ✅ Connect to Firebase
            </button>
          </form>

          <p
            style={{
              marginTop: '20px',
              fontSize: '12px',
              color: darkMode ? '#666' : '#999',
              textAlign: 'center',
            }}
          >
            📚{' '}
            <a
              href="https://firebase.google.com/docs/firestore/quickstart"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'underline' }}
            >
              Firebase Setup Guide
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', padding: '16px' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: ${theme.bg};
          color: ${theme.text};
        }
        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #10b981;
        }
        button {
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        button:hover {
          opacity: 0.9;
        }
        .primary-btn {
          background-color: #10b981;
          color: white;
        }
        .danger-btn {
          background-color: #ef4444;
          color: white;
        }
        .secondary-btn {
          background-color: ${theme.cardBg};
          color: ${theme.text};
          border: 1px solid ${theme.border};
        }
        @media (max-width: 640px) {
          h1 { font-size: 24px; }
          h2 { font-size: 18px; }
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>Habit Tracker</h1>
            <p style={{ fontSize: '14px', color: darkMode ? '#999' : '#666', fontStyle: 'italic' }}>
              {quote}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '8px 12px' }}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: syncStatus === 'synced' ? '#d1fae5' : '#fef3c7',
                color: syncStatus === 'synced' ? '#065f46' : '#92400e',
                fontSize: '12px',
                fontWeight: '600',
                minWidth: '60px',
              }}
            >
              {syncStatus === 'syncing' ? '⟳ Syncing' : syncStatus === 'synced' ? '✓ Synced' : '⚠ Error'}
            </div>
          </div>
        </div>

        {/* Current Date */}
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
          Today:{' '}
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {[
            { label: 'This Week', value: `${stats.totalCompleted}/${habits.length * 7}` },
            { label: 'Perfect Days', value: stats.perfectDays },
            { label: 'Best Streak', value: `${stats.weekStreak}d` },
            { label: 'Rate', value: `${stats.weekPercentage}%` },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: theme.cardBg,
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11px', color: darkMode ? '#999' : '#666', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Daily Habits */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Today's Habits
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
            }}
          >
            {habits.map((habit) => (
              <div
                key={habit.id}
                style={{
                  backgroundColor: theme.cardBg,
                  border: `2px solid ${todayData[habit.id] ? habit.color : theme.border}`,
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => toggleHabit(habit.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={todayData[habit.id] || false}
                    onChange={() => toggleHabit(habit.id)}
                    style={{ marginRight: '10px', marginTop: '2px', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        textDecoration: todayData[habit.id] ? 'line-through' : 'none',
                        color: todayData[habit.id]
                          ? darkMode
                            ? '#666'
                            : '#999'
                          : theme.text,
                        marginBottom: '2px',
                      }}
                    >
                      {habit.title}
                    </div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#999' : '#666', marginBottom: '6px' }}>
                      {habit.description}
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '3px 6px',
                        backgroundColor: theme.hover,
                        borderRadius: '4px',
                        color: darkMode ? '#999' : '#666',
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
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Weekly Overview
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))',
              gap: '8px',
            }}
          >
            {weekDays.map((date) => {
              const { completed, total } = getCompletionForDay(date);
              const dayColor = getDayColor(completed, total);
              const isToday = getDateKey(date) === today;

              return (
                <div
                  key={getDateKey(date)}
                  onClick={() => setCurrentDate(date)}
                  style={{
                    backgroundColor: isToday ? theme.hover : theme.cardBg,
                    border: isToday ? `2px solid ${dayColor}` : `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: darkMode ? '#999' : '#666', marginBottom: '4px' }}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '10px', color: dayColor, fontWeight: 'bold', marginBottom: '8px' }}>
                    {completed}/{total}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '3px',
                      backgroundColor: theme.hover,
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(completed / total) * 100}%`,
                        backgroundColor: dayColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <button onClick={exportData} className="primary-btn">
            📥 Export
          </button>
          <button onClick={() => setShowResetConfirm(true)} className="danger-btn">
            🔄 Reset
          </button>
        </div>

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: '1000',
            }}
          >
            <div
              style={{
                backgroundColor: theme.bg,
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                maxWidth: '90%',
                width: '400px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                Reset This Week?
              </h3>
              <p style={{ marginBottom: '16px', color: darkMode ? '#999' : '#666', fontSize: '14px' }}>
                This will clear all habit data for this week.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={resetWeek} className="danger-btn" style={{ flex: 1 }}>
                  Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="secondary-btn"
                  style={{ flex: 1 }}
                >
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
