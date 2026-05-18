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
      setResponse('ERR: GEMINI_API_KEY_NOT_FOUND\nPlease configure the environment variable.');
      return;
    }

    setLoading(true);
    try {
      const stats = getHabitStats();
      const habitsList = habits.map(h => `- ${h.title} (${h.category})`).join('\n');
      const prompt = `You are an analytical assistant for a Quantified Self enthusiast.

DATA SET:
${habitsList}

CURRENT DAY [${stats.today}]: ${stats.completed}/${stats.totalHabits} completed

TIME SERIES (7 DAYS):
${Object.entries(stats.last7Days).map(([date, count]) => `[${date}] ${count}/${stats.totalHabits}`).join('\n')}

QUERY: "${query}"

Provide a highly analytical, objective, and concise response (2-3 sentences). Focus on data trends and direct actionable insight without fluff.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.2 },
        }),
      });

      if (!res.ok) throw new Error(`API_ERR_${res.status}`);
      const data = await res.json();
      setResponse(data.candidates[0].content.parts[0].text);
    } catch (error) {
      setResponse(`ERR: ${error.message || 'API_CONNECTION_FAILED'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', textTransform: 'uppercase' }}>Data Analysis Agent</h2>
        <button onClick={() => setIsOpen(!isOpen)} className="qs-button" style={{ padding: '8px 16px', backgroundColor: isOpen ? 'var(--text-primary)' : 'var(--bg-secondary)', color: isOpen ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
          {isOpen ? 'TERMINATE_SESSION' : 'INITIATE_SESSION'}
        </button>
      </div>

      {isOpen && (
        <div className="qs-panel" style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)' }}>
          <form onSubmit={searchHabits}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="INPUT QUERY..." className="mono-text" style={{ flex: '1', minWidth: '250px', padding: '12px 16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
              <button type="submit" disabled={loading} className="qs-button primary" style={{ padding: '12px 24px', opacity: loading ? 0.5 : 1 }}>
                {loading ? 'PROCESSING...' : 'ANALYZE'}
              </button>
            </div>
          </form>

          {response && (
            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--text-primary)' }}>
              <div className="mono-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>OUTPUT // AGENT_RESPONSE</div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
