export default function FindView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>아이디 / 비밀번호 찾기</h1>
        <p>가입 시 등록한 휴대폰 번호로 본인 확인 후 안내해드립니다.</p>
      </div>
      <div className="card card_pad_lg" style={{ maxWidth: 400 }}>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-9">
            이름
          </label>
          <input id="member-fld-9" className="form_input" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-10">
            휴대폰 번호
          </label>
          <div className="form_row_inline">
            <input id="member-fld-10" className="form_input" placeholder="010-0000-0000" />
            <button className="btn btn_md btn_ghost">인증요청</button>
          </div>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-11">
            인증번호
          </label>
          <input id="member-fld-11" className="form_input" placeholder="6자리 입력" />
        </div>
        <div className="form_row_inline">
          <button className="btn btn_md btn_primary" style={{ flex: 1 }}>
            아이디 찾기
          </button>
          <button className="btn btn_md btn_ghost" style={{ flex: 1 }}>
            비밀번호 재설정
          </button>
        </div>
      </div>
    </section>
  );
}
