export default function SignupView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>회원가입</h1>
        <p>SMS 또는 이메일 인증 후 가입이 완료됩니다.</p>
      </div>
      <div className="card card_pad_lg" style={{ maxWidth: 440 }}>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-3">
            이름<span className="req">*</span>
          </label>
          <input id="member-fld-3" className="form_input" placeholder="홍길동" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-4">
            이메일(아이디)<span className="req">*</span>
          </label>
          <input id="member-fld-4" className="form_input" placeholder="you@example.com" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-5">
            휴대폰 번호<span className="req">*</span>
          </label>
          <div className="form_row_inline">
            <input id="member-fld-5" className="form_input" placeholder="010-0000-0000" />
            <button className="btn btn_md btn_ghost">인증요청</button>
          </div>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-6">
            인증번호<span className="req">*</span>
          </label>
          <div className="form_row_inline">
            <input id="member-fld-6" className="form_input" placeholder="6자리 입력" />
            <button className="btn btn_md btn_ghost">확인</button>
          </div>
          <div className="form_hint">03:00 이내에 인증번호를 입력해주세요</div>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-7">
            비밀번호<span className="req">*</span>
          </label>
          <input id="member-fld-7" className="form_input" type="password" placeholder="영문·숫자·특수문자 포함 8자 이상" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-8">
            비밀번호 확인<span className="req">*</span>
          </label>
          <input id="member-fld-8" className="form_input is_error" type="password" />
          <div className="form_hint error">비밀번호가 일치하지 않습니다</div>
        </div>
        <button className="btn btn_lg btn_primary">가입하기</button>
      </div>
    </section>
  );
}
