// src/pages/Gamification.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, ref, set, onValue } from '../firebase';
import { uid } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import UserAvatar from '../components/UserAvatar';

/* ═══════════════════════════════════════════════════════════════
   HỆ THỐNG RANK — 20 bậc (Đồng I→III … Tinh Anh I→III, Huyền Thoại, Cao Thủ)
═══════════════════════════════════════════════════════════════ */
const RANKS = [
  { id:'d1', tier:'Đồng',       sub:'I',   min:0,       max:3_999,    color:'#b87333', glow:'rgba(184,115,51,0.55)', bg:'rgba(184,115,51,0.09)' },
  { id:'d2', tier:'Đồng',       sub:'II',  min:4_000,   max:7_999,    color:'#c08840', glow:'rgba(192,136,64,0.55)', bg:'rgba(192,136,64,0.09)' },
  { id:'d3', tier:'Đồng',       sub:'III', min:8_000,   max:11_999,   color:'#d09050', glow:'rgba(208,144,80,0.55)', bg:'rgba(208,144,80,0.09)' },
  { id:'s1', tier:'Bạc',        sub:'I',   min:12_000,  max:17_999,   color:'#9ca3af', glow:'rgba(156,163,175,0.55)', bg:'rgba(156,163,175,0.08)' },
  { id:'s2', tier:'Bạc',        sub:'II',  min:18_000,  max:23_999,   color:'#b0b7c0', glow:'rgba(176,183,192,0.55)', bg:'rgba(176,183,192,0.08)' },
  { id:'s3', tier:'Bạc',        sub:'III', min:24_000,  max:29_999,   color:'#c8cfd8', glow:'rgba(200,207,216,0.55)', bg:'rgba(200,207,216,0.08)' },
  { id:'g1', tier:'Vàng',       sub:'I',   min:30_000,  max:39_999,   color:'#fbbf24', glow:'rgba(251,191,36,0.55)',  bg:'rgba(251,191,36,0.08)' },
  { id:'g2', tier:'Vàng',       sub:'II',  min:40_000,  max:49_999,   color:'#fcd34d', glow:'rgba(252,211,77,0.55)',  bg:'rgba(252,211,77,0.08)' },
  { id:'g3', tier:'Vàng',       sub:'III', min:50_000,  max:59_999,   color:'#fde68a', glow:'rgba(253,230,138,0.55)', bg:'rgba(253,230,138,0.08)' },
  { id:'p1', tier:'Bạch Kim',   sub:'I',   min:60_000,  max:74_999,   color:'#bfdbfe', glow:'rgba(191,219,254,0.5)',  bg:'rgba(191,219,254,0.06)' },
  { id:'p2', tier:'Bạch Kim',   sub:'II',  min:75_000,  max:89_999,   color:'#c8e8ff', glow:'rgba(200,232,255,0.5)',  bg:'rgba(200,232,255,0.06)' },
  { id:'p3', tier:'Bạch Kim',   sub:'III', min:90_000,  max:109_999,  color:'#ddf0ff', glow:'rgba(221,240,255,0.5)',  bg:'rgba(221,240,255,0.06)' },
  { id:'k1', tier:'Kim Cương',  sub:'I',   min:110_000, max:129_999,  color:'#38bdf8', glow:'rgba(56,189,248,0.6)',   bg:'rgba(56,189,248,0.08)' },
  { id:'k2', tier:'Kim Cương',  sub:'II',  min:130_000, max:159_999,  color:'#0ea5e9', glow:'rgba(14,165,233,0.6)',   bg:'rgba(14,165,233,0.08)' },
  { id:'k3', tier:'Kim Cương',  sub:'III', min:160_000, max:199_999,  color:'#7dd3fc', glow:'rgba(125,211,252,0.6)',  bg:'rgba(125,211,252,0.09)' },
  { id:'e1', tier:'Tinh Anh',   sub:'I',   min:200_000, max:239_999,  color:'#c084fc', glow:'rgba(192,132,252,0.6)',  bg:'rgba(192,132,252,0.09)' },
  { id:'e2', tier:'Tinh Anh',   sub:'II',  min:240_000, max:299_999,  color:'#a855f7', glow:'rgba(168,85,247,0.6)',   bg:'rgba(168,85,247,0.09)' },
  { id:'e3', tier:'Tinh Anh',   sub:'III', min:300_000, max:379_999,  color:'#d946ef', glow:'rgba(217,70,239,0.6)',   bg:'rgba(217,70,239,0.09)' },
  { id:'hl', tier:'Huyền Thoại',sub:null,  min:380_000, max:499_999,  color:'#fb923c', glow:'rgba(251,146,60,0.65)',  bg:'rgba(251,146,60,0.1)'  },
  { id:'ct', tier:'Cao Thủ',    sub:null,  min:500_000, max:Infinity, color:'#fde047', glow:'rgba(253,224,71,0.7)',   bg:'rgba(253,224,71,0.1)'  },
];

