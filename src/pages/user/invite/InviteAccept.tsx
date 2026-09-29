import { useState } from 'react';
import { AlertModal, Modal } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import type { InviteAcceptRequest, InviteAcceptResult } from '../../../components/ts/Invite';

interface InviteAcceptProps {
  onClose: () => void;
}

/* ---------------------------------------------------------------------
   초대코드 입력 모달 (InviteMain에서 "초대코드 입력하기" 클릭 시)
   6자리 코드 + 현재 로그인 회원번호(mno)를 서버로 보내 SHOP_MEMBER에 등록합니다.

   API
   POST /invite/accept { code, mno } → InviteAcceptResult
--------------------------------------------------------------------- */
export default function InviteAccept({ onClose }: InviteAcceptProps) {
  const { no: mno } = GlobalStoreSession();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  const onCodeChange = (value: string) => {
    // 숫자 + 영문 대문자만 허용, 소문자는 자동 대문자 변환
    const cleaned = value.toUpperCase().replace(/[^0-9A-Z]/g, '');

    // 6자리를 초과하면 아예 무시 (밀림 현상 방지)
    if (cleaned.length > 6) return;

    setCode(cleaned);
    if (error) setError(null);
  };

  const validate = () => {
    if (code.length !== 6) {
      setError('6자리 초대코드를 입력해주세요.');
      set_focus('invite_code_input');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload: InviteAcceptRequest = { code };
      const res = await axiosInstance.post<InviteAcceptResult>('/invite/accept', payload);

      if (res.data.success) {
        setAlert({
          message: res.data.shopTitle
            ? `${res.data.shopTitle} 매장의 직원으로 등록되었습니다.`
            : '매장 직원으로 등록되었습니다.',
          variant: 'success',
          onConfirm: onClose, // 확인 누르면 입력 모달까지 닫기
        });
      } else {
        setAlert({ message: res.data.message || '유효하지 않거나 만료된 코드입니다.', variant: 'error' });
      }
    } catch (err) {
      console.error('초대코드 수락 실패:', err);
      setAlert({ message: '초대코드 확인 중 오류가 발생했습니다.\n코드를 다시 확인해주세요.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        titleId="inviteAcceptTitle"
        title="초대코드 입력"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={onClose} disabled={submitting}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '확인 중...' : '수락하기'}
            </button>
          </>
        }
      >
        <p className="b_title" style={{ margin: '8px 0 16px' }}>
          점주에게 받은 6자리 초대코드를 입력해주세요.
        </p>

        <div className="form_group">
          <div className="form_control">
            <input
              id="invite_code_input"
              type="text"
              maxLength={6}
              className={`form_input mono ${error ? 'is_error' : ''}`}
              placeholder="6자리 초대코드"
              aria-label="초대코드"
              style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center' }}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            {error && <div className="form_hint error">{error}</div>}
          </div>
        </div>
      </Modal>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </>
  );
}