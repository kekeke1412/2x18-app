// @ts-nocheck
import React from 'react';
import { User } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Shared User Avatar component to ensure consistency across the app.
 * @param {Object} props
 * @param {Object} props.user - The user object (member)
 * @param {number|string} props.size - Size in pixels or tailwind class
 * @param {string} props.className - Additional tailwind classes
 * @param {boolean} props.isMe - Whether this is the current user (for border highlight)
 * @param {function} props.onClick - Optional custom click handler
 */
interface UserAvatarProps {
  user?: any;
  size?: number | string;
  className?: string;
  isMe?: boolean;
  onClick?: (e: any) => void;
}

export default function UserAvatar({ user, size = 32, className = "", isMe = false, onClick }: UserAvatarProps) {
  let app;
  try {
    app = useApp();
  } catch (e) {
    // If used outside AppProvider, just ignore
  }

  const isPx = typeof size === 'number';
  const sizeClass = isPx ? "" : size;
  const style = isPx ? { width: size, height: size } : {};
  
  const initials = user?.avatar || user?.fullName?.[0] || user?.name?.[0] || "?";
  
  const containerClass = `rounded-full flex items-center justify-center shrink-0 overflow-hidden border ${
    isMe ? 'border-blue-500/50' : 'border-gray-800/60'
  } ${className} ${sizeClass}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    } else if (app?.setSelectedProfileUser && user) {
      e.stopPropagation();
      app.setSelectedProfileUser(user);
    }
  };

  const interactiveClass = (!onClick && app?.setSelectedProfileUser && user) ? 'cursor-pointer hover:opacity-80 transition-all' : '';

  if (user?.avatarUrl) {
    return (
      <img 
        src={user.avatarUrl} 
        alt={user?.fullName || "User"} 
        style={style}
        className={`${containerClass} object-cover ${interactiveClass}`}
        onClick={handleClick}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div 
      style={style}
      className={`${containerClass} bg-[#1a1a1a] text-gray-500 font-bold ${!onClick && app?.setSelectedProfileUser && user ? 'cursor-pointer hover:bg-[#252525] transition-colors' : ''}`}
      onClick={handleClick}
    >
      <span style={isPx ? { fontSize: size * 0.4 } : {}}>
        {initials === "?" ? <User className="w-1/2 h-1/2" /> : initials}
      </span>
    </div>
  );
}

