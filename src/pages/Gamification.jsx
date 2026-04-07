// src/pages/Gamification.jsx
// ── "Chiến Tích & Huy Hiệu" — tên gamification hay hơn "Vinh danh" ──────────
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function Gamification() {
  // ── FIX: contributions đọc trực tiếp từ Context state
  // → khi ADD_CONTRIBUTION dispatch, component này re-render ngay ──────────────
  const { members, contributions, currentUser } = useApp();
  const [tab, setTab] = useState('leaderboard');

  // Tính bảng xếp hạng từ contributions trong Context
  const ranked = useMemo(() => {
    return [...members]
      .map(m => ({
        ...m,
        // ── FIX: ép kiểu Number để không bị cộng string ──
        points: Number(contributions[m.id]) || 0,
      }))
      .sort((a, b) => b.points - a.points);
  }, [members, contributions]);

  const myRank   = ranked.findIndex(m => m.id === currentUser?.id) + 1;
  // ── FIX: luôn đọc từ contributions[currentUser.id] mới nhất ──
  const myPoints = Number(contributions[currentUser?.id]) || 0;

  const badgeFor = pts => {
    if (pts >= 500) return { icon:'🏆', label:'Truyền Nhân', color:'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    if (pts >= 350) return { icon:'💎', label:'Cốt Cán',    color:'text-blue-400   bg-blue-500/10   border-blue-500/30'   };
    if (pts >= 200) return { icon:'⭐', label:'Năng Nổ',     color:'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    if (pts >= 100) return { icon:'🔥', label:'Đang Lên',    color:'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    return                { icon:'🌱', label:'Khởi Đầu',   color:'text-green-400  bg-green-500/10  border-green-500/30'  };
  };

  const medalColor = i => ['text-yellow-400', 'text-gray-300', 'text-amber-600'][i] || 'text-gray-600';

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              🏅 Chiến Tích & Huy Hiệu
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Bảng vàng đóng góp nhóm 2X18 · Cập nhật realtime
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
            {[['leaderboard','Bảng vàng'],['badges','Huy hiệu'],['how','Cách tính']].map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${tab === v ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* My badge card — hiển thị điểm live */}
        <div className="mb-5 bg-gradient-to-br from-blue-900/30 via-[#1a1a1a] to-[#1a1a1a] border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Điểm cống hiến của bạn</div>
            {/* ── FIX: điểm này luôn sync với Context state ── */}
            <div className="text-4xl font-black text-blue-400 mt-1">{myPoints}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Hạng #{myRank > 0 ? myRank : '—'} / {members.length} thành viên
            </div>
          </div>
          {(() => {
            const b = badgeFor(myPoints);
            return (
              <div className={`flex flex-col items-center px-5 py-3 rounded-2xl border ${b.color}`}>
                <span className="text-3xl">{b.icon}</span>
                <span className="text-xs font-bold mt-1">{b.label}</span>
              </div>
            );
          })()}
        </div>

        {/* ── Leaderboard ── */}
        {tab === 'leaderboard' && (
          <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
            {/* Top 3 highlight */}
            {ranked.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 p-5 border-b border-gray-800/60 bg-[#1e1e1e]">
                {[ranked[1], ranked[0], ranked[2]].map((m, i) => {
                  if (!m) return <div key={i}/>;
                  const b      = badgeFor(m.points);
                  const isMe   = m.id === currentUser?.id;
                  const podium = [1, 0, 2][i]; // vị trí thật: 2nd, 1st, 3rd
                  const medals = ['🥈','🥇','🥉'];
                  const heights = ['h-16','h-20','h-14'];
                  return (
                    <div key={m.id} className={`flex flex-col items-center gap-2 ${i === 1 ? '-mt-2' : ''}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                        isMe ? 'bg-blue-600/30 border-blue-400 text-blue-300' : 'bg-[#252525] border-gray-700 text-gray-300'
                      }`}>
                        {m.avatar}
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-bold ${isMe ? 'text-blue-300' : 'text-gray-200'}`}>
                          {m.fullName.split(' ').pop()}
                        </div>
                        <div className="text-lg font-black text-blue-400">{m.points}</div>
                      </div>
                      <div className={`w-full ${heights[i]} bg-gradient-to-t rounded-t-xl flex items-end justify-center pb-1 ${
                        podium === 0 ? 'from-yellow-500/30 to-yellow-400/10' :
                        podium === 1 ? 'from-gray-400/20 to-gray-300/5' :
                        'from-amber-600/20 to-amber-500/5'
                      }`}>
                        <span className="text-lg">{medals[i]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="divide-y divide-gray-800/40">
              {ranked.map((m, i) => {
                const b    = badgeFor(m.points);
                const isMe = m.id === currentUser?.id;
                return (
                  <div key={m.id} className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                    isMe ? 'bg-blue-500/5' : 'hover:bg-[#1e1e1e]'
                  }`}>
                    <div className={`text-sm font-black w-7 text-center shrink-0 ${medalColor(i)}`}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isMe ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'bg-[#252525] text-gray-400'
                    }`}>
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${isMe ? 'text-blue-300' : 'text-gray-200'}`}>
                        {m.fullName}
                        {isMe && <span className="text-[10px] text-blue-400 ml-1">(bạn)</span>}
                      </div>
                      <div className="text-[10px] text-gray-600">{m.role} · {m.mssv}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${b.color}`}>
                        {b.icon} {b.label}
                      </span>
                      <span className="text-base font-black text-blue-400 min-w-[40px] text-right">
                        {m.points}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Badges ── */}
        {tab === 'badges' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon:'🏆', label:'Truyền Nhân', req:500,  desc:'Đạt 500+ điểm cống hiến — bậc cao nhất' },
              { icon:'💎', label:'Cốt Cán',    req:350,  desc:'Đạt 350+ điểm — Luôn tích cực, đáng tin' },
              { icon:'⭐', label:'Năng Nổ',     req:200,  desc:'Đạt 200+ điểm — Thường xuyên đóng góp' },
              { icon:'🔥', label:'Đang Lên',    req:100,  desc:'Đạt 100+ điểm — Bắt đầu tỏa sáng' },
              { icon:'🌱', label:'Khởi Đầu',   req:0,    desc:'Thành viên mới, bắt đầu hành trình' },
              { icon:'📚', label:'Thủ Thư',     req:null, desc:'Upload 5+ tài liệu được đánh giá tốt' },
              { icon:'⏰', label:'Đúng Giờ',    req:null, desc:'Điểm danh đầy đủ 10 buổi liên tiếp' },
              { icon:'🎯', label:'Mục Tiêu',   req:null, desc:'Hoàn thành 100% task trong 1 tháng' },
            ].map(b => {
              const earned = b.req !== null ? myPoints >= b.req : false;
              return (
                <div key={b.label} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  earned
                    ? 'border-yellow-500/25 bg-yellow-500/5 shadow-sm'
                    : 'border-gray-800/40 bg-[#1a1a1a] opacity-50'
                }`}>
                  <span className="text-3xl shrink-0">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${earned ? 'text-yellow-400' : 'text-gray-500'}`}>{b.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{b.desc}</div>
                    {b.req !== null && !earned && (
                      <div className="text-[10px] text-gray-600 mt-1">
                        Cần thêm <strong className="text-gray-400">{b.req - myPoints}</strong> điểm
                        <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden w-24">
                          <div className="h-full bg-blue-500/40 rounded-full" style={{ width: `${Math.min(100, myPoints / b.req * 100)}%` }}/>
                        </div>
                      </div>
                    )}
                  </div>
                  {earned && <span className="badge badge-green shrink-0">Đạt được</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Cách tính điểm ── */}
        {tab === 'how' && (
          <div className="space-y-3 max-w-lg">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-sm text-blue-300 leading-relaxed">
              💡 Điểm cống hiến được cộng <strong>tự động realtime</strong> khi bạn thực hiện các hành động dưới đây. Điểm được lưu vào localStorage và đồng bộ trong suốt phiên làm việc.
            </div>
            {[
              { pts:'+20', action:'Upload tài liệu mới cho nhóm',          icon:'📄' },
              { pts:'+30', action:'Tài liệu được ai đó đánh giá 5 sao',   icon:'⭐' },
              { pts:'+10', action:'Điểm danh buổi họp SME (1 lần/buổi)',  icon:'✅' },
              { pts:'+15', action:'Hoàn thành task đúng hạn',             icon:'⏰' },
              { pts:'+30', action:'Tiến độ môn học đạt 100%',            icon:'📈' },
              { pts:'+5',  action:'Tham gia bình chọn nhóm',              icon:'🗳️' },
              { pts:'+100',action:'Tổ chức buổi học nhóm thành công',     icon:'🎓' },
            ].map(r => (
              <div key={r.action}
                className="flex items-center gap-4 p-4 bg-[#1a1a1a] border border-gray-800/60 rounded-xl hover:border-gray-700 transition-colors">
                <span className="text-2xl shrink-0">{r.icon}</span>
                <div className="flex-1 text-sm text-gray-300">{r.action}</div>
                <span className="text-green-400 font-black text-sm shrink-0">{r.pts}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
