import React, { useState, useEffect } from 'react';

export function Stopwatches() {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [dynamicCountdown, setDynamicCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [dynamicTarget, setDynamicTarget] = useState(localStorage.getItem('dynamicTarget') || '');
  const [editMode, setEditMode] = useState(false);
  const [inputValue, setInputValue] = useState(dynamicTarget);

  useEffect(() => {
    const interval = setInterval(() => {
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

      if (dynamicTarget) {
        try {
          const targetMs = new Date(dynamicTarget).getTime();
          const diff = targetMs - now;
          if (diff > 0) {
            setDynamicCountdown({
              days: Math.floor(diff / (1000 * 60 * 60 * 24)),
              hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
              minutes: Math.floor((diff / 1000 / 60) % 60),
              seconds: Math.floor((diff / 1000) % 60),
            });
          }
        } catch (e) {
          // Invalid date format
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dynamicTarget]);

  const handleSetTarget = () => {
    if (inputValue) {
      localStorage.setItem('dynamicTarget', inputValue);
      setDynamicTarget(inputValue);
      setEditMode(false);
    }
  };

  const TimeDisplay = ({ label, time, color, onEdit, editable }) => (
    <div className="qs-panel" style={{ padding: '16px', border: 'none', borderRadius: '0', backgroundColor: 'var(--bg-secondary)', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div className="mono-text" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{label}</div>
        {editable && (
          <button onClick={onEdit} className="qs-button" style={{ padding: '2px 8px', fontSize: '10px' }}>
            {editable === 'editing' ? 'SAVE' : 'EDIT'}
          </button>
        )}
      </div>
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
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)', marginBottom: '40px', marginTop: '40px' }}>
        <TimeDisplay label="FIXED: Until May 2027" time={countdown} color="#ef4444" />
        <TimeDisplay label="DYNAMIC: Custom Target" time={dynamicCountdown} color="#3b82f6" onEdit={() => setEditMode(!editMode)} editable={editMode ? 'editing' : true} />
      </div>

      {editMode && (
        <div className="qs-panel" style={{ padding: '20px', marginBottom: '40px', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="mono-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>SET_TARGET_DATE_TIME</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="datetime-local"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{
                flex: '1',
                minWidth: '250px',
                padding: '12px 16px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
              }}
            />
            <button onClick={handleSetTarget} className="qs-button primary" style={{ padding: '12px 24px' }}>
              SET
            </button>
            <button onClick={() => { setEditMode(false); setInputValue(dynamicTarget); }} className="qs-button" style={{ padding: '12px 24px' }}>
              CANCEL
            </button>
          </div>
          {dynamicTarget && (
            <div className="mono-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              Current target: {new Date(dynamicTarget).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </>
  );
}

