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
  const onCloseRef = useRef(onClose);

  // onClose가 매 렌더마다 새로 생성돼도, ref로만 최신값을 참조하고
  // effect 재실행 트리거로는 안 쓰이게 분리
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 모달이 열릴 때 딱 한 번만: 이전 포커스 저장 + 첫 요소로 포커스 이동
  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const modal = modalRef.current;
    if (modal) {
      const targets = focusableEls(modal);
      (targets[0] || modal).focus();
    }
  }, [open]); // onClose 제거 — open이 바뀔 때만 실행

  // 키보드 핸들러(ESC/Tab 트랩)는 open 상태에서만 등록, onClose는 ref로 참조
  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
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
    };
  }, [open]);

  // 모달이 닫힐 때 이전 포커스로 복원 (open이 false로 바뀌는 시점)
  useEffect(() => {
    if (open) return;
    lastFocused.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal_bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={modalRef}>
        <h3 id={titleId} className='title md'>{title}</h3>
        {children}
        <div className="modal_foot">{footer}</div>
      </div>
    </div>
  );
}
