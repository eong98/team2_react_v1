import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  /** 삭제 함수 실행 시 입력한 비밀번호(pw)를 함께 전달합니다. */
  onConfirm: (pw?: string) => void;
  /** 삭제 대상 표시용 (예: "2026-08-03(수) 서버 점검 안내") */
  targetLabel?: string;
  title?: string;
  /** 지정 안 하면 requirePassword 여부에 따라 자동으로 안내 문구가 바뀝니다. */
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
 */
export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  targetLabel,
  title = '삭제하시겠습니까?',
  description,
  loading = false,
  requirePassword = false,
}: ConfirmDeleteModalProps) {
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const pwInputRef = useRef<HTMLInputElement>(null);

  // 모달이 닫히거나 열릴 때 비밀번호/에러 초기화
  useEffect(() => {
    if (!open) {
      setPw('');
      setPwError(null);
    }
  }, [open]);

  // description을 안 넘겼을 때만 requirePassword 여부에 따라 자동으로 안내 문구를 정함
  const resolvedDescription =
    description ?? (requirePassword ? '삭제를 위해 비밀번호를 입력해 주세요.' : '삭제한 데이터는 복구할 수 없습니다.');

  // 삭제 버튼 클릭 — 버튼을 미리 막아두지 않고, 눌렀을 때 검사해서 에러를 눈에 보이게 표시합니다.
  const handleConfirm = () => {
    if (requirePassword && !pw.trim()) {
      setPwError('비밀번호를 입력해주세요.');
      pwInputRef.current?.focus();
      return;
    }
    onConfirm(pw);
  };

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
          <button type="button" className="btn btn_md btn_danger" onClick={handleConfirm} disabled={loading}>
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </>
      }
    >
      <p className="b_title">{resolvedDescription}</p>

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
        <div className="form_group" style={{ marginTop: 16 }}>
          <label className="form_label" htmlFor="confirm_delete_pw">
            비밀번호<span className="req">*</span>
          </label>
          <div className="form_control">
            <input
              ref={pwInputRef}
              id="confirm_delete_pw"
              type="password"
              className={`form_input${pwError ? ' is_error' : ''}`}
              placeholder="비밀번호 입력"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                if (pwError) setPwError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
            />
            {pwError && <div className="form_hint error">{pwError}</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}
