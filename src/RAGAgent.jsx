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

    // Get stats for past 7 days
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

    // Check if API key is available
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      setResponse('⚠️ OpenAI API key not configured. Please set REACT_APP_OPENAI_API_KEY environment variable.');
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

Past 7 days completion: ${Object.entries(stats.last7Days).map(([date, count]) => `${date}: ${count}/7`).join(', ')}

User's Question: ${query}

Provide a concise, actionable response (2-3 sentences max) to help them improve their habits.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a personal habit coach. Provide concise, actionable advice.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      setResponse(aiResponse);
    } catch (error) {
      console.error('RAG Agent error:', error);
      setResponse(`❌ Error: ${error.message || 'Failed to get response from OpenAI API'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
        }}
      >
        🤖 Ask AI Coach {isOpen ? '▼' : '▶'}
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: '#f5f3ff',
            borderRadius: '8px',
            border: '2px solid #8b5cf6',
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
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #d8b4fe',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '10px',
                backgroundColor: loading ? '#ccc' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {loading ? '⏳ Thinking...' : '💭 Get Advice'}
            </button>
          </form>

          {response && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #e9d5ff',
              }}
            >
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                {response}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
