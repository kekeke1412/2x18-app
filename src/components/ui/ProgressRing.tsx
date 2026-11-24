import React, { useEffect, useRef } from 'react';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  label: string;
  valueText?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 48,
  thickness = 5,
  color = 'var(--google-blue)',
  trackColor = 'var(--bg-subtle)',
  label,
  valueText,
  children,
  className = '',
}: ProgressRingProps) {
  const progressRef = useRef<HTMLProgressElement | null>(null);
  const safeMax = max > 0 ? max : 100;
  const pct = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  useEffect(() => {
    const progress = progressRef.current;
    if (!progress) return;

    // Fallback for browsers without CSS attr(value type(<number>)) support
    const supportsTypedAttr =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('width: attr(value type(<number>))');

    if (!supportsTypedAttr) {
      progress.style.setProperty('--value', String(pct));
      const observer = new MutationObserver(() => {
        progress.style.setProperty('--value', progress.getAttribute('value') || '0');
      });
      observer.observe(progress, {
        attributes: true,
        attributeFilter: ['value'],
      });
      return () => observer.disconnect();
    }
  }, [pct]);

  return (
    <div className={`progress-ring-wrapper ${className}`}>
      <progress
        ref={progressRef}
        value={pct}
        max={100}
        aria-label={label}
        aria-valuetext={valueText || `${pct}%`}
        className="progress-ring"
        style={
          {
            '--size': `${size}px`,
            '--thickness': `${thickness}px`,
            '--fill-color': pct >= 100 ? 'var(--google-green)' : color,
            '--track-color': trackColor,
            '--value': pct,
          } as React.CSSProperties
        }
      />
      {children !== undefined && (
        <div className="progress-ring-content" aria-hidden="true">
          {children}
        </div>
      )}
    </div>
  );
}

export default ProgressRing;
