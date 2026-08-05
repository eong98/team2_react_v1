export default function MyPageView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>내 정보 수정</h1>
        <p>회원 정보를 확인하고 수정할 수 있습니다.</p>
      </div>
      <div className="card card_pad_lg" style={{ maxWidth: 440 }}>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-12">
            이름
          </label>
          <input id="member-fld-12" className="form_input" defaultValue="홍길동" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-13">
            이메일(아이디)
          </label>
          <input id="member-fld-13" className="form_input" defaultValue="hong@allimio.kr" disabled style={{ opacity: 0.6 }} />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-14">
            휴대폰 번호
          </label>
          <input id="member-fld-14" className="form_input" defaultValue="010-1234-5678" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-15">
            비밀번호 변경
          </label>
          <input id="member-fld-15" className="form_input" type="password" placeholder="변경 시에만 입력" />
        </div>
        <button className="btn btn_lg btn_primary">저장하기</button>
      </div>
    </section>
  );
}
