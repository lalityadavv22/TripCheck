import { useEffect, useRef } from 'react';

/** Keyboard dismissal, focus trap, scroll lock, and focus restoration for dialogs. */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select, textarea, a[href], [tabindex="0"]'
        ) || []
      ).filter((el) => el.getClientRects().length);
    const timer = window.setTimeout(
      () =>
        (
          ref.current?.querySelector<HTMLElement>('[data-autofocus]') ||
          focusable()[0]
        )?.focus(),
      30
    );
    const keydown = (event: KeyboardEvent) => {
      // Only the topmost open dialog should handle the keyboard.
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (ref.current && dialogs[dialogs.length - 1] !== ref.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !ref.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [open]);
  return ref;
}
