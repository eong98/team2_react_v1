export default function WithdrawView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>회원 탈퇴</h1>
        <p>탈퇴 시 모든 매장·CCTV 연동 정보와 이용 기록이 삭제되며 복구할 수 없습니다.</p>
      </div>
      <div className="card card_pad_lg" style={{ maxWidth: 440, borderColor: 'rgba(255,77,94,.35)' }}>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-16">
            탈퇴 사유
          </label>
          <select id="member-fld-16" className="form_select">
            <option>서비스 이용 종료</option>
            <option>다른 서비스로 이전</option>
            <option>기능 불만족</option>
            <option>기타</option>
          </select>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-17">
            비밀번호 확인<span className="req">*</span>
          </label>
          <input id="member-fld-17" className="form_input" type="password" />
        </div>
        <button className="btn btn_lg btn_danger">탈퇴하기</button>
      </div>
    </section>
  );
}
