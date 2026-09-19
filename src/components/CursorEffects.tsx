import { useEffect, useRef } from 'react';

/** Decorative only: preserve the OS cursor and never intercept a click. */
export function CursorEffects({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    const media = matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
    );
    let frame = 0;
    let x = 0;
    let y = 0;
    const hide = () => {
      element.dataset.visible = 'false';
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') {
        hide();
        return;
      }
      x = event.clientX;
      y = event.clientY;
      const target = event.target instanceof Element ? event.target : null;
      element.dataset.interactive = String(
        !!target?.closest(
          'a,button:not(:disabled),input,select,textarea,[role="button"],[role="checkbox"]'
        )
      );
      element.dataset.visible = 'true';
      if (!frame)
        frame = requestAnimationFrame(() => {
          element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          frame = 0;
        });
    };
    const down = () => {
      element.dataset.pressed = 'true';
    };
    const up = () => {
      element.dataset.pressed = 'false';
    };
    const leave = (e: PointerEvent) => {
      if (!e.relatedTarget) hide();
    };
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Tab') hide();
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointerout', leave, { passive: true });
    document.addEventListener('keydown', keyboard);
    window.addEventListener('blur', hide);
    media.addEventListener('change', hide);
    return () => {
      hide();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('keydown', keyboard);
      window.removeEventListener('blur', hide);
      media.removeEventListener('change', hide);
    };
  }, [enabled]);
  return enabled ? (
    <div
      ref={ref}
      className="cursor-aura"
      aria-hidden="true"
      data-visible="false"
    >
      <span />
    </div>
  ) : null;
}
