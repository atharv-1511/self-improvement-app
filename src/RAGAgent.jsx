import React, { useState } from 'react';

export function RAGAgent({ dailyData, habits, currentDate }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getHabitStats = () => {
    const today = currentDate.toISOString().split('T')[0];
    const todayData = dailyData[today] || {};
    const completed = Object.values(todayData).filter(Boolean).length;

    const last7Days = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayData = dailyData[dateKey] || {};
      const dayCompleted = Object.values(dayData).filter(Boolean).length;
      last7Days[dateKey] = dayCompleted;
    }

    return { today, todayData, completed, last7Days, totalHabits: habits.length };
  };

  const searchHabits = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      setResponse('Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.');
      return;
    }

    setLoading(true);
    try {
      const stats = getHabitStats();

      const habitsList = habits.map(h => `- ${h.title} (${h.category})`).join('\n');
      const prompt = `You are a personal habit coach analyzing user's habit tracking data.

User's Habits:
${habitsList}

Today's Progress: ${stats.completed}/${stats.totalHabits} habits completed

Past 7 days completion: ${Object.entries(stats.last7Days).map(([date, count]) => `${date}: ${count}/${stats.totalHabits}`).join(', ')}

User's Question: ${query}

Provide a concise, actionable response (2-3 sentences max) to help them improve their habits.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;
      setResponse(aiResponse);
    } catch (error) {
      console.error('RAG Agent error:', error);
      setResponse(`Error: ${error.message || 'Failed to get response from Gemini API'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-button"
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>Ask AI Coach</span>
        <span>{isOpen ? 'Close' : 'Open'}</span>
      </button>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            marginTop: '16px',
            padding: '24px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid #8b5cf6',
          }}
        >
          <form onSubmit={searchHabits}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me about your habits..."
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? 'var(--border-color)' : '#8b5cf6',
                color: loading ? 'var(--text-secondary)' : 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Thinking...' : 'Get Advice'}
            </button>
          </form>

          {response && (
            <div
              style={{
                marginTop: '20px',
                padding: '20px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {response}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
