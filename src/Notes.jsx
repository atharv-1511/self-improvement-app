import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Notes({ db, syncDeviceId }) {
  const [notes, setNotes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTags, setEditTags] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [sortBy, setSortBy] = useState('updated');

  useEffect(() => {
    if (!db) return;
    const notesRef = collection(db, 'syncDevices', syncDeviceId, 'notes');
    const unsubscribe = onSnapshot(notesRef, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      data.sort((a, b) => {
        if (sortBy === 'updated') return b.updatedAt - a.updatedAt;
        if (sortBy === 'duedate') {
          if (!a.dueDate && !b.dueDate) return b.updatedAt - a.updatedAt;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return b.updatedAt - a.updatedAt;
      });
      setNotes(data);
    }, (error) => console.error('Notes sync error:', error));
    return () => unsubscribe();
  }, [db, syncDeviceId, sortBy]);

  const handleAddNote = async () => {
    if (!db) return;
    const newNoteRef = doc(collection(db, 'syncDevices', syncDeviceId, 'notes'));
    await setDoc(newNoteRef, {
      title: '',
      content: '',
      priority: 'MEDIUM',
      dueDate: '',
      tags: [],
      updatedAt: Date.now()
    });
    setEditingId(newNoteRef.id);
    setEditTitle('');
    setEditContent('');
    setEditPriority('MEDIUM');
    setEditDueDate('');
    setEditTags('');
  };

  const handleSave = async (id) => {
    if (!db) return;
    const noteRef = doc(db, 'syncDevices', syncDeviceId, 'notes', id);
    const tagsArray = editTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    await setDoc(noteRef, {
      title: editTitle,
      content: editContent,
      priority: editPriority,
      dueDate: editDueDate,
      tags: tagsArray,
      updatedAt: Date.now()
    }, { merge: true });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!db || !window.confirm('PERMANENTLY_DELETE_RECORD?')) return;
    const noteRef = doc(db, 'syncDevices', syncDeviceId, 'notes', id);
    await deleteDoc(noteRef);
  };

  const getPriorityColor = (priority) => {
    if (priority === 'HIGH') return '#ef4444';
    if (priority === 'MEDIUM') return '#f59e0b';
    return '#9ca3af';
  };

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return { text: '', color: '' };
    const today = new Date().toISOString().split('T')[0];
    if (dueDate < today) return { text: 'OVERDUE', color: '#ef4444' };
    if (dueDate === today) return { text: 'DUE_TODAY', color: '#f59e0b' };
    const daysUntil = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) return { text: `DUE_IN_${daysUntil}D`, color: '#f59e0b' };
    return { text: '', color: '' };
  };

  const filteredNotes = filterPriority === 'ALL'
    ? notes
    : notes.filter(note => note.priority === filterPriority);

  return (
    <div style={{ marginTop: '60px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', textTransform: 'uppercase' }}>Data Logs & Checklists</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', borderRadius: '4px' }}>
            <option value="ALL">ALL_PRIORITIES</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', borderRadius: '4px' }}>
            <option value="updated">SORT_UPDATED</option>
            <option value="duedate">SORT_DUE_DATE</option>
          </select>
          <button onClick={handleAddNote} className="qs-button" style={{ padding: '8px 16px' }}>CREATE_RECORD</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filteredNotes.map((note) => {
          if (editingId === note.id) {
            return (
              <div key={note.id} className="qs-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="TITLE" className="mono-text" style={{ padding: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value)} style={{ padding: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                  <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={{ padding: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="TAGS (comma separated)" className="mono-text" style={{ padding: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="MARKDOWN_SUPPORTED" className="mono-text" style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '150px', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingId(null)} className="qs-button danger" style={{ padding: '6px 12px' }}>CANCEL</button>
                  <button onClick={() => handleSave(note.id)} className="qs-button primary" style={{ padding: '6px 12px' }}>SAVE_RECORD</button>
                </div>
              </div>
            );
          }
          const dueDateStatus = getDueDateStatus(note.dueDate);
          return (
            <div key={note.id} className="qs-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', borderLeft: `4px solid ${getPriorityColor(note.priority || 'MEDIUM')}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{note.title || 'UNNAMED_RECORD'}</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: getPriorityColor(note.priority || 'MEDIUM'), color: 'white', borderRadius: '3px', textTransform: 'uppercase' }}>{note.priority || 'MEDIUM'}</span>
                    {dueDateStatus.text && <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: dueDateStatus.color, color: 'white', borderRadius: '3px', textTransform: 'uppercase' }}>{dueDateStatus.text}</span>}
                  </div>
                  {note.tags && note.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {note.tags.map(tag => (
                        <span key={tag} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderRadius: '3px', border: '1px solid var(--border-color)' }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content); setEditPriority(note.priority || 'MEDIUM'); setEditDueDate(note.dueDate || ''); setEditTags((note.tags || []).join(', ')); }} className="qs-button" style={{ padding: '4px 8px', fontSize: '10px' }}>EDIT</button>
                  <button onClick={() => handleDelete(note.id)} className="qs-button danger" style={{ padding: '4px 8px', fontSize: '10px' }}>DEL</button>
                </div>
              </div>
              <div className="markdown-body mono-text" style={{ fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <style>{`.markdown-body ul, .markdown-body ol { padding-left: 20px; } .markdown-body input[type="checkbox"] { margin-right: 8px; accent-color: #333; } .markdown-body a { color: var(--text-primary); }`}</style>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content || '*NO_DATA*'}</ReactMarkdown>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
