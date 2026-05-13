import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Briefcase, Plus, Edit2, Trash2, Calendar, TrendingUp, Download, ChevronLeft, ChevronRight, X, DollarSign, BarChart3, Home, AlertCircle } from 'lucide-react';
import { api } from './api.js';

const COLORS = [
  '#E07856', '#5B8C5A', '#3A6B8A', '#C9A961', '#8B5A8C',
  '#D97757', '#4A7C59', '#2C5F7F', '#B8954A', '#7A4B7C'
];

export default function App() {
  const [workplaces, setWorkplaces] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWorkplaceForm, setShowWorkplaceForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterWorkplace, setFilterWorkplace] = useState('all');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [wps, sess] = await Promise.all([
        api.getWorkplaces(),
        api.getSessions(),
      ]);
      setWorkplaces(wps);
      setSessions(sess);
      setError(null);
    } catch (e) {
      setError(`Could not connect to the backend. Make sure it's running on port 4000. (${e.message})`);
    } finally {
      setLoading(false);
    }
  }

  // ----------- CRUD: Workplaces -----------
  const upsertWorkplace = async (wp) => {
    try {
      if (wp.id) {
        const updated = await api.updateWorkplace(wp.id, {
          name: wp.name, rate: wp.rate, color: wp.color,
        });
        setWorkplaces(workplaces.map(w => w.id === wp.id ? updated : w));
      } else {
        const created = await api.createWorkplace({
          name: wp.name, rate: wp.rate, color: wp.color,
        });
        setWorkplaces([...workplaces, created]);
      }
      setShowWorkplaceForm(false);
      setEditingWorkplace(null);
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  };

  const deleteWorkplace = async (id) => {
    if (!confirm('Delete this workplace? All its sessions will also be deleted.')) return;
    try {
      await api.deleteWorkplace(id);
      setWorkplaces(workplaces.filter(w => w.id !== id));
      setSessions(sessions.filter(s => s.workplace_id !== id));
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  // ----------- CRUD: Sessions -----------
  const upsertSession = async (s) => {
    try {
      if (s.id) {
        const updated = await api.updateSession(s.id, {
          workplace_id: s.workplace_id,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes,
        });
        setSessions(sessions.map(x => x.id === s.id ? updated : x));
      } else {
        const created = await api.createSession({
          workplace_id: s.workplace_id,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes,
        });
        setSessions([created, ...sessions]);
      }
      setShowSessionForm(false);
      setEditingSession(null);
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await api.deleteSession(id);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  // ----------- Calculations -----------
  const calcHours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return mins / 60;
  };

  const enrichedSessions = useMemo(() => {
    return sessions.map(s => {
      const wp = workplaces.find(w => w.id === s.workplace_id);
      const hours = calcHours(s.start_time, s.end_time);
      const earnings = wp?.rate ? hours * parseFloat(wp.rate) : 0;
      return { ...s, hours, earnings, workplace: wp };
    }).sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.start_time.localeCompare(a.start_time);
    });
  }, [sessions, workplaces]);

  // Date helpers
  const todayStr = new Date().toISOString().slice(0, 10);
  const getMonday = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const weekStart = getMonday(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const todayHours = enrichedSessions
    .filter(s => s.date === todayStr)
    .reduce((sum, s) => sum + s.hours, 0);

  const thisWeekStart = getMonday(0).toISOString().slice(0, 10);
  const thisWeekEnd = new Date(getMonday(0));
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
  const thisWeekEndStr = thisWeekEnd.toISOString().slice(0, 10);

  const thisWeekHours = enrichedSessions
    .filter(s => s.date >= thisWeekStart && s.date <= thisWeekEndStr)
    .reduce((sum, s) => sum + s.hours, 0);

  const thisMonthHours = enrichedSessions
    .filter(s => s.date.startsWith(currentMonth))
    .reduce((sum, s) => sum + s.hours, 0);

  const thisMonthEarnings = enrichedSessions
    .filter(s => s.date.startsWith(currentMonth))
    .reduce((sum, s) => sum + s.earnings, 0);

  const weekSessions = enrichedSessions.filter(s => s.date >= weekStartStr && s.date <= weekEndStr);
  const weekByWorkplace = useMemo(() => {
    const map = {};
    weekSessions.forEach(s => {
      if (!s.workplace) return;
      if (!map[s.workplace.id]) {
        map[s.workplace.id] = { workplace: s.workplace, hours: 0, earnings: 0 };
      }
      map[s.workplace.id].hours += s.hours;
      map[s.workplace.id].earnings += s.earnings;
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [weekSessions]);

  const weekTotalHours = weekByWorkplace.reduce((s, x) => s + x.hours, 0);
  const weekTotalEarnings = weekByWorkplace.reduce((s, x) => s + x.earnings, 0);
  const maxWeekHours = Math.max(...weekByWorkplace.map(x => x.hours), 1);

  const workplaceTotals = useMemo(() => {
    const map = {};
    enrichedSessions.forEach(s => {
      if (!s.workplace) return;
      if (!map[s.workplace.id]) {
        map[s.workplace.id] = { workplace: s.workplace, hours: 0, earnings: 0, sessions: 0 };
      }
      map[s.workplace.id].hours += s.hours;
      map[s.workplace.id].earnings += s.earnings;
      map[s.workplace.id].sessions += 1;
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [enrichedSessions]);

  const filteredEntries = filterWorkplace === 'all'
    ? enrichedSessions
    : enrichedSessions.filter(s => s.workplace_id === filterWorkplace);

  const exportCSV = () => {
    const rows = [['Date', 'Workplace', 'Start', 'End', 'Hours', 'Rate', 'Earnings', 'Notes']];
    enrichedSessions.forEach(s => {
      rows.push([
        s.date,
        s.workplace?.name || 'Unknown',
        s.start_time,
        s.end_time,
        s.hours.toFixed(2),
        s.workplace?.rate || '',
        s.earnings.toFixed(2),
        (s.notes || '').replace(/"/g, '""')
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-hours-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatHours = (h) => {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${hours}h ${mins}m`;
  };

  const formatDateLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingText}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorScreen}>
        <AlertCircle size={32} color="#E07856" />
        <h2 style={styles.errorTitle}>Connection Error</h2>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.primaryBtn} onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <Clock size={22} strokeWidth={2.5} />
            <span style={styles.logoText}>HOURS</span>
          </div>
          <div style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Home size={16} />} label="Dashboard" />
        <NavButton active={view === 'week'} onClick={() => setView('week')} icon={<Calendar size={16} />} label="Weekly" />
        <NavButton active={view === 'entries'} onClick={() => setView('entries')} icon={<Clock size={16} />} label="Entries" />
        <NavButton active={view === 'workplaces'} onClick={() => setView('workplaces')} icon={<Briefcase size={16} />} label="Places" />
        <NavButton active={view === 'summary'} onClick={() => setView('summary')} icon={<TrendingUp size={16} />} label="Summary" />
      </nav>

      <main style={styles.main}>
        {view === 'dashboard' && (
          <div className="fade-in">
            <div style={styles.statGrid}>
              <StatCard label="Today" value={formatHours(todayHours)} accent="#E07856" icon={<Clock size={20} />} />
              <StatCard label="This Week" value={formatHours(thisWeekHours)} accent="#5B8C5A" icon={<Calendar size={20} />} />
              <StatCard label="This Month" value={formatHours(thisMonthHours)} accent="#3A6B8A" icon={<TrendingUp size={20} />} />
              <StatCard label="Month Earnings" value={`$${thisMonthEarnings.toFixed(2)}`} accent="#C9A961" icon={<DollarSign size={20} />} />
            </div>

            <div style={styles.quickActions}>
              <button
                style={styles.primaryBtn}
                onClick={() => { setEditingSession(null); setShowSessionForm(true); }}
                disabled={workplaces.length === 0}
              >
                <Plus size={18} />
                Log Work Session
              </button>
              {workplaces.length === 0 && (
                <p style={styles.hint}>Add a workplace first to start logging sessions.</p>
              )}
            </div>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Recent Sessions</h2>
              {enrichedSessions.slice(0, 5).length === 0 ? (
                <EmptyState message="No sessions yet. Log your first one!" />
              ) : (
                <div style={styles.list}>
                  {enrichedSessions.slice(0, 5).map(s => (
                    <SessionCard key={s.id} session={s} onEdit={() => { setEditingSession(s); setShowSessionForm(true); }} onDelete={() => deleteSession(s.id)} formatHours={formatHours} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'week' && (
          <div className="fade-in">
            <div style={styles.weekNav}>
              <button style={styles.iconBtn} onClick={() => setWeekOffset(weekOffset - 1)}>
                <ChevronLeft size={20} />
              </button>
              <div style={styles.weekLabel}>
                <div style={styles.weekRange}>
                  {formatDateLabel(weekStart)} – {formatDateLabel(weekEnd)}
                </div>
                <div style={styles.weekSubLabel}>
                  {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : weekOffset > 0 ? `${weekOffset} week${weekOffset > 1 ? 's' : ''} ahead` : `${Math.abs(weekOffset)} weeks ago`}
                </div>
              </div>
              <button style={styles.iconBtn} onClick={() => setWeekOffset(weekOffset + 1)}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div style={styles.weekTotals}>
              <div style={styles.weekTotalItem}>
                <div style={styles.weekTotalValue}>{formatHours(weekTotalHours)}</div>
                <div style={styles.weekTotalLabel}>Total Hours</div>
              </div>
              <div style={styles.weekTotalDivider} />
              <div style={styles.weekTotalItem}>
                <div style={styles.weekTotalValue}>${weekTotalEarnings.toFixed(2)}</div>
                <div style={styles.weekTotalLabel}>Earnings</div>
              </div>
            </div>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Breakdown by Workplace</h2>
              {weekByWorkplace.length === 0 ? (
                <EmptyState message="No sessions logged this week." />
              ) : (
                <div style={styles.barChart}>
                  {weekByWorkplace.map(({ workplace, hours, earnings }) => (
                    <div key={workplace.id} style={styles.barRow}>
                      <div style={styles.barHeader}>
                        <div style={styles.barLabel}>
                          <span style={{ ...styles.colorDot, background: workplace.color }} />
                          <span style={styles.barName}>{workplace.name}</span>
                        </div>
                        <div style={styles.barValues}>
                          <span style={styles.barHours}>{formatHours(hours)}</span>
                          {workplace.rate && <span style={styles.barEarnings}>${earnings.toFixed(2)}</span>}
                        </div>
                      </div>
                      <div style={styles.barTrack}>
                        <div
                          style={{
                            ...styles.barFill,
                            width: `${(hours / maxWeekHours) * 100}%`,
                            background: workplace.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Sessions This Week</h2>
              {weekSessions.length === 0 ? (
                <EmptyState message="No sessions this week." />
              ) : (
                <div style={styles.list}>
                  {weekSessions.map(s => (
                    <SessionCard key={s.id} session={s} onEdit={() => { setEditingSession(s); setShowSessionForm(true); }} onDelete={() => deleteSession(s.id)} formatHours={formatHours} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'entries' && (
          <div className="fade-in">
            <div style={styles.entriesHeader}>
              <h2 style={styles.pageTitle}>All Entries</h2>
              <div style={styles.entriesActions}>
                <select
                  style={styles.select}
                  value={filterWorkplace}
                  onChange={e => setFilterWorkplace(e.target.value)}
                >
                  <option value="all">All workplaces</option>
                  {workplaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <button style={styles.secondaryBtn} onClick={exportCSV} disabled={enrichedSessions.length === 0}>
                  <Download size={16} />
                  CSV
                </button>
              </div>
            </div>

            <button
              style={styles.primaryBtn}
              onClick={() => { setEditingSession(null); setShowSessionForm(true); }}
              disabled={workplaces.length === 0}
            >
              <Plus size={18} />
              New Session
            </button>

            {filteredEntries.length === 0 ? (
              <div style={{ marginTop: '20px' }}><EmptyState message="No entries yet." /></div>
            ) : (
              <div style={{ ...styles.list, marginTop: '20px' }}>
                {filteredEntries.map(s => (
                  <SessionCard key={s.id} session={s} onEdit={() => { setEditingSession(s); setShowSessionForm(true); }} onDelete={() => deleteSession(s.id)} formatHours={formatHours} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'workplaces' && (
          <div className="fade-in">
            <h2 style={styles.pageTitle}>Workplaces</h2>
            <button
              style={styles.primaryBtn}
              onClick={() => { setEditingWorkplace(null); setShowWorkplaceForm(true); }}
            >
              <Plus size={18} />
              Add Workplace
            </button>

            {workplaces.length === 0 ? (
              <div style={{ marginTop: '24px' }}>
                <EmptyState message="No workplaces yet. Add your first one to get started!" />
              </div>
            ) : (
              <div style={{ ...styles.list, marginTop: '24px' }}>
                {workplaces.map(w => {
                  const total = workplaceTotals.find(t => t.workplace.id === w.id);
                  return (
                    <div key={w.id} style={{ ...styles.workplaceCard, borderLeftColor: w.color }}>
                      <div style={styles.workplaceInfo}>
                        <div style={styles.workplaceName}>{w.name}</div>
                        <div style={styles.workplaceMeta}>
                          {w.rate && <span>${w.rate}/hr</span>}
                          {total && <span>{formatHours(total.hours)} logged</span>}
                          {total && <span>{total.sessions} session{total.sessions !== 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                      <div style={styles.cardActions}>
                        <button style={styles.iconBtnSmall} onClick={() => { setEditingWorkplace(w); setShowWorkplaceForm(true); }}>
                          <Edit2 size={15} />
                        </button>
                        <button style={styles.iconBtnSmall} onClick={() => deleteWorkplace(w.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'summary' && (
          <div className="fade-in">
            <h2 style={styles.pageTitle}>All-Time Summary</h2>
            {workplaceTotals.length === 0 ? (
              <EmptyState message="No data to summarize yet." />
            ) : (
              <>
                <div style={styles.summaryGrand}>
                  <div>
                    <div style={styles.summaryGrandLabel}>Total Hours</div>
                    <div style={styles.summaryGrandValue}>
                      {formatHours(workplaceTotals.reduce((s, x) => s + x.hours, 0))}
                    </div>
                  </div>
                  <div>
                    <div style={styles.summaryGrandLabel}>Total Earnings</div>
                    <div style={styles.summaryGrandValue}>
                      ${workplaceTotals.reduce((s, x) => s + x.earnings, 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={styles.list}>
                  {workplaceTotals.map(({ workplace, hours, earnings, sessions }) => (
                    <div key={workplace.id} style={{ ...styles.summaryRow, borderLeftColor: workplace.color }}>
                      <div>
                        <div style={styles.summaryName}>{workplace.name}</div>
                        <div style={styles.summarySub}>{sessions} session{sessions !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={styles.summaryNumbers}>
                        <div style={styles.summaryHours}>{formatHours(hours)}</div>
                        {workplace.rate && <div style={styles.summaryEarnings}>${earnings.toFixed(2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showWorkplaceForm && (
        <WorkplaceForm
          workplace={editingWorkplace}
          onSave={upsertWorkplace}
          onClose={() => { setShowWorkplaceForm(false); setEditingWorkplace(null); }}
        />
      )}

      {showSessionForm && (
        <SessionForm
          session={editingSession}
          workplaces={workplaces}
          onSave={upsertSession}
          onClose={() => { setShowSessionForm(false); setEditingSession(null); }}
        />
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}) }}>
      {icon}
      <span style={styles.navLabel}>{label}</span>
    </button>
  );
}

function StatCard({ label, value, accent, icon }) {
  return (
    <div style={{ ...styles.statCard, borderTopColor: accent }}>
      <div style={{ ...styles.statIcon, color: accent }}>{icon}</div>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function SessionCard({ session, onEdit, onDelete, formatHours }) {
  const wp = session.workplace;
  return (
    <div style={{ ...styles.sessionCard, borderLeftColor: wp?.color || '#999' }}>
      <div style={styles.sessionMain}>
        <div style={styles.sessionTop}>
          <span style={styles.sessionWorkplace}>{wp?.name || 'Unknown'}</span>
          <span style={styles.sessionDate}>
            {new Date(session.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <div style={styles.sessionTimes}>
          {session.start_time} – {session.end_time} · <strong>{formatHours(session.hours)}</strong>
          {session.earnings > 0 && <span style={styles.sessionEarn}> · ${session.earnings.toFixed(2)}</span>}
        </div>
        {session.notes && <div style={styles.sessionNotes}>{session.notes}</div>}
      </div>
      <div style={styles.cardActions}>
        <button style={styles.iconBtnSmall} onClick={onEdit}><Edit2 size={14} /></button>
        <button style={styles.iconBtnSmall} onClick={onDelete}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={styles.empty}>
      <BarChart3 size={32} strokeWidth={1.5} style={{ opacity: 0.4 }} />
      <p style={styles.emptyText}>{message}</p>
    </div>
  );
}

function WorkplaceForm({ workplace, onSave, onClose }) {
  const [name, setName] = useState(workplace?.name || '');
  const [rate, setRate] = useState(workplace?.rate || '');
  const [color, setColor] = useState(workplace?.color || COLORS[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: workplace?.id,
      name: name.trim(),
      rate: rate || null,
      color,
    });
  };

  return (
    <Modal title={workplace ? 'Edit Workplace' : 'New Workplace'} onClose={onClose}>
      <div style={styles.formField}>
        <label style={styles.label}>Name</label>
        <input style={styles.input} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coffee Shop" autoFocus />
      </div>
      <div style={styles.formField}>
        <label style={styles.label}>Hourly Rate (optional)</label>
        <input style={styles.input} type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="0.00" />
      </div>
      <div style={styles.formField}>
        <label style={styles.label}>Color</label>
        <div style={styles.colorGrid}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                ...styles.colorSwatch,
                background: c,
                borderColor: color === c ? '#1a1a1a' : 'transparent',
                transform: color === c ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>
      <div style={styles.modalActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={!name.trim()}>
          {workplace ? 'Save Changes' : 'Add Workplace'}
        </button>
      </div>
    </Modal>
  );
}

function SessionForm({ session, workplaces, onSave, onClose }) {
  const [workplaceId, setWorkplaceId] = useState(session?.workplace_id || workplaces[0]?.id || '');
  const [date, setDate] = useState(session?.date || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(session?.start_time || '09:00');
  const [endTime, setEndTime] = useState(session?.end_time || '17:00');
  const [notes, setNotes] = useState(session?.notes || '');

  const calcPreview = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    const h = mins / 60;
    return { hours: Math.floor(h), mins: Math.round((h - Math.floor(h)) * 60), total: h };
  };

  const preview = calcPreview();
  const wp = workplaces.find(w => w.id === workplaceId);
  const previewEarnings = wp?.rate ? preview.total * parseFloat(wp.rate) : 0;

  const handleSubmit = () => {
    if (!workplaceId || !date || !startTime || !endTime) return;
    onSave({
      id: session?.id,
      workplace_id: workplaceId,
      date,
      start_time: startTime,
      end_time: endTime,
      notes: notes.trim(),
    });
  };

  return (
    <Modal title={session ? 'Edit Session' : 'New Session'} onClose={onClose}>
      <div style={styles.formField}>
        <label style={styles.label}>Workplace</label>
        <select style={styles.input} value={workplaceId} onChange={e => setWorkplaceId(e.target.value)}>
          {workplaces.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      <div style={styles.formField}>
        <label style={styles.label}>Date</label>
        <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div style={styles.row}>
        <div style={{ ...styles.formField, flex: 1 }}>
          <label style={styles.label}>Start</label>
          <input style={styles.input} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div style={{ ...styles.formField, flex: 1 }}>
          <label style={styles.label}>End</label>
          <input style={styles.input} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </div>
      <div style={styles.formField}>
        <label style={styles.label}>Notes (optional)</label>
        <textarea
          style={{ ...styles.input, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What did you work on?"
        />
      </div>
      <div style={styles.preview}>
        <div style={styles.previewLabel}>Total</div>
        <div style={styles.previewValue}>
          {preview.hours}h {preview.mins}m
          {previewEarnings > 0 && <span style={styles.previewEarn}> · ${previewEarnings.toFixed(2)}</span>}
        </div>
      </div>
      <div style={styles.modalActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={handleSubmit}>
          {session ? 'Save Changes' : 'Log Session'}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} className="modal-enter">
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button style={styles.iconBtnSmall} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { minHeight: '100vh', paddingBottom: '40px' },
  loadingScreen: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  loadingText: { color: '#999', fontSize: '14px' },
  errorScreen: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '70vh', padding: '20px', textAlign: 'center', gap: '12px', maxWidth: '480px', margin: '0 auto'
  },
  errorTitle: { fontFamily: "'Fraunces', serif", margin: 0 },
  errorText: { color: '#666', fontSize: '14px', lineHeight: 1.5 },
  header: { background: '#1a1a1a', color: '#f5f1ea', padding: '20px 0' },
  headerContent: { maxWidth: '720px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoText: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '20px', letterSpacing: '0.15em' },
  headerDate: { fontSize: '13px', opacity: 0.7, fontWeight: 500 },
  nav: { background: '#fff', borderBottom: '1px solid #e8e1d4', padding: '8px 0', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'center', gap: '4px', overflowX: 'auto' },
  navBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontSize: '11px', fontWeight: 600, borderRadius: '8px', minWidth: '64px' },
  navBtnActive: { background: '#fef0e8', color: '#E07856' },
  navLabel: { fontSize: '11px', letterSpacing: '0.02em' },
  main: { maxWidth: '720px', margin: '0 auto', padding: '24px 20px' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { background: '#fff', padding: '16px', borderRadius: '12px', borderTop: '3px solid', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  statIcon: { marginBottom: '8px' },
  statLabel: { fontSize: '12px', color: '#888', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 600 },
  quickActions: { marginBottom: '32px' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#fff', color: '#1a1a1a', border: '1px solid #d8d0c0', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  hint: { fontSize: '12px', color: '#999', marginTop: '8px', textAlign: 'center' },
  section: { marginBottom: '32px' },
  sectionTitle: { fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 600, marginBottom: '14px' },
  pageTitle: { fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 600, marginBottom: '20px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sessionCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff', padding: '14px 16px', borderRadius: '10px', borderLeft: '4px solid', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', gap: '12px' },
  sessionMain: { flex: 1, minWidth: 0 },
  sessionTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' },
  sessionWorkplace: { fontWeight: 600, fontSize: '14px' },
  sessionDate: { fontSize: '12px', color: '#888', whiteSpace: 'nowrap' },
  sessionTimes: { fontSize: '13px', color: '#555' },
  sessionEarn: { color: '#5B8C5A', fontWeight: 600 },
  sessionNotes: { fontSize: '12px', color: '#888', marginTop: '6px', fontStyle: 'italic' },
  cardActions: { display: 'flex', gap: '4px', flexShrink: 0 },
  iconBtn: { background: '#fff', border: '1px solid #e8e1d4', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a' },
  iconBtnSmall: { background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', borderRadius: '6px' },
  weekNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  weekLabel: { textAlign: 'center' },
  weekRange: { fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 600 },
  weekSubLabel: { fontSize: '11px', color: '#888', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  weekTotals: { display: 'flex', alignItems: 'center', background: '#1a1a1a', color: '#f5f1ea', padding: '20px', borderRadius: '12px', marginBottom: '28px' },
  weekTotalItem: { flex: 1, textAlign: 'center' },
  weekTotalValue: { fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 600 },
  weekTotalLabel: { fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' },
  weekTotalDivider: { width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' },
  barChart: { display: 'flex', flexDirection: 'column', gap: '14px' },
  barRow: { background: '#fff', padding: '12px 14px', borderRadius: '10px' },
  barHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  barLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  colorDot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' },
  barName: { fontWeight: 600, fontSize: '14px' },
  barValues: { display: 'flex', gap: '10px', fontSize: '13px' },
  barHours: { fontWeight: 600 },
  barEarnings: { color: '#888' },
  barTrack: { height: '6px', background: '#f0e8d8', borderRadius: '3px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '3px', transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' },
  entriesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  entriesActions: { display: 'flex', gap: '8px' },
  select: { padding: '8px 12px', border: '1px solid #d8d0c0', borderRadius: '8px', background: '#fff', fontSize: '13px', cursor: 'pointer' },
  workplaceCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '14px 16px', borderRadius: '10px', borderLeft: '4px solid', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' },
  workplaceInfo: { flex: 1 },
  workplaceName: { fontWeight: 600, fontSize: '15px', marginBottom: '4px' },
  workplaceMeta: { display: 'flex', gap: '12px', fontSize: '12px', color: '#888' },
  summaryGrand: { display: 'flex', justifyContent: 'space-around', background: '#1a1a1a', color: '#f5f1ea', padding: '24px', borderRadius: '12px', marginBottom: '24px' },
  summaryGrandLabel: { fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' },
  summaryGrandValue: { fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 600 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '14px 16px', borderRadius: '10px', borderLeft: '4px solid' },
  summaryName: { fontWeight: 600, fontSize: '15px' },
  summarySub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  summaryNumbers: { textAlign: 'right' },
  summaryHours: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px' },
  summaryEarnings: { fontSize: '13px', color: '#5B8C5A', fontWeight: 600, marginTop: '2px' },
  empty: { background: '#fff', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', color: '#999', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  emptyText: { fontSize: '14px', margin: 0 },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100, animation: 'fadeIn 0.2s ease' },
  modal: { background: '#fff', borderRadius: '16px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' },
  modalTitle: { fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600, margin: 0 },
  modalBody: { padding: '20px' },
  formField: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d8d0c0', borderRadius: '8px', fontSize: '14px', background: '#fff', transition: 'all 0.15s ease' },
  row: { display: 'flex', gap: '10px' },
  colorGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  colorSwatch: { width: '32px', height: '32px', borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease', padding: 0 },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  preview: { background: '#fef0e8', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' },
  previewLabel: { fontSize: '12px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  previewValue: { fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 600, color: '#E07856' },
  previewEarn: { color: '#5B8C5A', fontSize: '14px' },
};
