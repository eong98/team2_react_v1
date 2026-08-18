import { Link, useNavigate } from 'react-router-dom';
import { useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { GlobalStoreCookie, GlobalStoreSession } from '../../store/LoginStore';
import PageHeader from '../../components/ui/common/PageHeader';
import { axiosInstance, enter_chk, getIP, set_focus } from '../../utils/Tool';

export default function Login() {
  const navigate = useNavigate();

  const storeId = GlobalStoreCookie((state) => state.storeId);
  const setStoreId = GlobalStoreCookie((state) => state.setStoreId);

  // storeId(아이디 저장)가 켜져 있을 때만 이전 아이디를 채워줍니다.
  const [input, setInput] = useState({
    id: storeId ? (GlobalStoreSession.getState().id || '') : '',
    password: '',
  });

  type FormErrors = { id?: string; password?: string };
  const [errors, setErrors] = useState<FormErrors>({});

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setInput((prev) => ({ ...prev, [id]: value }));
    if (id in errors) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const setStoreIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStoreId(e.target.checked);
  };

  const test = () => {
    setInput({ id: 'admin01', password: 'password123!' });
    setErrors({});
  };

  // 필수 입력값 검사 (QaForm.tsx와 동일 패턴)
  const validate = () => {
    if (!input.id.trim()) {
      setErrors({ id: '아이디를 입력해주세요.' });
      set_focus('id');
      return false;
    }
    if (!input.password.trim()) {
      setErrors({ password: '비밀번호를 입력해주세요.' });
      set_focus('password');
      return false;
    }
    setErrors({});
    return true;
  };

  const send = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const loginResult = await axiosInstance.post(
        `http://${getIP()}:9102/v1/dbms/login?id=${input.id}&password=${input.password}`
      );
      const { success, dbms } = loginResult.data;

      if (success) {
        GlobalStoreSession.getState().setLogin(true);
        GlobalStoreSession.getState().setNo(dbms.no);
        GlobalStoreSession.getState().setGrade(dbms.grade);
        // ✅ "아이디 저장" 체크했을 때만 아이디를 기억하고, 해제했으면 비웁니다.
        GlobalStoreSession.getState().setId(storeId ? input.id : '');

        alert('로그인에 성공했습니다!');
        navigate('/dbms/menus');
      } else {
        alert('아이디 또는 비밀번호가 일치하지 않습니다');
      }
    } catch (err) {
      console.error(err);
      alert('서버 연결에 실패했습니다');
    }
  };

  return (
    <section className="view active">
      <PageHeader title="로그인" title_size="xlg" description="allimio 관제 서비스에 오신 것을 환영합니다." />
      <form onSubmit={send}>
        <div className="card card_pad_lg">
          <div className="form_group">
            <label className="form_label" htmlFor="id">
              아이디(이메일)<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="id"
                className={`form_input${errors.id ? ' is_error' : ''}`}
                placeholder="you@example.com"
                autoFocus
                onKeyDown={(e) => enter_chk(e, 'password')}
                onChange={onChange}
                value={input.id}
              />
              {errors.id && <div className="form_hint error">{errors.id}</div>}
            </div>
          </div>

          <div className="form_check">
            <input type="checkbox" id="storeId" checked={storeId} onChange={setStoreIdChange} />
            <label className="b_title" htmlFor="storeId">아이디 저장</label>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="password">
              비밀번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="password"
                className={`form_input${errors.password ? ' is_error' : ''}`}
                type="password"
                placeholder="비밀번호 입력"
                onKeyDown={(e) => enter_chk(e, 'btnSend')}
                onChange={onChange}
                value={input.password}
              />
              {errors.password && <div className="form_hint error">{errors.password}</div>}
            </div>
          </div>

          <div className="form_page_footer">
            <button type="button" className="btn btn_lg btn_ghost" onClick={test}>테스트</button>
            <button id="btnSend" type="submit" className="btn btn_lg btn_primary">로그인</button>
          </div>

          <div className="link_row">
            <Link to="/">아이디/비밀번호 찾기</Link>
          </div>
        </div>
      </form>
    </section>
  );
}