const EMBLEMS = {
  'Đồng':'◈','Bạc':'◻','Vàng':'✦','Bạch Kim':'❋',
  'Kim Cương':'◆','Tinh Anh':'⬟','Huyền Thoại':'⊛','Cao Thủ':'⚜',
};

/* helpers (avoid findLast for older envs) */
function getRankInfo(pts) {
  const p = Math.max(0, Number(pts) || 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) { if (p >= RANKS[i].min) idx = i; }
  return RANKS[idx];
}
function getNextRank(pts) {
  const p = Math.max(0, Number(pts) || 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) { if (p >= RANKS[i].min) idx = i; }
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}
function getRankProgress(pts) {
  const p = Math.max(0, Number(pts) || 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) { if (p >= RANKS[i].min) idx = i; }
  if (idx >= RANKS.length - 1) return 100;
  const cur = RANKS[idx], nxt = RANKS[idx + 1];
  return Math.round(((p - cur.min) / (nxt.min - cur.min)) * 100);
}
function toArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [];
}


/* ── Rank Badge ── */
function RankBadge({ pts, size = 'sm' }) {
  const r   = getRankInfo(pts);
  const lbl = r.sub ? `${r.tier} ${r.sub}` : r.tier;
  const emb = EMBLEMS[r.tier] || '◆';
  const cfg = { sm:{fs:9,px:6,py:2,gap:3,esz:10}, md:{fs:11,px:10,py:3,gap:4,esz:13}, lg:{fs:14,px:14,py:5,gap:5,esz:17} };
  const c   = cfg[size] || cfg.sm;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:c.gap, padding:`${c.py}px ${c.px}px`,
      borderRadius:7, background:r.bg, border:`1px solid ${r.glow}`, color:r.color,
      fontWeight:800, fontSize:c.fs, whiteSpace:'nowrap', boxShadow:`0 0 8px ${r.glow}`, letterSpacing:'0.02em' }}>
      <span style={{ fontSize:c.esz }}>{emb}</span>{lbl}
    </span>
  );
}

/* ── Avatar Helper (maps to UserAvatar) ── */
function Avatar({ m, size, isMe }) {
  return <UserAvatar user={m} size={size} isMe={isMe} />;
}

/* ── Leaderboard row ── */
function LbRow({ m, i, currentUser }) {
  const isMe = m.id === currentUser?.id;
  const medals = ['🥇','🥈','🥉'];
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px',
      borderBottom:'1px solid rgba(255,255,255,0.04)',
      background: isMe ? 'rgba(59,130,246,0.06)' : 'transparent', transition:'background .15s' }}
      onMouseEnter={e=>{ if(!isMe) e.currentTarget.style.background='rgba(255,255,255,0.025)'; }}
      onMouseLeave={e=>{ if(!isMe) e.currentTarget.style.background=isMe?'rgba(59,130,246,0.06)':'transparent'; }}>
      <div style={{ width:28, textAlign:'center', fontWeight:900, fontSize:13, flexShrink:0,
        color: i<3 ? ['#fbbf24','#9ca3af','#b87333'][i] : '#374151' }}>
        {i < 3 ? medals[i] : `#${i+1}`}
      </div>
      <UserAvatar user={m} size={34} isMe={isMe} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:700, color:isMe?'#60a5fa':'#e2e8f0',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:150 }}>{m.fullName}</span>
          {isMe && <span style={{ fontSize:8, fontWeight:900, color:'#3b82f6', letterSpacing:1 }}>BẠN</span>}
          {m.myTitles.map(t => (
            <span key={t.id} title={t.desc}
              style={{ fontSize:9, padding:'1px 6px', borderRadius:4, fontWeight:700,
                background:`${t.color}18`, border:`1px solid ${t.color}55`, color:t.color }}>
              {t.icon} {t.name}
            </span>
          ))}
        </div>
        <div style={{ fontSize:10, color:'#374151', marginTop:1 }}>{m.mssv}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <RankBadge pts={m.points} size="sm" />
        <span style={{ fontSize:15, fontWeight:900, minWidth:38, textAlign:'right',
          color:m.rankInfo.color, textShadow:`0 0 12px ${m.rankInfo.glow}` }}>{m.points}</span>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════ */
