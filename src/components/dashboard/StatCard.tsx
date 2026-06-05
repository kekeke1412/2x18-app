import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function StatCard({ icon: Icon, label, value, sub, color, valueClass, to, navState }: any) {
  const colors: any = {
    green: 'bg-green-500/10 text-green-400',
    blue: 'bg-blue-500/10  text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-red-500/10   text-red-400',
  };

  const content = (
    <>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className={`text-2xl font-black ${valueClass || 'text-white'}`}>{value}</div>
        <div className="text-[10px] text-gray-600">{sub}</div>
      </div>
    </>
  );

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.9 },
        show: { opacity: 1, scale: 1 }
      }}
      className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden shadow-sm hover:border-gray-700 transition-all"
    >
      {to ? (
        <Link to={to} state={navState} className="flex items-center gap-4 p-4 hover:bg-[#222] transition-colors w-full h-full">
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-4 p-4">
          {content}
        </div>
      )}
    </motion.div>
  );
}
