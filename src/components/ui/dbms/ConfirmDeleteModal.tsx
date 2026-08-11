import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  /** 삭제 함수 실행 시 입력한 비밀번호(pw)를 함께 전달합니다. */
  onConfirm: (pw?: string) => void;
  /** 삭제 대상 표시용 (예: "2026-08-03(수) 서버 점검 안내") */
  targetLabel?: string;
  title?: string;
  description?: string;
  loading?: boolean;
  /** 🔑 비밀번호 입력 영역 표시 및 필수 여부 (기본값: false) */
  requirePassword?: boolean;
}

/**
 * 삭제 버튼 클릭 시 공용으로 띄우는 확인 모달. 기존 Modal.tsx + .btn 클래스 재사용.
 * 사용 예 (기본):
 * <ConfirmDeleteModal
 *    open={deleteTarget !== null}
 *    onClose={() => setDeleteTarget(null)}
 *    onConfirm={handleDelete} // 비밀번호 없이 실행
 *    targetLabel={deleteTarget?.title}
 *  />
 * 
 * <ConfirmDeleteModal
 *    open={deleteTarget !== null}
 *    onClose={() => setDeleteTarget(null)}
 *    onConfirm={(pw) => handleDeleteWithPw(pw)} // 비밀번호가 넘어옴
 *    targetLabel={deleteTarget?.title}
 *    requirePassword={true} // 👈 비밀번호 입력창 표시
 * />
 * 
 */
export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  targetLabel,
  title = '삭제하시겠습니까?',
  description = '삭제한 데이터는 복구할 수 없습니다.',
  loading = false,
  requirePassword = false, // 비밀번호 없음(false)
}: ConfirmDeleteModalProps) {
  const [pw, setPw] = useState('');
  // 모달이 닫히거나 열릴 때 비밀번호 초기화
  useEffect(() => {
    if (!open) {
      setPw('');
    }
  }, [open]);

  // requirePassword 옵션에 따른 기본 안내 문구 설정
  const defaultDescription = requirePassword
    ? '삭제를 위해 비밀번호를 입력해 주세요.'
    : '삭제한 데이터는 복구할 수 없습니다.';

  // 삭제 버튼 클릭
  const handleConfirm = () => {
    if (requirePassword && !pw.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    onConfirm(pw);
  };

  // 버튼 비활성화 조건 (로딩 중이거나, 비밀번호가 필요한데 비어있는 경우)
  const isConfirmDisabled = loading || (requirePassword && !pw.trim());

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
          <button
            type="button"
            className="btn btn_md btn_danger"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </>
      }
    >
      <p className="b_title">{description || defaultDescription}</p>
      
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

      {/* 🔑 requirePassword가 true일 때만 비밀번호 입력창 표시 */}
      {requirePassword && (
        <div style={{ marginTop: 16 }}>
          <input
            type="password"
            className="form_input"
            placeholder="비밀번호 입력"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isConfirmDisabled) {
                handleConfirm();
              }
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid var(--border, #ccc)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </Modal>
  );
}
