import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function StatCard({ icon: Icon, label, value, sub, color, valueClass, to, navState }: any) {
  const palette: Record<string, { badge: string; dot: string }> = {
    blue: {
      badge: 'bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/25',
      dot: 'bg-[#4285F4]',
    },
    green: {
      badge: 'bg-[#34A853]/15 text-[#34A853] border border-[#34A853]/25',
      dot: 'bg-[#34A853]',
    },
    yellow: {
      badge: 'bg-[#FBBC05]/20 text-[var(--semantic-yellow-text)] border border-[#FBBC05]/35',
      dot: 'bg-[#FBBC05]',
    },
    purple: {
      badge: 'bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/25',
      dot: 'bg-[#4285F4]',
    },
    red: {
      badge: 'bg-[#EA4335]/15 text-[#EA4335] border border-[#EA4335]/25',
      dot: 'bg-[#EA4335]',
    },
  };

  const theme = palette[color] || palette.blue;

  const content = (
    <>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${theme.badge}`}>
        <Icon className="w-5 h-5" strokeWidth={1.85} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} aria-hidden="true" />
          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate">
            {label}
          </span>
        </div>
        <div className={`text-2xl font-black tabular-nums leading-tight mt-0.5 ${valueClass || 'text-[var(--text-primary)]'}`}>
          {value}
        </div>
        <div className="text-[11px] font-medium text-[var(--text-muted)] truncate">{sub}</div>
      </div>
    </>
  );

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.96 },
        show: { opacity: 1, scale: 1 },
      }}
      className="glass card-hover spring-press overflow-hidden"
    >
      {to ? (
        <Link
          to={to}
          state={navState}
          className="flex items-center gap-3.5 p-4 hover:bg-[var(--bg-subtle)]/50 transition-colors w-full h-full min-h-[84px]"
        >
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-3.5 p-4 min-h-[84px]">{content}</div>
      )}
    </motion.div>
  );
}
