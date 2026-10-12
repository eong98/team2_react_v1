import { useEffect, useState } from 'react';
import Modal from '../Modal';
import { QA_RESET_PW_MIN, confirmQaReset, requestQaReset } from '../../ts/QaReset';
import { qaErrorMessage } from '../../ts/QaGuestToken';
import { set_focus } from '../../../utils/Tool';

/* ---------------------------------------------------------------------
   비회원 문의글 비밀번호 재설정 모달 — 비회원 문의 상세(/board/qa/:no)에서 사용

   1단계: 글을 쓸 때 입력한 이메일로 인증번호 받기
   2단계: 인증번호 + 새 비밀번호 입력 → 변경
   끝나면 onDone() — 화면은 새 비밀번호로 다시 확인하도록 안내
--------------------------------------------------------------------- */

interface QaPwResetModalProps {
  open: boolean;
  /** 문의글 번호 */
  no: number | string;
  onClose: () => void;
  /** 비밀번호 변경 완료 */
  onDone: () => void;
}

type ResetField = 'code' | 'pw' | 'pwCheck';
type ResetErrors = Partial<Record<ResetField, string>>;

export default function QaPwResetModal({ open, no, onClose, onDone }: QaPwResetModalProps) {
  const [sentEmail, setSentEmail] = useState(''); // 값이 있으면 2단계
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pwCheck, setPwCheck] = useState('');
  const [error, setError] = useState(''); // 서버 요청 실패 안내
  const [errors, setErrors] = useState<ResetErrors>({}); // 입력 항목별 오류
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // 열 때마다 처음부터
  useEffect(() => {
    if (open) {
      setSentEmail('');
      setCode('');
      setPw('');
      setPwCheck('');
      setError('');
      setErrors({});
      setNotice('');
      setBusy(false);
    }
  }, [open, no]);

  /** 인증번호 받기 / 다시 받기 */
  const sendCode = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await requestQaReset(no);
      setNotice(sentEmail ? '인증번호를 다시 보냈습니다.' : '');
      setSentEmail(res.email);
      setCode('');
    } catch (err) {
      setError(qaErrorMessage(err, '인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setBusy(false);
    }
  };

  /** 인증번호 확인 + 비밀번호 변경 */
  const changePw = async () => {
    setNotice('');
    setError('');

    // 다른 폼과 같은 방식: 전부 검사해서 항목마다 오류를 표시하고, 첫 오류 항목으로 포커스
    const newErrors: ResetErrors = {};
    if (!code.trim()) newErrors.code = '인증번호를 입력해주세요.';
    if (pw.length < QA_RESET_PW_MIN) newErrors.pw = `새 비밀번호는 ${QA_RESET_PW_MIN}자 이상 입력해주세요.`;
    if (!pwCheck) newErrors.pwCheck = '새 비밀번호를 한 번 더 입력해주세요.';
    else if (pw !== pwCheck) newErrors.pwCheck = '새 비밀번호가 서로 일치하지 않습니다.';
    setErrors(newErrors);

    const firstErrorId = newErrors.code ? 'qaResetCode' : newErrors.pw ? 'qaResetPw' : newErrors.pwCheck ? 'qaResetPwCheck' : null;
    if (firstErrorId) {
      set_focus(firstErrorId);
      return;
    }
    setBusy(true);
    try {
      await confirmQaReset(no, code.trim(), pw);
      onDone();
    } catch (err) {
      setError(qaErrorMessage(err, '비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="qaPwResetTitle"
      title="게시글 비밀번호 재설정"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={onClose}>
            취소
          </button>
          {sentEmail ? (
            <button type="button" className="btn btn_md btn_primary" disabled={busy} onClick={changePw}>
              {busy ? '처리 중...' : '비밀번호 변경'}
            </button>
          ) : (
            <button type="button" className="btn btn_md btn_primary" disabled={busy} onClick={sendCode}>
              {busy ? '보내는 중...' : '인증번호 받기'}
            </button>
          )}
        </>
      }
    >
      {!sentEmail ? (
        <div>
          <p className="cell_sub" style={{ marginBottom: 6 }}>
            글을 작성할 때 입력한 이메일로 인증번호를 보내드립니다.
          </p>
          <p className="cell_sub">인증번호를 입력하면 게시글 비밀번호를 새로 정할 수 있습니다.</p>
          {error && <div className="form_hint error" style={{ marginTop: 12 }}>{error}</div>}
        </div>
      ) : (
        <div>
          <p className="cell_sub" style={{ marginBottom: 14 }}>
            <b>{sentEmail}</b> 로 인증번호를 보냈습니다. 10분 안에 입력해주세요.
          </p>

          <div className="form_group">
            <label className="form_label" htmlFor="qaResetCode">인증번호</label>
            <div className="form_control">
              <input
                id="qaResetCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className={`form_input ${errors.code ? 'is_error' : ''}`}
                placeholder="6자리 숫자"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
                }}
              />
              {errors.code && <div className="form_hint error">{errors.code}</div>}
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="qaResetPw">새 비밀번호</label>
            <div className="form_control">
              <input
                id="qaResetPw"
                type="password"
                autoComplete="new-password"
                className={`form_input ${errors.pw ? 'is_error' : ''}`}
                placeholder={`${QA_RESET_PW_MIN}자 이상`}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  if (errors.pw) setErrors((prev) => ({ ...prev, pw: undefined }));
                }}
              />
              {errors.pw && <div className="form_hint error">{errors.pw}</div>}
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="qaResetPwCheck">새 비밀번호 확인</label>
            <div className="form_control">
              <input
                id="qaResetPwCheck"
                type="password"
                autoComplete="new-password"
                className={`form_input ${errors.pwCheck ? 'is_error' : ''}`}
                value={pwCheck}
                onChange={(e) => {
                  setPwCheck(e.target.value);
                  if (errors.pwCheck) setErrors((prev) => ({ ...prev, pwCheck: undefined }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && changePw()}
              />
              {errors.pwCheck && <div className="form_hint error">{errors.pwCheck}</div>}
              {/* 서버가 돌려준 안내(인증번호 불일치·만료 등)와 재발송 안내 */}
              {error && <div className="form_hint error">{error}</div>}
              {!error && notice && <div className="form_hint">{notice}</div>}
            </div>
          </div>

          <p className="cell_sub" style={{ marginTop: 4 }}>
            메일이 오지 않았나요?{' '}
            <button type="button" className="qa_locked_link" disabled={busy} onClick={sendCode}>
              인증번호 다시 받기
            </button>
          </p>
        </div>
      )}
    </Modal>
  );
}
