import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

export function Analytics({ dailyData, habits, currentDate }) {
  const { trendData, categoryData, habitData } = useMemo(() => {
    const trend = [];
    const dateList = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayData = dailyData[dateKey] || {};
      const completed = Object.values(dayData).filter(Boolean).length;
      trend.push({
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed,
        target: habits.length
      });
      dateList.push(dateKey);
    }

    const categoryTotals = {};
    const categoryPossible = {};
    dateList.forEach(dateKey => {
      const dayData = dailyData[dateKey] || {};
      habits.forEach(h => {
        if (!categoryPossible[h.category]) categoryPossible[h.category] = 0;
        if (!categoryTotals[h.category]) categoryTotals[h.category] = 0;
        categoryPossible[h.category] += 1;
        if (dayData[h.id]) categoryTotals[h.category] += 1;
      });
    });

    const category = Object.keys(categoryPossible).map(cat => ({
      subject: cat,
      A: Math.round((categoryTotals[cat] / categoryPossible[cat]) * 100) || 0,
      fullMark: 100,
    }));

    const habitPerf = habits.map(h => {
      let completedCount = 0;
      dateList.forEach(dateKey => {
        const dayData = dailyData[dateKey] || {};
        if (dayData[h.id]) completedCount += 1;
      });
      return {
        name: h.title.length > 12 ? h.title.substring(0, 12) + '..' : h.title,
        rate: Math.round((completedCount / dateList.length) * 100) || 0
      };
    });

    return { trendData: trend, categoryData: category, habitData: habitPerf };
  }, [dailyData, habits, currentDate]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '10px' }}>
          <p className="mono-text" style={{ fontSize: '12px', margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="mono-text" style={{ fontSize: '13px', margin: 0, color: entry.color || 'var(--text-primary)' }}>
              {entry.name.toUpperCase()}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ marginTop: '60px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', textTransform: 'uppercase' }}>Advanced Analytics & Diagnostics</h2>
        <div className="mono-text" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>T-14 DAYS WINDOW</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)' }}>

        <div className="qs-panel" style={{ padding: '24px', border: 'none', borderRadius: '0', minWidth: 0 }}>
          <h3 className="mono-text" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>COMPLETION_VOLUME_TREND</h3>
          <div style={{ width: '100%', height: '250px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="stepAfter" dataKey="completed" stroke="var(--text-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--bg-primary)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="qs-panel" style={{ padding: '24px', border: 'none', borderRadius: '0', minWidth: 0 }}>
          <h3 className="mono-text" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>CATEGORY_DISTRIBUTION_RADAR (%)</h3>
          <div style={{ width: '100%', height: '250px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Radar name="Completion %" dataKey="A" stroke="var(--text-primary)" fill="var(--text-primary)" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="qs-panel" style={{ padding: '24px', border: 'none', borderRadius: '0', gridColumn: '1 / -1', minWidth: 0 }}>
          <h3 className="mono-text" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>INDIVIDUAL_HABIT_CONSISTENCY (%)</h3>
          <div style={{ width: '100%', height: '200px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" fill="var(--text-primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
