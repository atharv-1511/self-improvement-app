import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Notes({ db, syncDeviceId }) {
  const [notes, setNotes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (!db) return;
    const notesRef = collection(db, 'syncDevices', syncDeviceId, 'notes');
    const unsubscribe = onSnapshot(notesRef, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(data);
    }, (error) => console.error('Notes sync error:', error));
    return () => unsubscribe();
  }, [db, syncDeviceId]);

  const handleAddNote = async () => {
    if (!db) return;
    const newNoteRef = doc(collection(db, 'syncDevices', syncDeviceId, 'notes'));
    await setDoc(newNoteRef, { title: '', content: '', updatedAt: Date.now() });
    setEditingId(newNoteRef.id);
    setEditTitle('');
    setEditContent('');
  };

  const handleSave = async (id) => {
    if (!db) return;
    const noteRef = doc(db, 'syncDevices', syncDeviceId, 'notes', id);
    await setDoc(noteRef, { title: editTitle, content: editContent, updatedAt: Date.now() }, { merge: true });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!db || !window.confirm('PERMANENTLY_DELETE_RECORD?')) return;
    const noteRef = doc(db, 'syncDevices', syncDeviceId, 'notes', id);
    await deleteDoc(noteRef);
  };

  return (
    <div style={{ marginTop: '60px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', textTransform: 'uppercase' }}>Data Logs & Checklists</h2>
        <button onClick={handleAddNote} className="qs-button" style={{ padding: '8px 16px' }}>CREATE_RECORD</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {notes.map((note) => {
          if (editingId === note.id) {
            return (
              <div key={note.id} className="qs-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="TITLE" className="mono-text" style={{ padding: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="MARKDOWN_SUPPORTED" className="mono-text" style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '150px', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingId(null)} className="qs-button danger" style={{ padding: '6px 12px' }}>CANCEL</button>
                  <button onClick={() => handleSave(note.id)} className="qs-button primary" style={{ padding: '6px 12px' }}>SAVE_RECORD</button>
                </div>
              </div>
            );
          }
          return (
            <div key={note.id} className="qs-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{note.title || 'UNNAMED_RECORD'}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content); }} className="qs-button" style={{ padding: '4px 8px', fontSize: '10px' }}>EDIT</button>
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
