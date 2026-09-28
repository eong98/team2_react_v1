import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertModal, PageHeader } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';
import { useTab } from '../../../hooks/useTab';

type TabKey = 'id' | 'pw';
type Errors = Partial<Record<'email' | 'phone' | 'id', string>>;

/* ---------------------------------------------------------------------
   아이디/비밀번호 찾기 (/find)
   - 아이디 찾기: 가입 시 입력한 이메일 + 전화번호 → 끝 3자리 마스킹된 아이디
   - 비밀번호 찾기: 아이디 + 이메일 → 재설정 링크 메일 발송

   API
   POST /v1/user/find-id        { email, phone } → { success, ids[] | message }
   POST /v1/user/reset/email    { id, email }    → { success, message }
--------------------------------------------------------------------- */
export default function FindAccount() {
  const { tab, changeTab } = useTab<TabKey>({ defaultTab: 'id' });

  const [idForm, setIdForm] = useState({ email: '', phone: '' });
  const [pwForm, setPwForm] = useState({ id: '', email: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [foundIds, setFoundIds] = useState<string[] | null>(null);
  const [mailSent, setMailSent] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const resetResult = () => {
    setErrors({});
    setFoundIds(null);
    setMailSent(false);
  };

  const handleTab = (next: TabKey) => changeTab(next, resetResult);

  const onIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIdForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const onPwChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const validate = (fields: { field: keyof Errors; label: string; value: string; id: string }[]) => {
    for (const { field, label, value, id } of fields) {
      if (!value.trim()) {
        setErrors({ [field]: `${label}을(를) 입력해주세요.` });
        set_focus(id);
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const findId = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (
      !validate([
        { field: 'email', label: '이메일', value: idForm.email, id: 'findEmail' },
        { field: 'phone', label: '전화번호', value: idForm.phone, id: 'findPhone' },
      ])
    )
      return;

    setSubmitting(true);
    setFoundIds(null);
    try {
      const res = await axiosInstance.post('/v1/user/find-id', {
        email: idForm.email.trim(),
        phone: idForm.phone.trim(),
      });
      if (res.data.success) setFoundIds(res.data.ids);
      else setAlert({ message: res.data.message ?? '일치하는 회원 정보가 없습니다.', variant: 'error' });
    } catch (err) {
      console.error('아이디 찾기 실패:', err);
      setAlert({ message: '아이디 찾기 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const sendResetMail = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (
      !validate([
        { field: 'id', label: '아이디', value: pwForm.id, id: 'resetId' },
        { field: 'email', label: '이메일', value: pwForm.email, id: 'resetEmail' },
      ])
    )
      return;

    setSubmitting(true);
    setMailSent(false);
    try {
      const res = await axiosInstance.post('/v1/user/reset/email', {
        id: pwForm.id.trim(),
        email: pwForm.email.trim(),
      });
      if (res.data.success) setMailSent(true);
      else setAlert({ message: res.data.message ?? '메일을 발송하지 못했습니다.', variant: 'error' });
    } catch (err: any) {
      console.error('재설정 메일 발송 실패:', err);
      setAlert({
        message: err?.response?.data?.message ?? '메일 발송 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view active">
      <PageHeader title="아이디/비밀번호 찾기" title_size="xlg" description="가입 시 입력한 정보로 계정을 찾을 수 있습니다." />

      <div className="tabs" role="tablist" aria-label="계정 찾기 전환">
        {(['id', 'pw'] as TabKey[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            className={`tab${tab === k ? ' on' : ''}`}
            aria-selected={tab === k}
            onClick={() => handleTab(k)}
          >
            {k === 'id' ? '아이디 찾기' : '비밀번호 찾기'}
          </button>
        ))}
      </div>

      {tab === 'id' ? (
        <form onSubmit={findId} noValidate>
          <div className="card card_pad_lg">
            <div className="form_group">
              <label className="form_label" htmlFor="findEmail">
                이메일<span className="req">*</span>
              </label>
              <div className="form_control">
                <input
                  id="findEmail"
                  name="email"
                  type="email"
                  className={`form_input${errors.email ? ' is_error' : ''}`}
                  placeholder="가입 시 입력한 이메일"
                  value={idForm.email}
                  onChange={onIdChange}
                  autoFocus
                />
                {errors.email && <div className="form_hint error">{errors.email}</div>}
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="findPhone">
                전화번호<span className="req">*</span>
              </label>
              <div className="form_control">
                <input
                  id="findPhone"
                  name="phone"
                  className={`form_input${errors.phone ? ' is_error' : ''}`}
                  placeholder="010-0000-0000"
                  value={idForm.phone}
                  onChange={onIdChange}
                />
                {errors.phone && <div className="form_hint error">{errors.phone}</div>}
              </div>
            </div>

            {foundIds && (
              <div className="card card_pad_md primary" style={{ marginBottom: 16 }}>
                <p className="b_title" style={{ marginBottom: 8 }}>
                  회원님의 아이디입니다. (개인정보 보호를 위해 끝 3자리는 가려집니다)
                </p>
                {foundIds.map((id) => (
                  <div key={id} className="b_title lg mono">{id}</div>
                ))}
              </div>
            )}

            <div className="form_page_footer">
              {foundIds && (
                <button type="button" className="btn btn_lg btn_ghost" onClick={() => handleTab('pw')}>
                  비밀번호 찾기
                </button>
              )}
              <button type="submit" className="btn btn_lg btn_primary" disabled={submitting}>
                {submitting ? '조회 중...' : '아이디 찾기'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={sendResetMail} noValidate>
          <div className="card card_pad_lg">
            <div className="form_group">
              <label className="form_label" htmlFor="resetId">
                아이디<span className="req">*</span>
              </label>
              <div className="form_control">
                <input
                  id="resetId"
                  name="id"
                  className={`form_input${errors.id ? ' is_error' : ''}`}
                  placeholder="아이디 입력"
                  value={pwForm.id}
                  onChange={onPwChange}
                  autoFocus
                />
                {errors.id && <div className="form_hint error">{errors.id}</div>}
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="resetEmail">
                이메일<span className="req">*</span>
              </label>
              <div className="form_control">
                <input
                  id="resetEmail"
                  name="email"
                  type="email"
                  className={`form_input${errors.email ? ' is_error' : ''}`}
                  placeholder="가입 시 입력한 이메일"
                  value={pwForm.email}
                  onChange={onPwChange}
                />
                {errors.email && <div className="form_hint error">{errors.email}</div>}
                <div className="form_hint">입력한 이메일로 비밀번호 재설정 링크를 보내드립니다. (유효시간 30분)</div>
              </div>
            </div>

            {mailSent && (
              <div className="card card_pad_md primary" style={{ marginBottom: 16 }}>
                <p className="b_title">재설정 링크를 메일로 발송했습니다. 메일함을 확인해주세요.</p>
              </div>
            )}

            <div className="form_page_footer">
              <button type="submit" className="btn btn_lg btn_primary" disabled={submitting}>
                {submitting ? '발송 중...' : mailSent ? '메일 다시 보내기' : '재설정 메일 받기'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="link_row" style={{ marginTop: 16 }}>
        <Link to="/login">로그인으로 돌아가기</Link>
      </div>

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}