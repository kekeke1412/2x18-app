import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const Section = ({ icon: Icon, title, children, defaultOpen = true, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden mb-4"
    >
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-[#1e1e1e] hover:bg-[#222] transition-colors text-left">
        <Icon className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm font-bold text-gray-300 flex-1">{title}</span>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/20">{badge}</span>}
        {open ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800/60 overflow-hidden"
          >
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
