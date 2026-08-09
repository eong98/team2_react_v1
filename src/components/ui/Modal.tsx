import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

function focusableEls(modal: HTMLElement) {
  return Array.from(
    modal.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  );
}

export default function Modal({ open, onClose, titleId, title, children, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const modal = modalRef.current;
    if (modal) {
      const targets = focusableEls(modal);
      (targets[0] || modal).focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !modal) return;
      const targets = focusableEls(modal);
      if (targets.length === 0) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      lastFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal_bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={modalRef}>
        <h3 id={titleId} className='title sm'>{title}</h3>
        {children}
        <div className="modal_foot">{footer}</div>
      </div>
    </div>
  );
}
