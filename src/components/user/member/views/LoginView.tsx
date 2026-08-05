import { Link } from 'react-router-dom';

export default function LoginView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>로그인</h1>
        <p>allimio 관제 서비스에 오신 것을 환영합니다.</p>
      </div>
      <div className="card card_pad_lg" style={{ maxWidth: 400 }}>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-1">
            아이디(이메일)<span className="req">*</span>
          </label>
          <input id="member-fld-1" className="form_input" placeholder="you@example.com" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-2">
            비밀번호<span className="req">*</span>
          </label>
          <input id="member-fld-2" className="form_input" type="password" placeholder="비밀번호 입력" />
        </div>
        <button className="btn btn_lg btn_primary">로그인</button>
        <div className="link_row">
          <Link to="../find">아이디/비밀번호 찾기</Link>
          <Link to="../signup">회원가입</Link>
        </div>
      </div>
    </section>
  );
}
