import Modal from '../../ui/Modal';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** 삭제 대상 표시용 (예: "2026-08-03(수) 서버 점검 안내") */
  targetLabel?: string;
  title?: string;
  description?: string;
  loading?: boolean;
}

/**
 * 삭제 버튼 클릭 시 공용으로 띄우는 확인 모달. 기존 Modal.tsx + .btn 클래스 재사용.
 * 사용 예:
 *   <ConfirmDeleteModal
 *     open={deleteTarget !== null}
 *     onClose={() => setDeleteTarget(null)}
 *     onConfirm={handleDelete}
 *     targetLabel={deleteTarget?.title}
 *   />
 */
export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  targetLabel,
  title = '삭제하시겠습니까?',
  description = '삭제한 데이터는 복구할 수 없습니다.',
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="confirmDeleteTitle"
      title={title}
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_danger" onClick={onConfirm} disabled={loading}>
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </>
      }
    >
      <p className="b_sm">{description}</p>
      {targetLabel && (
        <div
          style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            fontSize: 13,
            color: 'var(--text)',
          }}
        >
          {targetLabel}
        </div>
      )}
    </Modal>
  );
}