export default function Gamification() {
  const { members, contributions, currentUser, isSuperAdmin, isCore } = useApp();
  const [tab, setTab]         = useState('current');
  const [titles, setTitles]   = useState([]);
  const [awards, setAwards]   = useState({});
  const [seasons, setSeasons] = useState([]);
  const [selSeason, setSelSeason] = useState(null);

  /* admin state */
  const [showAdmin, setShowAdmin]   = useState(false);
  const [aTab, setATab]             = useState('award');
  const [newTitle, setNewTitle]     = useState({ name:'', icon:'🏅', color:'#ffd700', desc:'' });
  const [awardForm, setAwardForm]   = useState({ userId:'', titleId:'' });
  const [seasonName, setSeasonName] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  /* ── subscribe firebase ── */
  useEffect(() => {
    const u1 = onValue(ref(db,'gamif_titles'), snap => {
      setTitles(toArr(snap.val()));
    });
    const u2 = onValue(ref(db,'gamif_awards'), snap => {
      const v = snap.val() || {};
      const norm = {};
      Object.entries(v).forEach(([id, val]) => { norm[id] = toArr(val); });
      setAwards(norm);
    });
    const u3 = onValue(ref(db,'gamif_seasons'), snap => {
      const arr = toArr(snap.val()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      setSeasons(arr);
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  const activeMembers = useMemo(() => (members || []).filter(m => m.status !== 'pending'), [members]);

  const ranked = useMemo(() => activeMembers.map(m => ({
    ...m,
    points:   Number(contributions?.[m.id]) || 0,
    rankInfo: getRankInfo(Number(contributions?.[m.id]) || 0),
    progress: getRankProgress(Number(contributions?.[m.id]) || 0),
    myTitles: toArr(awards[m.id]).map(tid => titles.find(t => t.id === tid)).filter(Boolean),
  })).sort((a,b) => b.points - a.points), [activeMembers, contributions, awards, titles]);

  const me     = ranked.find(m => m.id === currentUser?.id);
  const myRank = ranked.findIndex(m => m.id === currentUser?.id) + 1;
  const canAdmin = isSuperAdmin || isCore;

  const seasonRanked = useMemo(() => {
    if (!selSeason) return [];
    const s = seasons.find(x => x.id === selSeason);
    if (!s) return [];
    return activeMembers.map(m => ({
      ...m,
      points:   Number(s.snapshot?.[m.id]) || 0,
      rankInfo: getRankInfo(Number(s.snapshot?.[m.id]) || 0),
      myTitles: toArr(s.awardSnapshot?.[m.id]).map(tid =>
        toArr(s.titleSnapshot).find(t => t.id === tid) || titles.find(t => t.id === tid)
      ).filter(Boolean),
    })).sort((a,b) => b.points - a.points);
  }, [selSeason, seasons, activeMembers, titles]);

  /* ── admin handlers ── */
  const handleAddTitle = () => {
    if (!newTitle.name.trim()) return;
    const t = { id:uid(), ...newTitle, createdAt:new Date().toISOString() };
    const map = {};
    [...titles, t].forEach(x => { if(x?.id) map[x.id] = x; });
    set(ref(db,'gamif_titles'), map);
    setNewTitle({ name:'', icon:'🏅', color:'#ffd700', desc:'' });
  };
  const handleDeleteTitle = id => {
    const map = {};
    titles.filter(t => t.id !== id).forEach(t => { map[t.id] = t; });
    set(ref(db,'gamif_titles'), Object.keys(map).length ? map : null);
  };
  const handleAward = () => {
    if (!awardForm.userId || !awardForm.titleId) return;
    const cur = toArr(awards[awardForm.userId]);
    if (cur.includes(awardForm.titleId)) return;
    set(ref(db, `gamif_awards/${awardForm.userId}`), [...cur, awardForm.titleId]);
    setAwardForm({ userId:'', titleId:'' });
  };
  const handleRevoke = (userId, titleId) => {
    const cur = toArr(awards[userId]).filter(id => id !== titleId);
    set(ref(db, `gamif_awards/${userId}`), cur.length ? cur : null);
  };
  const handleResetSeason = () => {
    if (!seasonName.trim()) return;
    const snapshot = {};
    activeMembers.forEach(m => { snapshot[m.id] = Number(contributions?.[m.id]) || 0; });
    const awardSnapshot = {};
    Object.entries(awards || {}).forEach(([id, tids]) => { if(tids) awardSnapshot[id] = tids; });
    const titleSnapshot = {};
    titles.forEach(t => { if(t?.id) titleSnapshot[t.id] = t; });
    const season = {
      id: uid(), name:seasonName.trim(),
      createdAt:new Date().toISOString(), createdBy:currentUser?.fullName||'Admin',
      snapshot, awardSnapshot, titleSnapshot,
    };
    const seasonsMap = {};
    seasons.forEach(s => { if(s?.id) seasonsMap[s.id] = s; });
    seasonsMap[season.id] = season;
    set(ref(db,'gamif_seasons'), seasonsMap);
    const reset = {};
    activeMembers.forEach(m => { reset[m.id] = 0; });
    set(ref(db,'2x18_contributions'), reset);
    set(ref(db,'gamif_awards'), null);
    setSeasonName(''); setConfirmReset(false); setShowAdmin(false);
  };

  /* ──────────────────── INPUT STYLE ──────────────────── */
  const inputSt = {
    width:'100%', padding:'8px 11px', borderRadius:8, boxSizing:'border-box',
    background:'#09090b', border:'1px solid #27272a', color:'#e4e4e7', fontSize:12,
    outline:'none',
  };
  const btnPrimary = {
    width:'100%', padding:'9px', borderRadius:8, background:'#1d4ed8',
    border:'none', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer',
  };

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden',
      background:'#09090b', color:'#e4e4e7', fontFamily:"'Segoe UI', system-ui, sans-serif", position:'relative' }}
    >

      {/* ambient bg glow */}
      <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:520, height:520, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:'-15%', right:'-8%', width:460, height:460, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)' }}/>
        <div style={{ position:'absolute', top:'40%', right:'25%', width:300, height:300, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(251,146,60,0.04) 0%, transparent 70%)' }}/>
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:'relative', zIndex:1, padding:'13px 22px',
        borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0,
        background:'rgba(9,9,11,0.92)', backdropFilter:'blur(8px)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ margin:0, fontSize:19, fontWeight:900, letterSpacing:'-0.02em',
              background:'linear-gradient(120deg,#fbbf24 0%,#f97316 50%,#ec4899 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              ⚜ Chiến Tích & Vinh Danh
            </h1>
            <p style={{ margin:'2px 0 0', fontSize:10, color:'#52525b', letterSpacing:'0.03em' }}>
              HỆ THỐNG RANK · NHÓM 2X18 · LIVE
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            {canAdmin && (
              <button onClick={() => setShowAdmin(true)} style={{ padding:'6px 12px', fontSize:10, fontWeight:800,
                color:'#fb923c', border:'1px solid rgba(251,146,60,0.28)', borderRadius:8,
                background:'rgba(251,146,60,0.06)', cursor:'pointer', letterSpacing:'0.04em' }}>
                ⚙ QUẢN LÝ
              </button>
            )}
            <div style={{ display:'flex', background:'#111113', border:'1px solid #1f1f23', borderRadius:10, overflow:'hidden' }}>
              {[['current','Kỳ này'],['history','Lịch sử'],['titles','Danh hiệu'],['howto','Cách tính']].map(([v,l]) => (
                <button key={v} onClick={() => setTab(v)} style={{
                  padding:'6px 11px', fontSize:10, fontWeight:800, letterSpacing:'0.03em',
                  cursor:'pointer', border:'none', outline:'none', transition:'all .2s',
                  background: tab===v ? '#2563eb' : 'transparent',
                  color: tab===v ? '#fff' : '#52525b',
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', position:'relative', zIndex:1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >

        {/* ════════ CURRENT SEASON ════════ */}
        {tab === 'current' && (
          <>
            {/* My rank card */}
            {me && (() => {
              const next = getNextRank(me.points);
              return (
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  style={{ marginBottom:18, padding:'18px 22px', borderRadius:16,
                  background:`linear-gradient(135deg, ${me.rankInfo.bg} 0%, rgba(255,255,255,0.015) 100%)`,
                  border:`1px solid ${me.rankInfo.glow}`, boxShadow:`0 0 28px ${me.rankInfo.glow}`,
                  display:'flex', gap:18, alignItems:'center', flexWrap:'wrap' }}>
                  <UserAvatar user={me} size={54} isMe />
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontSize:10, color:'#52525b', fontWeight:800, letterSpacing:'0.08em', marginBottom:5 }}>RANK CỦA BẠN</div>
                    <RankBadge pts={me.points} size="lg" />
                    <div style={{ marginTop:9, display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${me.progress}%` }}
                          style={{ height:'100%', borderRadius:99, transition:'width .6s ease',
                          background:`linear-gradient(90deg, ${me.rankInfo.color}aa, ${me.rankInfo.color})` }}/>
                      </div>
                      <span style={{ fontSize:9, color:'#52525b', fontWeight:700 }}>{me.progress}%</span>
                      {next && <span style={{ fontSize:9, color:'#3f3f46' }}>→ {next.sub?`${next.tier} ${next.sub}`:next.tier} ({next.min - me.points} điểm)</span>}
                    </div>
                    {me.myTitles.length > 0 && (
                      <div style={{ marginTop:7, display:'flex', gap:5, flexWrap:'wrap' }}>
                        {me.myTitles.map(t => (
                          <span key={t.id} style={{ fontSize:10, padding:'2px 8px', borderRadius:5, fontWeight:700,
                            background:`${t.color}18`, border:`1px solid ${t.color}44`, color:t.color }}>
                            {t.icon} {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:40, fontWeight:900, lineHeight:1, color:me.rankInfo.color,
                      textShadow:`0 0 24px ${me.rankInfo.glow}` }}>{me.points}</div>
                    <div style={{ fontSize:10, color:'#52525b', marginTop:2 }}>điểm · #{myRank} / {ranked.length}</div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Top 3 podium */}
            {ranked.length >= 3 && (
              <div style={{ marginBottom:14, padding:'18px 20px', borderRadius:16,
                background:'linear-gradient(180deg,#111113,#0f0f11)',
                border:'1px solid rgba(255,255,255,0.05)',
                display:'grid', gridTemplateColumns:'1fr 1.15fr 1fr', gap:10 }}>
                {[ranked[1], ranked[0], ranked[2]].map((m, ci) => {
                  if (!m) return <div key={ci}/>;
                  const isMe  = m.id === currentUser?.id;
                  const meds  = ['🥈','🥇','🥉'];
                  const hts   = [56,72,46];
                  const podGrd = [
                    'linear-gradient(to top,rgba(160,160,176,0.22),transparent)',
                    'linear-gradient(to top,rgba(251,191,36,0.25),transparent)',
                    'linear-gradient(to top,rgba(184,115,51,0.2),transparent)',
                  ];
                  const podBdr = ['rgba(160,160,176,0.3)','rgba(251,191,36,0.35)','rgba(184,115,51,0.28)'];
                  return (
                    <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                      marginTop: ci===1 ? 0 : 14 }}>
                      <UserAvatar user={m} size={ci===1?50:38} isMe={isMe} />
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:11, fontWeight:700, color:isMe?'#60a5fa':'#d4d4d8',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:90 }}>
                          {m.fullName?.split(' ').pop() || '??'}
                        </div>
                        <RankBadge pts={m.points} size="sm" />
                        <div style={{ fontSize:14, fontWeight:900, marginTop:2,
                          color:m.rankInfo.color, textShadow:`0 0 10px ${m.rankInfo.glow}` }}>{m.points}</div>
                      </div>
                      <div style={{ width:'100%', height:hts[ci], borderRadius:'8px 8px 0 0',
                        background:podGrd[ci], border:`1px solid ${podBdr[ci]}`, borderBottom:'none',
                        display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:6 }}>
                        <span style={{ fontSize:18 }}>{meds[ci]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, overflow:'hidden' }}>
              {ranked.map((m, i) => <LbRow key={m.id} m={m} i={i} currentUser={currentUser} onRevoke={isSuperAdmin ? handleRevoke : null} />)}
            </div>
          </>
        )}

        {/* ════════ HISTORY ════════ */}
        {tab === 'history' && (
          <div>
            {seasons.length === 0 ? (
              <div style={{ textAlign:'center', padding:'52px 0', color:'#3f3f46' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
                <div style={{ fontSize:13 }}>Chưa có kỳ học nào được lưu</div>
                {canAdmin && <div style={{ fontSize:11, marginTop:4, color:'#27272a' }}>Vào "Quản lý → Reset kỳ" để lưu kỳ hiện tại</div>}
              </div>
            ) : (
              <>
                <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  {seasons.map(s => (
                    <button key={s.id} onClick={() => setSelSeason(s.id === selSeason ? null : s.id)} style={{
                      padding:'9px 14px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer',
                      background: selSeason===s.id ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.03)',
                      border:`1px solid ${selSeason===s.id ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      color: selSeason===s.id ? '#60a5fa' : '#71717a', transition:'all .2s',
                    }}>
                      📅 {s.name}
                      <div style={{ fontSize:9, fontWeight:400, color:'#3f3f46', marginTop:2 }}>
                        {new Date(s.createdAt).toLocaleDateString('vi-VN')} · {s.createdBy}
                      </div>
                    </button>
                  ))}
                </div>
                {selSeason ? (
                  <div style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, overflow:'hidden' }}>
                    <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)',
                      background:'rgba(255,255,255,0.02)', fontSize:12, fontWeight:800, color:'#a1a1aa' }}>
                      {seasons.find(s=>s.id===selSeason)?.name} — Snapshot cuối kỳ
                    </div>
                    {seasonRanked.map((m, i) => {
                      const isMe = m.id === currentUser?.id;
                      const medals = ['🥇','🥈','🥉'];
                      return (
                        <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px',
                          borderBottom:'1px solid rgba(255,255,255,0.04)',
                          background: isMe?'rgba(59,130,246,0.05)':'transparent' }}>
                          <div style={{ width:28, textAlign:'center', fontWeight:900, fontSize:13, flexShrink:0,
                            color: i<3?['#fbbf24','#9ca3af','#b87333'][i]:'#374151' }}>
                            {i<3 ? medals[i] : `#${i+1}`}
                          </div>
                          <Avatar m={m} size={32} isMe={isMe} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:isMe?'#60a5fa':'#d4d4d8',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {m.fullName} {isMe&&<span style={{fontSize:8,color:'#3b82f6',fontWeight:900}}> BẠN</span>}
                            </div>
                            {m.myTitles.length>0 && (
                              <div style={{ display:'flex', gap:4, marginTop:2, flexWrap:'wrap' }}>
                                {m.myTitles.map(t => t && (
                                  <span key={t.id} style={{ fontSize:9, padding:'1px 5px', borderRadius:4,
                                    background:`${t.color}18`, border:`1px solid ${t.color}44`, color:t.color, fontWeight:700 }}>
                                    {t.icon} {t.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                            <RankBadge pts={m.points} size="sm" />
                            <span style={{ fontSize:15, fontWeight:900, minWidth:36, textAlign:'right',
                              color:m.rankInfo.color }}>{m.points}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'28px 0', color:'#3f3f46', fontSize:12 }}>
                    Chọn một kỳ học để xem bảng xếp hạng
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════ TITLES SHOWCASE ════════ */}
        {tab === 'titles' && (
          <div>
            {titles.length === 0 ? (
              <div style={{ textAlign:'center', padding:'52px 0', color:'#3f3f46' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🏅</div>
                <div style={{ fontSize:13 }}>Chưa có danh hiệu nào được tạo</div>
                {canAdmin && <div style={{ fontSize:11, marginTop:4, color:'#27272a' }}>Vào "Quản lý" để thêm danh hiệu</div>}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                {titles.map(t => {
                  const holders = Object.entries(awards)
                    .filter(([, tids]) => tids.includes(t.id))
                    .map(([uid]) => activeMembers.find(m => m.id === uid))
                    .filter(Boolean);
                  return (
                    <div key={t.id} style={{ padding:'16px', borderRadius:14,
                      background:`${t.color}08`, border:`1px solid ${t.color}35`,
                      boxShadow:`0 0 16px ${t.color}18` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:28 }}>{t.icon}</span>
                        <div>
                          <div style={{ fontSize:14, fontWeight:900, color:t.color }}>{t.name}</div>
                          <div style={{ fontSize:10, color:'#3f3f46', fontWeight:600 }}>Danh hiệu độc quyền</div>
                        </div>
                      </div>
                      {t.desc && <div style={{ fontSize:12, color:'#71717a', marginBottom:10, lineHeight:1.55 }}>{t.desc}</div>}
                      {holders.length > 0 ? (
                        <div>
                          <div style={{ fontSize:9, color:'#3f3f46', fontWeight:800, letterSpacing:'0.06em', marginBottom:5, textTransform:'uppercase' }}>
                            Người sở hữu ({holders.length})
                          </div>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {holders.map(m => (
                              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:6, background:'rgba(255,255,255,0.04)' }}>
                                <Avatar m={m} size={16} />
                                <span style={{ fontSize:11, color:'#d4d4d8' }}>{m.fullName?.split(' ').pop() || '??'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize:11, color:'#27272a' }}>Chưa ai sở hữu</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════ HOW TO ════════ */}
        {tab === 'howto' && (
          <div>
            <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:900, color:'#a1a1aa', letterSpacing:'0.06em', textTransform:'uppercase' }}>
              Bảng Hạng — 20 Bậc
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))', gap:7, marginBottom:24 }}>
              {RANKS.map(r => (
                <div key={r.id} style={{ padding:'9px 12px', borderRadius:10, background:r.bg, border:`1px solid ${r.glow}`,
                  display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ fontSize:15, color:r.color }}>{EMBLEMS[r.tier]||'◆'}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:800, color:r.color }}>{r.tier}{r.sub?` ${r.sub}`:''}</div>
                    <div style={{ fontSize:9, color:'#3f3f46' }}>{r.min}–{r.max===Infinity?'∞':r.max} điểm</div>
                  </div>
                </div>
              ))}
            </div>
            <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:900, color:'#a1a1aa', letterSpacing:'0.06em', textTransform:'uppercase' }}>
              Cách Tích Điểm
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                // ── Cộng điểm
                ['+2,000', '📄','Upload tài liệu mới cho nhóm'],
                ['+3,000', '⭐','Tài liệu được đánh giá 5 sao'],
                ['+1,000', '✅','Điểm danh buổi họp SME (1 lần/buổi)'],
                ['+1,500', '⏰','Hoàn thành task đúng hạn'],
                ['+3,000', '📈','Tiến độ môn học đạt 100%'],
                ['+500',   '🗳️','Tham gia bình chọn nhóm'],
                ['+10,000','🎓','Tổ chức buổi học nhóm thành công'],
                ['+5,000', '📝','Viết báo cáo tổng kết buổi học'],
                ['+2,500', '💡','Chia sẻ kinh nghiệm học tập được upvote'],
                ['+1,000', '⭐','Đánh giá/phản hồi tài liệu của thành viên khác'],
                ['+800',   '🤝','Mời/giới thiệu thành viên mới được duyệt'],
                ['+500',   '💬','Góp ý cải thiện app được Core ghi nhận'],
                // ── Trừ điểm
                ['-2,000', '⏱️','Nộp task trễ hạn (mỗi lần trễ)'],
                ['-5,000', '🚫','Vắng không phép buổi họp bắt buộc'],
                ['-1,000', '⚠️','Bị nhắc nhở vi phạm quy định nhóm'],
              ].map(([pts, icon, action]) => {
                const isNeg = pts.startsWith('-');
                return (
                  <div key={action} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                    borderRadius:10,
                    background: isNeg ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.025)',
                    border: isNeg ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:18 }}>{icon}</span>
                    <span style={{ flex:1, fontSize:12, color: isNeg ? '#fca5a5' : '#d4d4d8' }}>{action}</span>
                    <span style={{ fontSize:14, fontWeight:900, color: isNeg ? '#f87171' : '#4ade80' }}>{pts}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10, background:'rgba(251,191,36,0.04)', border:'1px solid rgba(251,191,36,0.12)', fontSize:11, color:'#a16207', lineHeight:1.6 }}>
              💡 <strong style={{color:'#fbbf24'}}>Lưu ý:</strong> Điểm âm được trừ trực tiếp vào tổng điểm cống hiến. Hãy hoàn thành task đúng hạn và tham gia đầy đủ các buổi họp!
            </div>
          </div>
        )}
        </motion.div>
        </AnimatePresence>
      </div>

      {/* ══════════ ADMIN MODAL ══════════ */}
      <AnimatePresence>
        {showAdmin && canAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.72)', backdropFilter:'blur(5px)' }}
            onClick={e => { if(e.target===e.currentTarget){setShowAdmin(false);setConfirmReset(false);} }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ width:'min(520px,94vw)', maxHeight:'82vh', overflowY:'auto',
              background:'#111113', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:'22px' }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:15, fontWeight:900, color:'#e4e4e7' }}>⚙ Quản lý Gamification</h2>
              <button onClick={()=>{setShowAdmin(false);setConfirmReset(false);}}
                style={{ background:'none', border:'none', color:'#52525b', fontSize:18, cursor:'pointer' }}>✕</button>
            </div>

            {/* modal tabs */}
            <div style={{ display:'flex', gap:3, marginBottom:18, background:'#09090b', borderRadius:9, padding:3 }}>
              {[['award','🏅 Trao danh hiệu'],['titles','✏️ Quản lý danh hiệu'],['season','🔄 Reset kỳ']].map(([v,l]) => (
                <button key={v} onClick={()=>setATab(v)} style={{
                  flex:1, padding:'7px 6px', fontSize:10, fontWeight:800, borderRadius:7, border:'none', cursor:'pointer',
                  background: aTab===v ? '#1d4ed8' : 'transparent',
                  color: aTab===v ? '#fff' : '#52525b', transition:'all .2s',
                }}>{l}</button>
              ))}
            </div>

            {/* ─── Award tab ─── */}
            {aTab === 'award' && (
              <div>
                <div style={{ padding:14, background:'rgba(255,255,255,0.025)', borderRadius:10,
                  border:'1px solid rgba(255,255,255,0.06)', marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#71717a', marginBottom:10 }}>Trao danh hiệu cho thành viên</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    <select value={awardForm.userId} onChange={e=>setAwardForm(f=>({...f,userId:e.target.value}))} style={inputSt}>
                      <option value="">Chọn thành viên…</option>
                      {activeMembers.map(m=><option key={m.id} value={m.id}>{m.fullName} ({m.mssv})</option>)}
                    </select>
                    <select value={awardForm.titleId} onChange={e=>setAwardForm(f=>({...f,titleId:e.target.value}))} style={inputSt}>
                      <option value="">Chọn danh hiệu…</option>
                      {titles.map(t=><option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                    </select>
                    <button onClick={handleAward} style={btnPrimary}>Trao danh hiệu</button>
                  </div>
                </div>
                <div style={{ fontSize:11, fontWeight:800, color:'#52525b', marginBottom:7, letterSpacing:'0.04em' }}>DANH HIỆU ĐÃ TRAO</div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:200, overflowY:'auto' }}>
                  {Object.entries(awards).flatMap(([uid, tids]) => {
                    const m = activeMembers.find(x=>x.id===uid);
                    if (!m || !tids?.length) return [];
                    return tids.map(tid => {
                      const t = titles.find(x=>x.id===tid);
                      if (!t) return null;
                      return (
                        <div key={uid+tid} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                          borderRadius:8, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize:15 }}>{t.icon}</span>
                          <span style={{ flex:1, fontSize:12, color:'#d4d4d8' }}>{m.fullName}</span>
                          <span style={{ fontSize:10, color:'#71717a' }}>{t.name}</span>
                          {canAdmin && (
                            <button onClick={()=>handleRevoke(uid,tid)}
                              style={{ padding:'2px 8px', borderRadius:5, fontSize:9, fontWeight:800, cursor:'pointer',
                                background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
                              Thu hồi
                            </button>
                          )}
                        </div>
                      );
                    }).filter(Boolean);
                  })}
                  {Object.values(awards).every(a=>!a?.length) && (
                    <div style={{ fontSize:12, color:'#27272a', textAlign:'center', padding:'14px 0' }}>Chưa có danh hiệu nào được trao</div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Titles management ─── */}
            {aTab === 'titles' && (
              <div>
                <div style={{ padding:14, background:'rgba(255,255,255,0.025)', borderRadius:10,
                  border:'1px solid rgba(255,255,255,0.06)', marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#71717a', marginBottom:10 }}>Thêm danh hiệu mới</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    <div style={{ display:'flex', gap:7 }}>
                      <input value={newTitle.icon} onChange={e=>setNewTitle(f=>({...f,icon:e.target.value}))}
                        placeholder="🏅" maxLength={4}
                        style={{ ...inputSt, width:50, textAlign:'center', fontSize:18, padding:'6px' }} />
                      <input value={newTitle.name} onChange={e=>setNewTitle(f=>({...f,name:e.target.value}))}
                        placeholder="Tên danh hiệu…"
                        style={{ ...inputSt, flex:1 }} />
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:9, color:'#52525b', fontWeight:700 }}>MÀU</span>
                        <input type="color" value={newTitle.color} onChange={e=>setNewTitle(f=>({...f,color:e.target.value}))}
                          style={{ width:32, height:32, borderRadius:6, border:'none', cursor:'pointer', padding:0, background:'none' }} />
                      </div>
                    </div>
                    <input value={newTitle.desc} onChange={e=>setNewTitle(f=>({...f,desc:e.target.value}))}
                      placeholder="Mô tả ngắn (tuỳ chọn)…" style={inputSt} />
                    {/* Preview */}
                    {newTitle.name.trim() && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:8,
                        background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize:10, color:'#52525b' }}>Xem trước:</span>
                        <span style={{ fontSize:12, padding:'2px 8px', borderRadius:5, fontWeight:800,
                          background:`${newTitle.color}18`, border:`1px solid ${newTitle.color}44`, color:newTitle.color }}>
                          {newTitle.icon} {newTitle.name}
                        </span>
                      </div>
                    )}
                    <button onClick={handleAddTitle}
                      style={{ ...btnPrimary, background:'#065f46' }}>+ Thêm danh hiệu</button>
                  </div>
                </div>
                <div style={{ fontSize:11, fontWeight:800, color:'#52525b', marginBottom:7, letterSpacing:'0.04em' }}>
                  DANH HIỆU HIỆN CÓ ({titles.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:220, overflowY:'auto' }}>
                  {titles.map(t => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderRadius:8,
                      background:`${t.color}06`, border:`1px solid ${t.color}28` }}>
                      <span style={{ fontSize:18 }}>{t.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:t.color }}>{t.name}</div>
                        {t.desc&&<div style={{ fontSize:10, color:'#3f3f46', marginTop:1 }}>{t.desc}</div>}
                      </div>
                      {isSuperAdmin && (
                        <button onClick={()=>handleDeleteTitle(t.id)}
                          style={{ padding:'2px 8px', borderRadius:5, fontSize:9, fontWeight:800, cursor:'pointer',
                            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                  {titles.length===0 && <div style={{ fontSize:12, color:'#27272a', textAlign:'center', padding:'14px 0' }}>Chưa có danh hiệu</div>}
                </div>
              </div>
            )}

            {/* ─── Season reset ─── */}
            {aTab === 'season' && (
              <div>
                <div style={{ padding:14, background:'rgba(251,191,36,0.04)', borderRadius:10,
                  border:'1px solid rgba(251,191,36,0.18)', marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:900, color:'#fbbf24', marginBottom:5 }}>⚠ Reset Kỳ Học</div>
                  <div style={{ fontSize:12, color:'#71717a', lineHeight:1.6 }}>
                    Thao tác này sẽ <strong style={{color:'#fcd34d'}}>lưu snapshot toàn bộ điểm + danh hiệu</strong> kỳ hiện tại,
                    sau đó <strong style={{color:'#fca5a5'}}>reset điểm về 0 và xóa danh hiệu đã trao</strong>. Không thể hoàn tác.
                  </div>
                </div>
                <input value={seasonName} onChange={e=>setSeasonName(e.target.value)}
                  placeholder="Tên kỳ học (vd: Kỳ I 2024-2025)…"
                  style={{ ...inputSt, marginBottom:10 }} />
                {!confirmReset ? (
                  <button onClick={()=>seasonName.trim()&&setConfirmReset(true)} style={{
                    width:'100%', padding:'10px', borderRadius:8, fontSize:12, fontWeight:800, cursor:'pointer',
                    background: seasonName.trim() ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                    border:`1px solid ${seasonName.trim() ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.05)'}`,
                    color: seasonName.trim() ? '#f87171' : '#27272a',
                  }}>Lưu Snapshot & Reset Kỳ</button>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>setConfirmReset(false)}
                      style={{ flex:1, padding:'10px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid #27272a', color:'#71717a', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                      Huỷ
                    </button>
                    <button onClick={handleResetSeason}
                      style={{ flex:2, padding:'10px', borderRadius:8, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.45)', color:'#f87171', fontSize:12, fontWeight:900, cursor:'pointer' }}>
                      ✓ Xác nhận Reset
                    </button>
                  </div>
                )}
                {seasons.length > 0 && (
                  <div style={{ marginTop:18 }}>
                    <div style={{ fontSize:10, color:'#3f3f46', fontWeight:800, letterSpacing:'0.06em', marginBottom:7, textTransform:'uppercase' }}>Các kỳ đã lưu</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {seasons.map(s => (
                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize:13 }}>📅</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:'#d4d4d8' }}>{s.name}</div>
                            <div style={{ fontSize:10, color:'#3f3f46' }}>{new Date(s.createdAt).toLocaleDateString('vi-VN')} · {s.createdBy}</div>
                          </div>
                          <div style={{ fontSize:10, color:'#52525b' }}>
                            {Object.keys(s.snapshot||{}).length} thành viên
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
