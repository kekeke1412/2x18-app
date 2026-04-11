// src/pages/Trash.jsx
import React, { useState } from 'react';
import {
  Trash2, RotateCcw, ShieldAlert, ClipboardList, FileText,
  Calendar, BookOpen, Map, AlertTriangle, X, CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// Type metadata
const TYPE_META = {
  task:             { label:'Task',           Icon:ClipboardList, color:'text-blue-400',  bg:'bg-blue-500/10' },
  doc:              { label:'Tài liệu',       Icon:FileText,      color:'text-yellow-400',bg:'bg-yellow-500/10' },
  event:            { label:'Sự kiện lịch',   Icon:Calendar,      color:'text-purple-400',bg:'bg-purple-500/10' },
  subjectTask:      { label:'Checklist môn',  Icon:BookOpen,      color:'text-green-400', bg:'bg-green-500/10' },
  roadmapEvent:     { label:'Lộ trình',       Icon:Map,           color:'text-orange-400',bg:'bg-orange-500/10' },
  attendanceSession:{ label:'Buổi họp nhóm', Icon:Calendar,      color:'text-cyan-400',  bg:'bg-cyan-500/10'  },
  vote:             { label:'Bình chọn',      Icon:ClipboardList, color:'text-pink-400',  bg:'bg-pink-500/10'  },
};

function getItemName(item) {
  switch (item.type) {
    case 'task':              return item.data?.task          || '(Không tên)';
    case 'doc':               return item.data?.name         || '(Không tên)';
    case 'event':             return item.data?.title        || '(Không tên)';
    case 'subjectTask':       return item.data?.title        || '(Không tên)';
    case 'roadmapEvent':      return item.data?.title        || '(Không tên)';
    case 'vote':              return item.data?.title        || '(Không tên)';
    case 'attendanceSession': return item.data?.sessionTitle || '(Không tên)';
    default:                  return '(Mục không rõ)';
  }
}

function getItemSub(item) {
  switch (item.type) {
    case 'task':              return item.data?.code ? `Môn: ${item.data.code}` : '';
    case 'doc':               return item.data?.type ? `Loại: ${item.data.type}` : '';
    case 'event':             return item.data?.date ? `Ngày: ${item.data.date}` : '';
    case 'subjectTask':       return item.meta?.subjectId ? `Môn: ${item.meta.subjectId}` : '';
    case 'roadmapEvent':      return item.meta?.year ? `Năm: ${item.meta.year}` : '';
    case 'vote':              return item.data?.creator ? `Tạo bởi: ${item.data.creator}` : '';
    case 'attendanceSession': return item.data?.date ? `Ngày họp: ${item.data.date}` : '';
    default:                  return '';
  }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
}

// ── Confirm Modal ──────────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-xs shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5"/>
            <div>
              <div className="font-bold text-white text-sm mb-1">Xác nhận</div>
              <p className="text-xs text-gray-400 leading-relaxed">{msg}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">
            Hủy
          </button>
          <button onClick={()=>{onConfirm();onClose();}}
            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trash Item Row ─────────────────────────────────────────────────────────
function TrashRow({ item, onRestore, onDelete }) {
  const meta    = TYPE_META[item.type] || TYPE_META.task;
  const name    = getItemName(item);
  const sub     = getItemSub(item);
  const delDate = formatDate(item.deletedAt);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-800/60 bg-[#1a1a1a] hover:border-gray-700 transition-all group">
        {/* Icon */}
        <div className={`w-9 h-9 ${meta.bg} rounded-xl flex items-center justify-center shrink-0`}>
          <meta.Icon className={`w-4 h-4 ${meta.color}`}/>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${meta.bg} ${meta.color} border-current/20`}>
              {meta.label}
            </span>
            <span className="text-sm font-medium text-gray-200 truncate">{name}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {sub && <span className="text-[10px] text-gray-500">{sub}</span>}
            <span className="text-[10px] text-gray-600">
              Xóa bởi <span className="text-gray-500 font-medium">{item.deletedByName||'Unknown'}</span>
              {delDate && <span> · {delDate}</span>}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={()=>onRestore(item.id)}
            title="Khôi phục"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold transition-colors">
            <RotateCcw className="w-3 h-3"/> Khôi phục
          </button>
          <button onClick={()=>setConfirmDel(true)}
            title="Xóa vĩnh viễn"
            className="p-1.5 text-gray-600 hover:text-red-400 border border-gray-800 hover:border-red-500/30 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {confirmDel && (
        <ConfirmModal
          msg={`Xóa vĩnh viễn "${name}"? Hành động này không thể hoàn tác.`}
          onConfirm={()=>onDelete(item.id)}
          onClose={()=>setConfirmDel(false)}
        />
      )}
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
const ALL_TYPES = ['task','doc','subjectTask','event','roadmapEvent','vote','attendanceSession'];

export default function Trash() {
  const { isCore, trash, restoreFromTrash, permanentDeleteTrash, emptyTrash } = useApp();
  const [filter,       setFilter]       = useState('all');
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  // Guard — chỉ Core truy cập
  if (!isCore) {
    return (
      <div className="h-full bg-[#121212] flex items-center justify-center">
        <div className="text-center p-10">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3"/>
          <h2 className="text-white font-black text-lg mb-1">Không có quyền truy cập</h2>
          <p className="text-gray-500 text-sm">Thùng rác chỉ dành cho Core Team.</p>
        </div>
      </div>
    );
  }

  const items = (trash || []).slice().reverse(); // newest first
  const filtered = filter==='all' ? items : items.filter(i=>i.type===filter);

  const filterTabs = [
    { key:'all', label:'Tất cả', count:items.length },
    ...ALL_TYPES.map(t => ({
      key: t,
      label: TYPE_META[t]?.label || t,
      count: items.filter(i=>i.type===t).length,
    })).filter(t=>t.count>0),
  ];

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400"/> Thùng rác
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} mục · Chỉ Core Team thấy trang này</p>
          </div>
          {items.length > 0 && (
            <button onClick={()=>setConfirmEmpty(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-colors">
              <Trash2 className="w-3.5 h-3.5"/> Dọn sạch thùng rác
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {filterTabs.length > 1 && (
          <div className="flex gap-1 mt-4 overflow-x-auto custom-scrollbar pb-1">
            {filterTabs.map(t=>(
              <button key={t.key} onClick={()=>setFilter(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter===t.key?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300 hover:bg-[#222]'
                }`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter===t.key?'bg-white/20 text-white':'bg-gray-800 text-gray-500'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-gray-700 mb-3"/>
            <p className="text-gray-500 font-medium">Thùng rác trống</p>
            <p className="text-xs text-gray-600 mt-1">Các mục bị xóa sẽ xuất hiện ở đây.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item=>(
              <TrashRow
                key={item.id}
                item={item}
                onRestore={restoreFromTrash}
                onDelete={permanentDeleteTrash}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm empty trash */}
      {confirmEmpty && (
        <ConfirmModal
          msg={`Xóa vĩnh viễn tất cả ${items.length} mục trong thùng rác? Không thể hoàn tác.`}
          onConfirm={emptyTrash}
          onClose={()=>setConfirmEmpty(false)}
        />
      )}
    </div>
  );
}
