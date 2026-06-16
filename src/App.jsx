import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Briefcase, Plus, Edit2, Trash2, Calendar,
  TrendingUp, Download, ChevronLeft, ChevronRight,
  X, DollarSign, BarChart3, Home, AlertCircle
} from 'lucide-react';
import {
  fetchWorkplaces, createWorkplace, updateWorkplace, deleteWorkplace as dbDeleteWorkplace,
  fetchSessions, createSession, updateSession, deleteSession as dbDeleteSession,
} from './db.js';

const COLORS = [
  '#E07856','#5B8C5A','#3A6B8A','#C9A961','#8B5A8C',
  '#D97757','#4A7C59','#2C5F7F','#B8954A','#7A4B7C'
];

// ─────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [workplaces, setWorkplaces] = useState([]);
  const [sessions,   setSessions]   = useState([]);
  const [view,       setView]       = useState('dashboard');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [showWorkplaceForm, setShowWorkplaceForm] = useState(false);
  const [showSessionForm,   setShowSessionForm]   = useState(false);
  const [editingWorkplace,  setEditingWorkplace]  = useState(null);
  const [editingSession,    setEditingSession]    = useState(null);
  const [weekOffset,        setWeekOffset]        = useState(0);
  const [filterWorkplace,   setFilterWorkplace]   = useState('all');

  // ── Load data ──────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [wps, sess] = await Promise.all([fetchWorkplaces(), fetchSessions()]);
      setWorkplaces(wps || []);
      setSessions(sess || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to connect to the database. Check your .env file.');
    } finally {
      setLoading(false);
    }
  }

  // ── Workplaces ─────────────────────────────────────────────────
  const upsertWorkplace = async (wp) => {
    try {
      const fields = { name: wp.name, rate: wp.rate || null, color: wp.color };
      if (wp.id) {
        const data = await updateWorkplace(wp.id, fields);
        setWorkplaces(workplaces.map(w => w.id === wp.id ? data : w));
      } else {
        const data = await createWorkplace(fields);
        setWorkplaces([...workplaces, data]);
      }
      setShowWorkplaceForm(false); setEditingWorkplace(null);
    } catch (e) { alert('Save failed: ' + e.message); }
  };

  const deleteWorkplace = async (id) => {
    if (!confirm('Delete this workplace? All its sessions will also be deleted.')) return;
    try {
      await dbDeleteWorkplace(id);
      setWorkplaces(workplaces.filter(w => w.id !== id));
      setSessions(sessions.filter(s => s.workplace_id !== id));
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  // ── Sessions ───────────────────────────────────────────────────
  const upsertSession = async (s) => {
    try {
      const payload = {
        workplace_id: s.workplace_id,
        date:         s.date,
        start_time:   s.start_time,
        end_time:     s.end_time,
        notes:        s.notes || null,
      };
      if (s.id) {
        const data = await updateSession(s.id, payload);
        setSessions(sessions.map(x => x.id === s.id ? data : x));
      } else {
        const data = await createSession(payload);
        setSessions([data, ...sessions]);
      }
      setShowSessionForm(false); setEditingSession(null);
    } catch (e) { alert('Save failed: ' + e.message); }
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await dbDeleteSession(id);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  // ── Calculations ───────────────────────────────────────────────
  const calcHours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 1440;
    return mins / 60;
  };

  const enriched = useMemo(() => sessions.map(s => {
    const wp      = workplaces.find(w => w.id === s.workplace_id);
    const hours   = calcHours(s.start_time, s.end_time);
    const earnings = wp?.rate ? hours * parseFloat(wp.rate) : 0;
    return { ...s, hours, earnings, workplace: wp };
  }).sort((a, b) => a.date !== b.date
    ? b.date.localeCompare(a.date)
    : b.start_time.localeCompare(a.start_time)
  ), [sessions, workplaces]);

  // ── Date helpers ───────────────────────────────────────────────
  const todayStr   = new Date().toISOString().slice(0,10);
  const curMonth   = new Date().toISOString().slice(0,7);

  const getMonday  = (offset=0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset*7);
    const diff = d.getDay()===0 ? -6 : 1-d.getDay();
    d.setDate(d.getDate()+diff);
    return d;
  };

  const wkStart    = getMonday(weekOffset);
  const wkEnd      = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
  const wkStartStr = wkStart.toISOString().slice(0,10);
  const wkEndStr   = wkEnd.toISOString().slice(0,10);

  const tw0End     = new Date(getMonday(0)); tw0End.setDate(tw0End.getDate()+6);
  const tw0Start   = getMonday(0).toISOString().slice(0,10);
  const tw0End0    = tw0End.toISOString().slice(0,10);

  const todayHours        = enriched.filter(s=>s.date===todayStr).reduce((a,s)=>a+s.hours,0);
  const thisWeekHours     = enriched.filter(s=>s.date>=tw0Start&&s.date<=tw0End0).reduce((a,s)=>a+s.hours,0);
  const thisMonthHours    = enriched.filter(s=>s.date.startsWith(curMonth)).reduce((a,s)=>a+s.hours,0);
  const thisMonthEarnings = enriched.filter(s=>s.date.startsWith(curMonth)).reduce((a,s)=>a+s.earnings,0);

  const weekSessions  = enriched.filter(s=>s.date>=wkStartStr&&s.date<=wkEndStr);
  const weekByWP      = useMemo(()=>{
    const map={};
    weekSessions.forEach(s=>{
      if(!s.workplace) return;
      if(!map[s.workplace.id]) map[s.workplace.id]={workplace:s.workplace,hours:0,earnings:0};
      map[s.workplace.id].hours    += s.hours;
      map[s.workplace.id].earnings += s.earnings;
    });
    return Object.values(map).sort((a,b)=>b.hours-a.hours);
  },[weekSessions]);

  const weekTotalHours    = weekByWP.reduce((a,x)=>a+x.hours,0);
  const weekTotalEarnings = weekByWP.reduce((a,x)=>a+x.earnings,0);
  const maxWeekHours      = Math.max(...weekByWP.map(x=>x.hours),1);

  const wpTotals = useMemo(()=>{
    const map={};
    enriched.forEach(s=>{
      if(!s.workplace) return;
      if(!map[s.workplace.id]) map[s.workplace.id]={workplace:s.workplace,hours:0,earnings:0,count:0};
      map[s.workplace.id].hours    += s.hours;
      map[s.workplace.id].earnings += s.earnings;
      map[s.workplace.id].count    += 1;
    });
    return Object.values(map).sort((a,b)=>b.hours-a.hours);
  },[enriched]);

  const filteredEntries = filterWorkplace==='all'
    ? enriched
    : enriched.filter(s=>s.workplace_id===filterWorkplace);

  // ── CSV Export ─────────────────────────────────────────────────
  const exportCSV = () => {
    const rows=[['Date','Workplace','Start','End','Hours','Rate','Earnings','Notes']];
    enriched.forEach(s=>rows.push([
      s.date, s.workplace?.name||'Unknown', s.start_time, s.end_time,
      s.hours.toFixed(2), s.workplace?.rate||'', s.earnings.toFixed(2),
      (s.notes||'').replace(/"/g,'""')
    ]));
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'),{
      href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
      download: `work-hours-${todayStr}.csv`
    });
    a.click();
  };

  const fmtH = (h) => `${Math.floor(h)}h ${Math.round((h-Math.floor(h))*60)}m`;
  const fmtD = (d) => d.toLocaleDateString('en-US',{month:'short',day:'numeric'});

  // ── Render ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.center}>
      <Clock size={28} style={{opacity:0.3,animation:'spin 1.5s linear infinite'}} />
      <p style={{color:'#999',marginTop:12}}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{...S.center,gap:12,padding:24,textAlign:'center',maxWidth:480,margin:'0 auto'}}>
      <AlertCircle size={32} color="#E07856" />
      <h2 style={{fontFamily:'Fraunces,serif',margin:0}}>Connection Error</h2>
      <p style={{color:'#666',fontSize:14,lineHeight:1.6}}>{error}</p>
      <p style={{color:'#999',fontSize:13}}>
        Make sure your <code>.env</code> file has the correct<br/>
        <code>VITE_FIREBASE_*</code> values from your Firebase project
      </p>
      <button style={S.primaryBtn} onClick={loadData}>Retry</button>
    </div>
  );

  return (
    <div style={S.app}>
      {/* HEADER */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <Clock size={22} strokeWidth={2.5}/>
            <span style={S.logoText}>HOURS</span>
          </div>
          <div style={S.headerDate}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav style={S.nav}>
        {[
          {id:'dashboard', icon:<Home size={16}/>,     label:'Dashboard'},
          {id:'week',      icon:<Calendar size={16}/>, label:'Weekly'},
          {id:'entries',   icon:<Clock size={16}/>,    label:'Entries'},
          {id:'workplaces',icon:<Briefcase size={16}/>,label:'Places'},
          {id:'summary',   icon:<TrendingUp size={16}/>,label:'Summary'},
        ].map(({id,icon,label})=>(
          <button key={id} onClick={()=>setView(id)}
            style={{...S.navBtn,...(view===id?S.navActive:{})}}>
            {icon}<span style={S.navLabel}>{label}</span>
          </button>
        ))}
      </nav>

      {/* MAIN */}
      <main style={S.main}>

        {/* ── DASHBOARD ── */}
        {view==='dashboard' && (
          <div className="fade-in">
            <div style={S.statGrid}>
              <StatCard label="Today"         value={fmtH(todayHours)}             accent="#E07856" icon={<Clock size={20}/>}/>
              <StatCard label="This Week"     value={fmtH(thisWeekHours)}           accent="#5B8C5A" icon={<Calendar size={20}/>}/>
              <StatCard label="This Month"    value={fmtH(thisMonthHours)}          accent="#3A6B8A" icon={<TrendingUp size={20}/>}/>
              <StatCard label="Month Earnings"value={`$${thisMonthEarnings.toFixed(2)}`} accent="#C9A961" icon={<DollarSign size={20}/>}/>
            </div>
            <div style={{marginBottom:28}}>
              <button style={S.primaryBtn}
                onClick={()=>{setEditingSession(null);setShowSessionForm(true);}}
                disabled={workplaces.length===0}>
                <Plus size={18}/> Log Work Session
              </button>
              {workplaces.length===0 && <p style={S.hint}>Add a workplace first to start logging.</p>}
            </div>
            <h2 style={S.secTitle}>Recent Sessions</h2>
            {enriched.length===0
              ? <Empty msg="No sessions yet. Log your first one!"/>
              : <div style={S.list}>{enriched.slice(0,5).map(s=>(
                  <SessionCard key={s.id} s={s} fmtH={fmtH}
                    onEdit={()=>{setEditingSession(s);setShowSessionForm(true);}}
                    onDelete={()=>deleteSession(s.id)}/>
                ))}</div>}
          </div>
        )}

        {/* ── WEEKLY ── */}
        {view==='week' && (
          <div className="fade-in">
            <div style={S.weekNav}>
              <button style={S.iconBtn} onClick={()=>setWeekOffset(weekOffset-1)}><ChevronLeft size={20}/></button>
              <div style={{textAlign:'center'}}>
                <div style={S.weekRange}>{fmtD(wkStart)} – {fmtD(wkEnd)}</div>
                <div style={S.weekSub}>
                  {weekOffset===0?'This Week':weekOffset===-1?'Last Week':
                   weekOffset>0?`${weekOffset}w ahead`:`${Math.abs(weekOffset)}w ago`}
                </div>
              </div>
              <button style={S.iconBtn} onClick={()=>setWeekOffset(weekOffset+1)}><ChevronRight size={20}/></button>
            </div>
            <div style={S.weekTotals}>
              <div style={{flex:1,textAlign:'center'}}>
                <div style={S.weekVal}>{fmtH(weekTotalHours)}</div>
                <div style={S.weekLbl}>Total Hours</div>
              </div>
              <div style={{width:1,height:40,background:'rgba(255,255,255,0.2)'}}/>
              <div style={{flex:1,textAlign:'center'}}>
                <div style={S.weekVal}>${weekTotalEarnings.toFixed(2)}</div>
                <div style={S.weekLbl}>Earnings</div>
              </div>
            </div>
            <h2 style={S.secTitle}>By Workplace</h2>
            {weekByWP.length===0
              ? <Empty msg="No sessions this week."/>
              : <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {weekByWP.map(({workplace:wp,hours,earnings})=>(
                    <div key={wp.id} style={S.barCard}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{...S.dot,background:wp.color}}/>
                          <span style={{fontWeight:600,fontSize:14}}>{wp.name}</span>
                        </div>
                        <div style={{display:'flex',gap:10,fontSize:13}}>
                          <span style={{fontWeight:600}}>{fmtH(hours)}</span>
                          {wp.rate&&<span style={{color:'#888'}}>${earnings.toFixed(2)}</span>}
                        </div>
                      </div>
                      <div style={S.barTrack}>
                        <div style={{...S.barFill,width:`${(hours/maxWeekHours)*100}%`,background:wp.color}}/>
                      </div>
                    </div>
                  ))}
                </div>}
            <h2 style={{...S.secTitle,marginTop:28}}>Sessions This Week</h2>
            {weekSessions.length===0
              ? <Empty msg="No sessions this week."/>
              : <div style={S.list}>{weekSessions.map(s=>(
                  <SessionCard key={s.id} s={s} fmtH={fmtH}
                    onEdit={()=>{setEditingSession(s);setShowSessionForm(true);}}
                    onDelete={()=>deleteSession(s.id)}/>
                ))}</div>}
          </div>
        )}

        {/* ── ENTRIES ── */}
        {view==='entries' && (
          <div className="fade-in">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
              <h2 style={S.pageTitle}>All Entries</h2>
              <div style={{display:'flex',gap:8}}>
                <select style={S.select} value={filterWorkplace} onChange={e=>setFilterWorkplace(e.target.value)}>
                  <option value="all">All workplaces</option>
                  {workplaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <button style={S.secBtn} onClick={exportCSV} disabled={enriched.length===0}>
                  <Download size={15}/> CSV
                </button>
              </div>
            </div>
            <button style={S.primaryBtn}
              onClick={()=>{setEditingSession(null);setShowSessionForm(true);}}
              disabled={workplaces.length===0}>
              <Plus size={18}/> New Session
            </button>
            {filteredEntries.length===0
              ? <div style={{marginTop:20}}><Empty msg="No entries yet."/></div>
              : <div style={{...S.list,marginTop:20}}>
                  {filteredEntries.map(s=>(
                    <SessionCard key={s.id} s={s} fmtH={fmtH}
                      onEdit={()=>{setEditingSession(s);setShowSessionForm(true);}}
                      onDelete={()=>deleteSession(s.id)}/>
                  ))}
                </div>}
          </div>
        )}

        {/* ── WORKPLACES ── */}
        {view==='workplaces' && (
          <div className="fade-in">
            <h2 style={S.pageTitle}>Workplaces</h2>
            <button style={S.primaryBtn} onClick={()=>{setEditingWorkplace(null);setShowWorkplaceForm(true);}}>
              <Plus size={18}/> Add Workplace
            </button>
            {workplaces.length===0
              ? <div style={{marginTop:24}}><Empty msg="No workplaces yet. Add your first one!"/></div>
              : <div style={{...S.list,marginTop:24}}>
                  {workplaces.map(w=>{
                    const t=wpTotals.find(x=>x.workplace.id===w.id);
                    return (
                      <div key={w.id} style={{...S.wpCard,borderLeftColor:w.color}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:15}}>{w.name}</div>
                          <div style={{display:'flex',gap:12,fontSize:12,color:'#888',marginTop:3}}>
                            {w.rate&&<span>${w.rate}/hr</span>}
                            {t&&<span>{fmtH(t.hours)} logged</span>}
                            {t&&<span>{t.count} session{t.count!==1?'s':''}</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:4}}>
                          <button style={S.iconBtnSm} onClick={()=>{setEditingWorkplace(w);setShowWorkplaceForm(true);}}><Edit2 size={14}/></button>
                          <button style={S.iconBtnSm} onClick={()=>deleteWorkplace(w.id)}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>}
          </div>
        )}

        {/* ── SUMMARY ── */}
        {view==='summary' && (
          <div className="fade-in">
            <h2 style={S.pageTitle}>All-Time Summary</h2>
            {wpTotals.length===0
              ? <Empty msg="No data yet."/>
              : <>
                  <div style={S.summaryGrand}>
                    <div style={{textAlign:'center'}}>
                      <div style={S.grandLbl}>Total Hours</div>
                      <div style={S.grandVal}>{fmtH(wpTotals.reduce((a,x)=>a+x.hours,0))}</div>
                    </div>
                    <div style={{width:1,height:48,background:'rgba(255,255,255,0.2)'}}/>
                    <div style={{textAlign:'center'}}>
                      <div style={S.grandLbl}>Total Earnings</div>
                      <div style={S.grandVal}>${wpTotals.reduce((a,x)=>a+x.earnings,0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={S.list}>
                    {wpTotals.map(({workplace:wp,hours,earnings,count})=>(
                      <div key={wp.id} style={{...S.summaryRow,borderLeftColor:wp.color}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:15}}>{wp.name}</div>
                          <div style={{fontSize:12,color:'#888',marginTop:2}}>{count} session{count!==1?'s':''}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontFamily:'Fraunces,serif',fontWeight:600,fontSize:16}}>{fmtH(hours)}</div>
                          {wp.rate&&<div style={{fontSize:13,color:'#5B8C5A',fontWeight:600}}>${earnings.toFixed(2)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>}
          </div>
        )}
      </main>

      {/* MODALS */}
      {showWorkplaceForm && (
        <WorkplaceForm
          wp={editingWorkplace}
          onSave={upsertWorkplace}
          onClose={()=>{setShowWorkplaceForm(false);setEditingWorkplace(null);}}/>
      )}
      {showSessionForm && (
        <SessionForm
          session={editingSession}
          workplaces={workplaces}
          onSave={upsertSession}
          onClose={()=>{setShowSessionForm(false);setEditingSession(null);}}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────
function StatCard({label,value,accent,icon}){
  return (
    <div style={{...S.statCard,borderTopColor:accent}}>
      <div style={{color:accent,marginBottom:8}}>{icon}</div>
      <div style={S.statLbl}>{label}</div>
      <div style={S.statVal}>{value}</div>
    </div>
  );
}

function SessionCard({s,fmtH,onEdit,onDelete}){
  const wp=s.workplace;
  return (
    <div style={{...S.sessCard,borderLeftColor:wp?.color||'#ccc'}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,gap:8}}>
          <span style={{fontWeight:600,fontSize:14}}>{wp?.name||'Unknown'}</span>
          <span style={{fontSize:12,color:'#888',whiteSpace:'nowrap'}}>
            {new Date(s.date+'T00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
          </span>
        </div>
        <div style={{fontSize:13,color:'#555'}}>
          {s.start_time} – {s.end_time} · <strong>{fmtH(s.hours)}</strong>
          {s.earnings>0&&<span style={{color:'#5B8C5A',fontWeight:600}}> · ${s.earnings.toFixed(2)}</span>}
        </div>
        {s.notes&&<div style={{fontSize:12,color:'#888',marginTop:5,fontStyle:'italic'}}>{s.notes}</div>}
      </div>
      <div style={{display:'flex',gap:4,flexShrink:0}}>
        <button style={S.iconBtnSm} onClick={onEdit}><Edit2 size={14}/></button>
        <button style={S.iconBtnSm} onClick={onDelete}><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

function Empty({msg}){
  return (
    <div style={S.empty}>
      <BarChart3 size={32} strokeWidth={1.5} style={{opacity:0.35}}/>
      <p style={{margin:0,fontSize:14}}>{msg}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// WORKPLACE FORM
// ─────────────────────────────────────────────────────────────────
function WorkplaceForm({wp,onSave,onClose}){
  const [name,  setName]  = useState(wp?.name  || '');
  const [rate,  setRate]  = useState(wp?.rate  || '');
  const [color, setColor] = useState(wp?.color || COLORS[0]);
  return (
    <Modal title={wp?'Edit Workplace':'New Workplace'} onClose={onClose}>
      <Field label="Name">
        <input style={S.input} value={name} onChange={e=>setName(e.target.value)}
          placeholder="e.g. Coffee Shop" autoFocus/>
      </Field>
      <Field label="Hourly Rate (optional)">
        <input style={S.input} type="number" step="0.01" value={rate}
          onChange={e=>setRate(e.target.value)} placeholder="0.00"/>
      </Field>
      <Field label="Color">
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {COLORS.map(c=>(
            <button key={c} onClick={()=>setColor(c)} style={{
              width:32,height:32,borderRadius:'50%',background:c,border:`2px solid ${color===c?'#1a1a1a':'transparent'}`,
              cursor:'pointer',padding:0,transform:color===c?'scale(1.15)':'scale(1)',transition:'all 0.15s'
            }}/>
          ))}
        </div>
      </Field>
      <div style={S.mActions}>
        <button style={S.secBtn} onClick={onClose}>Cancel</button>
        <button style={S.primaryBtn} onClick={()=>name.trim()&&onSave({id:wp?.id,name:name.trim(),rate:rate||null,color})}
          disabled={!name.trim()}>
          {wp?'Save Changes':'Add Workplace'}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// SESSION FORM
// ─────────────────────────────────────────────────────────────────
function SessionForm({session,workplaces,onSave,onClose}){
  const [wpId,   setWpId]   = useState(session?.workplace_id || workplaces[0]?.id || '');
  const [date,   setDate]   = useState(session?.date        || new Date().toISOString().slice(0,10));
  const [start,  setStart]  = useState(session?.start_time  || '09:00');
  const [end,    setEnd]    = useState(session?.end_time    || '17:00');
  const [notes,  setNotes]  = useState(session?.notes       || '');

  const previewH = ()=>{
    const [sh,sm]=start.split(':').map(Number);
    const [eh,em]=end.split(':').map(Number);
    let m=(eh*60+em)-(sh*60+sm); if(m<0) m+=1440;
    return m/60;
  };
  const h = previewH();
  const wp = workplaces.find(w=>w.id===wpId);
  const earn = wp?.rate ? h*parseFloat(wp.rate) : 0;

  return (
    <Modal title={session?'Edit Session':'New Session'} onClose={onClose}>
      <Field label="Workplace">
        <select style={S.input} value={wpId} onChange={e=>setWpId(e.target.value)}>
          {workplaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>
      <Field label="Date">
        <input style={S.input} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      </Field>
      <div style={{display:'flex',gap:10}}>
        <Field label="Start" style={{flex:1}}>
          <input style={S.input} type="time" value={start} onChange={e=>setStart(e.target.value)}/>
        </Field>
        <Field label="End" style={{flex:1}}>
          <input style={S.input} type="time" value={end} onChange={e=>setEnd(e.target.value)}/>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea style={{...S.input,minHeight:60,resize:'vertical'}}
          value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What did you work on?"/>
      </Field>
      <div style={{background:'#fef0e8',padding:'10px 14px',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12,color:'#888',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Total</span>
        <span style={{fontFamily:'Fraunces,serif',fontSize:18,fontWeight:600,color:'#E07856'}}>
          {Math.floor(h)}h {Math.round((h-Math.floor(h))*60)}m
          {earn>0&&<span style={{color:'#5B8C5A',fontSize:14}}> · ${earn.toFixed(2)}</span>}
        </span>
      </div>
      <div style={S.mActions}>
        <button style={S.secBtn} onClick={onClose}>Cancel</button>
        <button style={S.primaryBtn}
          onClick={()=>onSave({id:session?.id,workplace_id:wpId,date,start_time:start,end_time:end,notes})}>
          {session?'Save Changes':'Log Session'}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────────
function Modal({title,onClose,children}){
  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} className="modal-enter" onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 20px 0'}}>
          <h3 style={{fontFamily:'Fraunces,serif',fontSize:20,fontWeight:600,margin:0}}>{title}</h3>
          <button style={S.iconBtnSm} onClick={onClose}><X size={18}/></button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

function Field({label,children,style}){
  return (
    <div style={{marginBottom:16,...style}}>
      <label style={{display:'block',fontSize:12,fontWeight:600,color:'#555',marginBottom:6,
        textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const S = {
  app:        { minHeight:'100vh', paddingBottom:40 },
  center:     { display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh' },
  header:     { background:'#1a1a1a',color:'#f5f1ea',padding:'20px 0' },
  headerInner:{ maxWidth:720,margin:'0 auto',padding:'0 20px',display:'flex',justifyContent:'space-between',alignItems:'center' },
  logo:       { display:'flex',alignItems:'center',gap:10 },
  logoText:   { fontFamily:'Fraunces,serif',fontWeight:700,fontSize:20,letterSpacing:'0.15em' },
  headerDate: { fontSize:13,opacity:0.7,fontWeight:500 },
  nav:        { background:'#fff',borderBottom:'1px solid #e8e1d4',padding:'8px 0',position:'sticky',
                top:0,zIndex:10,display:'flex',justifyContent:'center',gap:4,overflowX:'auto' },
  navBtn:     { display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 14px',
                background:'transparent',border:'none',cursor:'pointer',color:'#888',borderRadius:8,minWidth:64 },
  navActive:  { background:'#fef0e8',color:'#E07856' },
  navLabel:   { fontSize:11,fontWeight:600,letterSpacing:'0.02em' },
  main:       { maxWidth:720,margin:'0 auto',padding:'24px 20px' },
  statGrid:   { display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:24 },
  statCard:   { background:'#fff',padding:16,borderRadius:12,borderTop:'3px solid',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  statLbl:    { fontSize:12,color:'#888',fontWeight:500,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em' },
  statVal:    { fontFamily:'Fraunces,serif',fontSize:22,fontWeight:600 },
  primaryBtn: { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px 20px',
                background:'#1a1a1a',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:600,
                cursor:'pointer',width:'100%' },
  secBtn:     { display:'inline-flex',alignItems:'center',gap:6,padding:'10px 14px',background:'#fff',
                color:'#1a1a1a',border:'1px solid #d8d0c0',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer' },
  hint:       { fontSize:12,color:'#999',marginTop:8,textAlign:'center' },
  secTitle:   { fontFamily:'Fraunces,serif',fontSize:18,fontWeight:600,marginBottom:14,marginTop:0 },
  pageTitle:  { fontFamily:'Fraunces,serif',fontSize:26,fontWeight:600,marginBottom:20,marginTop:0 },
  list:       { display:'flex',flexDirection:'column',gap:10 },
  sessCard:   { display:'flex',justifyContent:'space-between',alignItems:'flex-start',background:'#fff',
                padding:'14px 16px',borderRadius:10,borderLeft:'4px solid',boxShadow:'0 1px 2px rgba(0,0,0,0.03)',gap:12 },
  wpCard:     { display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fff',
                padding:'14px 16px',borderRadius:10,borderLeft:'4px solid',boxShadow:'0 1px 2px rgba(0,0,0,0.03)' },
  iconBtn:    { background:'#fff',border:'1px solid #e8e1d4',borderRadius:8,padding:8,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',color:'#1a1a1a' },
  iconBtnSm:  { background:'transparent',border:'none',padding:6,cursor:'pointer',display:'flex',
                alignItems:'center',justifyContent:'center',color:'#888',borderRadius:6 },
  weekNav:    { display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',
                padding:'12px 16px',borderRadius:12,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  weekRange:  { fontFamily:'Fraunces,serif',fontSize:17,fontWeight:600 },
  weekSub:    { fontSize:11,color:'#888',marginTop:2,textTransform:'uppercase',letterSpacing:'0.05em' },
  weekTotals: { display:'flex',alignItems:'center',background:'#1a1a1a',color:'#f5f1ea',padding:20,
                borderRadius:12,marginBottom:28 },
  weekVal:    { fontFamily:'Fraunces,serif',fontSize:26,fontWeight:600 },
  weekLbl:    { fontSize:11,opacity:0.6,textTransform:'uppercase',letterSpacing:'0.08em',marginTop:4 },
  barCard:    { background:'#fff',padding:'12px 14px',borderRadius:10 },
  barTrack:   { height:6,background:'#f0e8d8',borderRadius:3,overflow:'hidden' },
  barFill:    { height:'100%',borderRadius:3,transition:'width 0.4s cubic-bezier(0.16,1,0.3,1)' },
  dot:        { width:10,height:10,borderRadius:'50%',display:'inline-block' },
  select:     { padding:'8px 12px',border:'1px solid #d8d0c0',borderRadius:8,background:'#fff',
                fontSize:13,cursor:'pointer' },
  summaryGrand:{ display:'flex',justifyContent:'space-around',alignItems:'center',background:'#1a1a1a',
                 color:'#f5f1ea',padding:24,borderRadius:12,marginBottom:24 },
  grandLbl:   { fontSize:11,opacity:0.6,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 },
  grandVal:   { fontFamily:'Fraunces,serif',fontSize:28,fontWeight:600 },
  summaryRow: { display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fff',
                padding:'14px 16px',borderRadius:10,borderLeft:'4px solid' },
  empty:      { background:'#fff',padding:'40px 20px',borderRadius:12,textAlign:'center',color:'#999',
                display:'flex',flexDirection:'column',alignItems:'center',gap:12 },
  backdrop:   { position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',
                justifyContent:'center',padding:20,zIndex:100 },
  modal:      { background:'#fff',borderRadius:16,maxWidth:440,width:'100%',maxHeight:'90vh',
                overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  input:      { width:'100%',padding:'10px 12px',border:'1px solid #d8d0c0',borderRadius:8,
                fontSize:14,background:'#fff',transition:'all 0.15s' },
  mActions:   { display:'flex',gap:10,marginTop:20 },
};
