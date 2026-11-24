import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useOptionalApp } from '../context/AppContext';
import { getInitials } from '../utils/stringUtils';

interface UserAvatarProps {
  user?: any;
  size?: number | string;
  className?: string;
  isMe?: boolean;
  onClick?: (e: any) => void;
}

export default function UserAvatar({ user, size = 32, className = '', isMe = false, onClick }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const app: any = useOptionalApp();
  const imgFailed = Boolean(user?.avatarUrl && failedUrl === user.avatarUrl);

  const isPx = typeof size === 'number';
  const sizeClass = isPx ? '' : size;
  const style = isPx ? { width: size, height: size } : {};

  const rawName = user?.fullName || user?.name || '';
  const initials = user?.avatar || (rawName ? getInitials(rawName) : '?');

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

  const isInteractive = Boolean(!onClick && app?.setSelectedProfileUser && user);
  const interactiveClass = isInteractive ? 'cursor-pointer hover:opacity-80 transition-all' : '';

  if (user?.avatarUrl && !imgFailed) {
    return (
      <img
        src={user.avatarUrl}
        alt={user?.fullName || 'User'}
        style={style}
        className={`${containerClass} object-cover ${interactiveClass}`}
        onClick={handleClick}
        onError={() => setFailedUrl(user.avatarUrl)}
      />
    );
  }

  return (
    <div
      style={style}
      className={`${containerClass} bg-[#1a1a1a] text-gray-400 font-bold ${isInteractive ? 'cursor-pointer hover:bg-[#252525] transition-colors' : ''}`}
      onClick={handleClick}
    >
      <span style={isPx ? { fontSize: Math.max(10, Number(size) * 0.38) } : {}}>
        {initials === '?' ? <User className="w-1/2 h-1/2" /> : initials}
      </span>
    </div>
  );
}
