import React, { useState, useEffect } from 'react';

export function Stopwatches() {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [elapsed, setElapsed] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [sessionStart] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      // Fixed countdown to May 31, 2027
      const targetDate = new Date('2027-05-31T23:59:59').getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }

      // Elapsed time since session start
      const elapsedMs = now - sessionStart.getTime();
      setElapsed({
        days: Math.floor(elapsedMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((elapsedMs / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((elapsedMs / 1000 / 60) % 60),
        seconds: Math.floor((elapsedMs / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart]);

  const TimeDisplay = ({ label, time, color }) => (
    <div className="qs-panel" style={{ padding: '16px', border: 'none', borderRadius: '0', backgroundColor: 'var(--bg-secondary)', borderLeft: `3px solid ${color}` }}>
      <div className="mono-text" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="mono-text" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {String(time.days).padStart(2, '0')}
          </div>
          <div className="mono-text" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Days</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="mono-text" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {String(time.hours).padStart(2, '0')}
          </div>
          <div className="mono-text" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Hrs</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="mono-text" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {String(time.minutes).padStart(2, '0')}
          </div>
          <div className="mono-text" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Min</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="mono-text" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {String(time.seconds).padStart(2, '0')}
          </div>
          <div className="mono-text" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Sec</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)', marginBottom: '40px', marginTop: '40px' }}>
      <TimeDisplay label="COUNTDOWN: Until May 2027" time={countdown} color="#ef4444" />
      <TimeDisplay label="SESSION ELAPSED" time={elapsed} color="#10b981" />
    </div>
  );
}
