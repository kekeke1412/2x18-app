import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { REQUIRED_FIELDS } from '../../constants/profileConstants';

export function ProfileCompletionBanner({ profile, isEditing, onStartEdit }) {
  const missing = REQUIRED_FIELDS.filter(f => {
    const val = f.key === 'mssv' ? (profile.mssv || profile.msv) : profile[f.key];
    return !val || String(val).trim() === '';
  });

  if (missing.length === 0) return null;

  const total = REQUIRED_FIELDS.length;
  const filled = total - missing.length;
  const pct = Math.round((filled / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-5 bg-[#1a1a1a] border border-amber-500/20 rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-bold text-amber-300">Hoàn thiện hồ sơ để mở khóa tính năng</span>
        </div>
        <span className="text-sm font-black text-amber-400">{filled}/{total}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missing.map(f => (
          <span key={f.key}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {f.label}
          </span>
        ))}
      </div>
      {!isEditing && (
        <button onClick={onStartEdit}
          className="mt-3 w-full py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all">
          Điền ngay →
        </button>
      )}
    </motion.div>
  );
}
