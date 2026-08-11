import Modal from '../Modal';

type AlertVariant = 'success' | 'error' | 'info';

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  /** 표시할 메시지. 예: "저장되었습니다.", "비밀번호가 일치하지 않습니다.", "수정되었습니다." */
  message: string;
  /** 지정 안 하면 variant에 맞는 기본 제목("완료"/"오류"/"알림") 사용 */
  title?: string;
  variant?: AlertVariant;
  confirmLabel?: string;
  /** "확인" 버튼 눌렀을 때 onClose보다 먼저 실행되는 콜백 (예: 저장 성공 후 목록으로 이동) */
  onConfirm?: () => void;
}

const VARIANT_META: Record<AlertVariant, { title: string; }> = {
  success: { title: '완료' },
  error: { title: '오류' },
  info: { title: '알림' },
};

/**
 * 저장/수정 완료, 유효성 검사 실패 등 "확인" 버튼 하나만 있는 단순 알림 모달.
 * 기존 Modal.tsx + .btn 클래스 재사용 (ConfirmDeleteModal.tsx와 동일한 패턴).
 * "확인"으로 닫든, 배경 클릭·ESC로 닫든 상관없이 onConfirm이 실행됩니다
 * (별도 취소 버튼이 없는 알림창이라, 어떻게 닫아도 "확인했다"로 취급).
 *
 * 사용 예:
 *   const [alert, setAlert] = useState<{
 *     message: string;
 *     variant?: 'success' | 'error';
 *     onConfirm?: () => void;
 *   } | null>(null);
 *
 *   // 저장 성공 — 확인 누르면(혹은 배경 클릭/ESC로 닫으면) 목록으로 이동
 *   setAlert({ message: '저장되었습니다.', variant: 'success', onConfirm: goBack });
 *   // 유효성 검사 실패 — 확인 누르면 그냥 닫히고 폼에 그대로 남음 (onConfirm 생략)
 *   setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
 *
 *   <AlertModal
 *     open={alert !== null}
 *     onClose={() => setAlert(null)}
 *     onConfirm={alert?.onConfirm}
 *     message={alert?.message ?? ''}
 *     variant={alert?.variant}
 *   />
 */
export default function AlertModal({
  open,
  onClose,
  message,
  title,
  variant = 'info',
  confirmLabel = '확인',
  onConfirm,
}: AlertModalProps) {
  const meta = VARIANT_META[variant];

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleConfirm}
      titleId="alertModalTitle"
      title={title ?? meta.title}
      footer={
        <button type="button" className="btn btn_md btn_primary" onClick={handleConfirm}>
          {confirmLabel}
        </button>
      }
    >
      <div style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            fontSize: 13,
            color: 'var(--text)',
      }}>
        {message}
      </div>
    </Modal>
  );
}