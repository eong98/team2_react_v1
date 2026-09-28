import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertModal, PageHeader } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';

/* ---------------------------------------------------------------------
   비밀번호 재설정 (/reset/password?token=...) — 메일 링크로 진입
   API
   GET  /v1/user/reset/validate?token=  → 링크 유효성 검사
   POST /v1/user/reset/password         { token, newPassword }
--------------------------------------------------------------------- */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [invalidMsg, setInvalidMsg] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  useEffect(() => {
    if (!token) {
      setInvalidMsg('유효하지 않은 재설정 링크입니다.');
      setStatus('invalid');
      return;
    }
    axiosInstance
      .get('/v1/user/reset/validate', { params: { token } })
      .then(() => setStatus('valid'))
      .catch((err) => {
        setInvalidMsg(err?.response?.data?.message ?? '유효하지 않거나 만료된 링크입니다.');
        setStatus('invalid');
      });
  }, [token]);

  const validate = () => {
    const next: typeof errors = {};
    if (newPassword.length < 8) next.newPassword = '비밀번호는 8자 이상이어야 합니다.';
    if (newPassword !== confirmPassword) next.confirmPassword = '비밀번호가 일치하지 않습니다.';
    setErrors(next);

    if (next.newPassword) { set_focus('newPassword'); return false; }
    if (next.confirmPassword) { set_focus('confirmPassword'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    try {
      await axiosInstance.post('/v1/user/reset/password', { token, newPassword });
      setAlert({
        message: '비밀번호가 변경되었습니다.\n새 비밀번호로 로그인해주세요.',
        variant: 'success',
        onConfirm: () => navigate('/login'),
      });
    } catch (err: any) {
      console.error('비밀번호 재설정 실패:', err);
      setAlert({
        message: err?.response?.data?.message ?? '비밀번호 변경 중 오류가 발생했습니다.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'checking') {
    return (
      <section className="view active">
        <PageHeader title="비밀번호 재설정" description="링크를 확인하는 중입니다..." />
      </section>
    );
  }

  if (status === 'invalid') {
    return (
      <section className="view active">
        <PageHeader title="비밀번호 재설정" description={invalidMsg} />
        <div className="card card_pad_lg no_data">
          <p className="b_title">재설정 메일을 다시 요청해주세요.</p>
          <Link to="/find?tab=pw" className="btn btn_md btn_primary">비밀번호 찾기로 이동</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader title="비밀번호 재설정" title_size="xlg" description="새로 사용할 비밀번호를 입력해주세요." />

      <form onSubmit={handleSubmit} noValidate>
        <div className="card card_pad_lg">
          <div className="form_group">
            <label className="form_label" htmlFor="newPassword">
              새 비밀번호 (8자 이상)<span className="req">*</span>
            </label>
            <div className="form_control">
              <input
                id="newPassword"
                type="password"
                className={`form_input${errors.newPassword ? ' is_error' : ''}`}
                placeholder="8자 이상 입력하세요"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((p) => ({ ...p, newPassword: undefined }));
                }}
                autoFocus
              />
              {errors.newPassword && <div className="form_hint error">{errors.newPassword}</div>}
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="confirmPassword">
              새 비밀번호 확인<span className="req">*</span>
            </label>
            <div className="form_control">
              <input
                id="confirmPassword"
                type="password"
                className={`form_input${errors.confirmPassword ? ' is_error' : ''}`}
                placeholder="새 비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
              />
              {errors.confirmPassword && <div className="form_hint error">{errors.confirmPassword}</div>}
            </div>
          </div>

          <div className="form_page_footer">
            <button type="submit" className="btn btn_lg btn_primary" disabled={saving}>
              {saving ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </div>
      </form>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}