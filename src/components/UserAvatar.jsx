import React from 'react';
import { User } from 'lucide-react';

/**
 * Shared User Avatar component to ensure consistency across the app.
 * @param {Object} props
 * @param {Object} props.user - The user object (member)
 * @param {number|string} props.size - Size in pixels or tailwind class
 * @param {string} props.className - Additional tailwind classes
 * @param {boolean} props.isMe - Whether this is the current user (for border highlight)
 */
export default function UserAvatar({ user, size = 32, className = "", isMe = false }) {
  const isPx = typeof size === 'number';
  const sizeClass = isPx ? "" : size;
  const style = isPx ? { width: size, height: size } : {};
  
  const initials = user?.avatar || user?.fullName?.[0] || user?.name?.[0] || "?";
  
  const containerClass = `rounded-full flex items-center justify-center shrink-0 overflow-hidden border ${
    isMe ? 'border-blue-500/50' : 'border-gray-800/60'
  } ${className} ${sizeClass}`;

  if (user?.avatarUrl) {
    return (
      <img 
        src={user.avatarUrl} 
        alt={user?.fullName || "User"} 
        style={style}
        className={`${containerClass} object-cover`}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div 
      style={style}
      className={`${containerClass} bg-[#1a1a1a] text-gray-500 font-bold`}
    >
      <span style={isPx ? { fontSize: size * 0.4 } : {}}>
        {initials === "?" ? <User className="w-1/2 h-1/2" /> : initials}
      </span>
    </div>
  );
}
