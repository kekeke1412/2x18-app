import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

function readStoredScheme(): ColorSchemePreference {
  try {
    const val = localStorage.getItem('color-scheme');
    if (val === 'light' || val === 'dark') return val;
  } catch {
    // Ignore storage access errors
  }
  return 'system';
}

function getSystemScheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function applyColorScheme(pref: ColorSchemePreference) {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'color-scheme';
    document.head.appendChild(meta);
  }

  if (pref === 'system') {
    meta.content = 'light dark';
    delete document.documentElement.dataset.theme;
    try {
      localStorage.removeItem('color-scheme');
    } catch {
      // Ignore
    }
  } else {
    meta.content = pref;
    document.documentElement.dataset.theme = pref;
    try {
      localStorage.setItem('color-scheme', pref);
    } catch {
      // Ignore
    }
  }
}

export function useColorScheme() {
  const [preference, setPreference] = useState<ColorSchemePreference>(() => readStoredScheme());
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(() => getSystemScheme());

  useEffect(() => {
    applyColorScheme(preference);
  }, [preference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme' || e.key === null) {
        const next = readStoredScheme();
        setPreference(next);
        applyColorScheme(next);
      }
    };
    window.addEventListener('storage', handleStorage);

    if (typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMedia = (ev: MediaQueryListEvent) => {
        setSystemScheme(ev.matches ? 'dark' : 'light');
      };
      mql.addEventListener?.('change', handleMedia);
      return () => {
        window.removeEventListener('storage', handleStorage);
        mql.removeEventListener?.('change', handleMedia);
      };
    }

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system' ? systemScheme : preference;

  // Two-state quick toggle per dark-mode-toggle guide:
  // Target = opposite of currently rendered scheme. If target matches current system preference, remove stored value.
  const toggleOpposite = () => {
    const target: 'light' | 'dark' = resolvedScheme === 'dark' ? 'light' : 'dark';
    const currentSys = getSystemScheme();
    if (target === currentSys) {
      setPreference('system');
      applyColorScheme('system');
    } else {
      setPreference(target);
      applyColorScheme(target);
    }
  };

  return {
    preference,
    resolvedScheme,
    systemScheme,
    setPreference: (next: ColorSchemePreference) => {
      setPreference(next);
      applyColorScheme(next);
    },
    toggleOpposite,
  };
}

export function ThemeToggle({
  mode = 'compact',
  className = '',
}: {
  mode?: 'compact' | 'segmented';
  className?: string;
}) {
  const { preference, resolvedScheme, systemScheme, setPreference, toggleOpposite } =
    useColorScheme();

  if (mode === 'segmented') {
    const options: { id: ColorSchemePreference; label: string; icon: any }[] = [
      { id: 'light', label: 'Sáng', icon: Sun },
      { id: 'dark', label: 'Tối', icon: Moon },
      {
        id: 'system',
        label: `Hệ thống (${systemScheme === 'dark' ? 'Tối' : 'Sáng'})`,
        icon: Monitor,
      },
    ];
    return (
      <div
        role="group"
        aria-label="Chế độ giao diện Sáng / Tối"
        className={`grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)] ${className}`}
      >
        {options.map(opt => {
          const Icon = opt.icon;
          const active = preference === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPreference(opt.id)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all spring-press min-h-[40px] ${
                active
                  ? 'bg-[#4285F4] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleOpposite}
      aria-label={
        resolvedScheme === 'dark'
          ? 'Chuyển sang giao diện Sáng'
          : 'Chuyển sang giao diện Tối'
      }
      title={
        preference === 'system'
          ? `Giao diện theo hệ thống (${resolvedScheme === 'dark' ? 'Tối' : 'Sáng'}) — Bấm để đổi`
          : `Giao diện ${resolvedScheme === 'dark' ? 'Tối' : 'Sáng'} — Bấm để đổi`
      }
      className={`min-w-[40px] min-h-[40px] p-2 rounded-xl flex items-center justify-center bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#4285F4]/50 transition-all spring-press ${className}`}
    >
      {resolvedScheme === 'dark' ? (
        <Sun className="w-4 h-4 text-[#FBBC05]" />
      ) : (
        <Moon className="w-4 h-4 text-[#4285F4]" />
      )}
    </button>
  );
}

export default ThemeToggle;
