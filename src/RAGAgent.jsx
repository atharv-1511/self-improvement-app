import React, { useState, useEffect } from 'react';

export function RAGAgent({ dailyData, habits, currentDate }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [availableModel, setAvailableModel] = useState('gpt-4o');

  useEffect(() => {
    const checkAvailableModels = async () => {
      const apiKey = process.env.REACT_APP_GROQ_API_KEY;
      if (!apiKey) return;

      try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const modelId = data.data[0].id;
          console.log('Available models:', data.data.map(m => m.id));
          setAvailableModel(modelId);
        }
      } catch (error) {
        console.warn('Could not fetch available models, using default');
      }
    };
    checkAvailableModels();
  }, []);

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

    const apiKey = process.env.REACT_APP_GROQ_API_KEY;
    if (!apiKey) {
      setResponse('ERR: GROQ_API_KEY_NOT_CONFIGURED\nAdd REACT_APP_GROQ_API_KEY to .env file');
      return;
    }

    setLoading(true);
    setResponse('');
    try {
      const stats = getHabitStats();
      const habitsList = habits.map(h => `- ${h.title} (${h.category})`).join('\n');

      const habitContext = `HABIT TRACKING DATA (Available if relevant to the query):
${habitsList}

CURRENT DAY [${stats.today}]: ${stats.completed}/${stats.totalHabits} completed

TIME SERIES (7 DAYS):
${Object.entries(stats.last7Days).map(([date, count]) => `[${date}] ${count}/${stats.totalHabits}`).join('\n')}`;

      const prompt = `You are Atharv's personal AI assistant. You can:
1. Have normal conversations (greet, chat, answer questions, discuss ideas)
2. Provide habit tracking analysis when the user asks about their habits/progress
3. Give life coaching & optimization suggestions based on their data

IMPORTANT:
- If the user just says "Hi" or asks general questions, respond naturally without forcing habit context
- Only use the habit data below when it's actually relevant to their query
- Be conversational and friendly, not robotic

${habitContext}

USER QUERY: "${query}"

If the query is about habits/personal growth: Use the data above to provide insights.
If the query is general conversation: Just respond naturally as an AI assistant.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: availableModel,
          messages: [
            { role: 'system', content: 'You are a helpful, friendly AI assistant. Be natural and conversational.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.message || 'Request failed';
        console.error('Groq API Error Response:', data);
        throw new Error(`API_ERROR_${res.status}: ${errorMsg}`);
      }

      if (data.choices?.[0]?.message?.content) {
        setResponse(data.choices[0].message.content);
        setQuery('');
      } else {
        throw new Error('INVALID_RESPONSE: No content in API response');
      }
    } catch (error) {
      console.error('RAGAgent Error:', error);
      setResponse(`ERR: ${error.message}`);
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
