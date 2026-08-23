import { useState, useEffect } from 'react';
import { Bookmark, FileText, Trash2, ExternalLink, Lightbulb, Edit3, Save, Sparkles, BookOpen } from 'lucide-react';

export default function BookmarkedTopicsView({ skillName = 'Skill', onOpenTopic }) {
    const bookmarkKey = `fluence_bookmarked_topics_${skillName.toLowerCase().replace(/ /g, '_')}`;

    const [bookmarks, setBookmarks] = useState(() => {
        try {
            const raw = localStorage.getItem(bookmarkKey);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const [editingTopic, setEditingTopic] = useState(null);
    const [noteDraft, setNoteDraft] = useState('');

    const removeBookmark = (topicName) => {
        const updated = bookmarks.filter(b => b.name !== topicName);
        setBookmarks(updated);
        try {
            localStorage.setItem(bookmarkKey, JSON.stringify(updated));
        } catch {}
    };

    const getNoteForTopic = (topicName) => {
        try {
            return localStorage.getItem(`fluence_topic_notes_${skillName}_${topicName}`) || '';
        } catch {
            return '';
        }
    };

    const handleSaveNote = (topicName) => {
        try {
            localStorage.setItem(`fluence_topic_notes_${skillName}_${topicName}`, noteDraft);
            setEditingTopic(null);
        } catch {}
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
                padding: '20px 24px',
                borderRadius: '16px',
                background: 'var(--bg-elevated-1)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bookmark size={20} color="#c084fc" />
                    <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                            Bookmarked Topics & Personal Study Notes ({skillName})
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Quickly review essential concepts and your personal handwritten notes
                        </p>
                    </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '4px 12px', borderRadius: '20px' }}>
                    {bookmarks.length} Saved Items
                </span>
            </div>

            {bookmarks.length === 0 ? (
                <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: 'var(--bg-elevated-1)',
                    borderRadius: '16px',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                }}>
                    <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                        No Topics Bookmarked Yet
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                        Click on any topic in the roadmap and tap the <strong>⭐ Bookmark Topic</strong> button to save topics and keep personal notes here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                    {bookmarks.map((bm, idx) => {
                        const note = getNoteForTopic(bm.name);
                        const isEditing = editingTopic === bm.name;

                        return (
                            <div
                                key={idx}
                                style={{
                                    padding: '20px',
                                    borderRadius: '14px',
                                    background: 'var(--bg-elevated-1)',
                                    border: '1px solid rgba(168, 85, 247, 0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                                        <div
                                            onClick={() => onOpenTopic && onOpenTopic(bm)}
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                                                💡 {bm.name}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => removeBookmark(bm.name)}
                                            title="Remove Bookmark"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                padding: '4px',
                                            }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>

                                    {bm.shortDesc && (
                                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '10px' }}>
                                            {bm.shortDesc}
                                        </p>
                                    )}

                                    {/* Personal Study Note section */}
                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'rgba(0, 0, 0, 0.25)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <FileText size={12} /> My Handwritten Note:
                                            </span>
                                            {!isEditing && (
                                                <button
                                                    onClick={() => {
                                                        setEditingTopic(bm.name);
                                                        setNoteDraft(note);
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                                                >
                                                    <Edit3 size={11} /> Edit Note
                                                </button>
                                            )}
                                        </div>

                                        {isEditing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <textarea
                                                    value={noteDraft}
                                                    onChange={(e) => setNoteDraft(e.target.value)}
                                                    placeholder="Type key takeaway, formula, or reminder..."
                                                    rows={3}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 10px',
                                                        background: '#121212',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        borderRadius: '8px',
                                                        color: '#fff',
                                                        fontSize: '12.5px',
                                                        outline: 'none',
                                                        resize: 'vertical',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                    <button
                                                        onClick={() => setEditingTopic(null)}
                                                        style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '11px', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveNote(bm.name)}
                                                        style={{ padding: '4px 12px', borderRadius: '6px', background: '#10b981', color: '#000', fontSize: '11px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Save size={11} /> Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: '12.5px', color: note ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: note ? 'normal' : 'italic', margin: 0, lineHeight: 1.4 }}>
                                                {note || 'No notes added yet. Click Edit Note to jot down your thoughts.'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => onOpenTopic && onOpenTopic(bm)}
                                    style={{
                                        width: '100%',
                                        padding: '9px',
                                        borderRadius: '8px',
                                        background: 'rgba(168, 85, 247, 0.15)',
                                        border: '1px solid rgba(168, 85, 247, 0.3)',
                                        color: '#c084fc',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <Lightbulb size={13} />
                                    <span>Open Complete Guide & Code</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
