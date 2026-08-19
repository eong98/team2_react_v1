import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertModal, PageHeader } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { isAdminGrade } from '../../../components/ts/MyPage';

interface LocationState {
  currentPassword?: string;
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, grade } = GlobalStoreSession();
  const isAdmin = isAdminGrade(grade);

  const currentPassword = (location.state as LocationState | null)?.currentPassword ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  const goBack = () => navigate(isAdmin ? '/dbms/mypage' : '/user/mypage');

  // 비밀번호 확인 모달을 거치지 않고 URL로 바로 접근한 경우 방지
  if (!currentPassword) {
    return (
      <section className="view active">
        <PageHeader
          title="비밀번호 변경"
          description="마이페이지에서 비밀번호 변경을 다시 시도해주세요."
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
              ← 마이페이지로
            </button>
          }
        />
      </section>
    );
  }

  const validate = () => {
    const newErrors: typeof errors = {};
    if (newPassword.length < 8) newErrors.newPassword = '비밀번호는 8자 이상이어야 합니다.';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = '새 비밀번호가 일치하지 않습니다.';
    setErrors(newErrors);

    if (newErrors.newPassword) {
      set_focus('newPassword');
      return false;
    }
    if (newErrors.confirmPassword) {
      set_focus('confirmPassword');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const endpoint = isAdmin ? '/v1/dbms/update/password' : '/v1/user/update/password';
      const res = await axiosInstance.post(endpoint, { id, password: currentPassword, newPassword });

      if (res.data === true) {
        setAlert({ message: '비밀번호가 변경되었습니다.', variant: 'success', onConfirm: goBack });
      } else {
        setAlert({ message: '비밀번호 변경에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
      }
    } catch (err) {
      console.error('비밀번호 변경 실패:', err);
      setAlert({ message: '비밀번호 변경 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="view active">
      <PageHeader
        title="비밀번호 변경"
        description="새로 사용할 비밀번호를 입력해주세요."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 마이페이지로
          </button>
        }
      />

      <div className="card card_pad_lg form_page">
        <div className="form_group">
          <label className="form_label" htmlFor="newPassword">
            새 비밀번호<span className="req">*</span>
          </label>
          <div className="form_control">
            <input
              id="newPassword"
              type="password"
              className={`form_input ${errors.newPassword ? 'is_error' : ''}`}
              placeholder="8자 이상 입력하세요"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrors((p) => ({ ...p, newPassword: undefined }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') set_focus('confirmPassword');
              }}
              style={{ maxWidth: 280 }}
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
              className={`form_input ${errors.confirmPassword ? 'is_error' : ''}`}
              placeholder="새 비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((p) => ({ ...p, confirmPassword: undefined }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              style={{ maxWidth: 280 }}
            />
            {errors.confirmPassword && <div className="form_hint error">{errors.confirmPassword}</div>}
          </div>
        </div>

        <div className="form_page_footer">
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack} disabled={saving}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_primary" onClick={handleSave} disabled={saving}>
            {saving ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </div>

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