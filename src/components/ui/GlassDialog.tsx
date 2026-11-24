import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface GlassDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  variant?: 'modal' | 'sheet';
  maxWidthClass?: string;
  children: React.ReactNode;
}

export function GlassDialog({
  open,
  onClose,
  title,
  subtitle,
  variant = 'modal',
  maxWidthClass = 'max-w-md',
  children,
}: GlassDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Mandatory fallback for browsers without native <dialog closedby="any"> support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    const hasNativeClosedBy =
      typeof HTMLDialogElement !== 'undefined' &&
      'closedBy' in HTMLDialogElement.prototype;

    if (!hasNativeClosedBy) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
      return () => dialog.removeEventListener('click', handleBackdropClick);
    }
  }, [open]);

  const handleNativeClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = '';
    }
    setDragOffsetY(0);
    onClose();
  };

  // Touch drag-to-close for Apple-style bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) {
      setDragOffsetY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffsetY > 90) {
      dialogRef.current?.close();
    } else {
      setDragOffsetY(0);
    }
    dragStartY.current = null;
  };

  if (!open) return null;

  const isSheet = variant === 'sheet';

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as any)}
      aria-labelledby={titleId}
      onClose={handleNativeClose}
      style={
        dragOffsetY > 0
          ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' }
          : undefined
      }
      className={`glass-strong p-0 text-[var(--text-primary)] outline-none ${
        isSheet
          ? 'fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none rounded-t-[28px] rounded-b-none border-b-0 pb-[env(safe-area-inset-bottom,16px)] sm:inset-auto sm:m-auto sm:w-full sm:max-w-md sm:rounded-[26px]'
          : `m-auto w-[calc(100%-1.5rem)] ${maxWidthClass} rounded-[26px]`
      }`}
    >
      {/* Pull handle for mobile bottom sheet */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col items-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing sm:hidden"
      >
        <div className="w-10 h-1.5 rounded-full bg-[var(--border-default)]" />
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-default)]">
        <div className="min-w-0">
          <h1 id={titleId} className="text-base font-extrabold text-[var(--text-primary)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <form method="dialog">
          <button
            type="submit"
            value="cancel"
            aria-label="Đóng hộp thoại"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors spring-press"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="p-5 max-h-[78dvh] overflow-y-auto custom-scrollbar">{children}</div>
    </dialog>
  );
}

export default GlassDialog;
