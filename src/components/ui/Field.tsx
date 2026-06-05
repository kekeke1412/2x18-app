import React from 'react';
import { toDisplay } from '../../utils/stringUtils';

export const Field = ({ label, value, onChange, type = 'text', options, disabled, required, hint }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
      {label}
      {required && !disabled && <span className="text-red-400">*</span>}
    </label>
    {options ? (
      <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={`text-sm px-3 py-2 rounded-xl outline-none transition-all
          ${disabled ? 'bg-transparent text-gray-300 border-transparent cursor-default'
            : 'bg-[#252525] border border-gray-700 text-white focus:border-blue-500'}`}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : type === 'date' ? (
      disabled
        ? <div className="text-sm px-3 py-2 text-gray-300">{toDisplay(value)}</div>
        : <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
          className="text-sm px-3 py-2 rounded-xl outline-none bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30" />
    ) : (
      <input type={type} value={value || ''} onChange={onChange ? e => onChange(e.target.value) : undefined} disabled={disabled}
        className={`text-sm px-3 py-2 rounded-xl outline-none transition-all
          ${disabled ? 'bg-transparent text-gray-300 border-transparent cursor-default'
            : 'bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'}`} />
    )}
    {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
  </div>
);
