import { useId } from 'react';

export default function VoiceWriteView() {
  const secretLabelId = useId();

  return (
    <section className="view active">
      <div className="view_head">
        <h1>고객의 소리 · 문의 작성</h1>
        <p>궁금한 점이나 불편사항을 남겨주시면 담당자가 답변드립니다.</p>
      </div>
      <div className="card card_pad_lg" style={{ maxWidth: 520 }}>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-18">
            접수 유형<span className="req">*</span>
          </label>
          <select id="member-fld-18" className="form_select">
            <option>기타</option>
            <option>관제신청</option>
            <option>영상요청</option>
            <option>장비장애</option>
          </select>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-19">
            제목<span className="req">*</span>
          </label>
          <input id="member-fld-19" className="form_input" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-20">
            내용<span className="req">*</span>
          </label>
          <textarea id="member-fld-20" className="form_textarea" />
        </div>
        <div className="form_group">
          <span className="form_label" id={secretLabelId}>
            비밀글 설정
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} role="group" aria-labelledby={secretLabelId}>
            <input type="checkbox" id="secret" />
            <label htmlFor="secret" className="form_hint" style={{ margin: 0 }}>
              비밀글로 등록 (비밀번호 필요)
            </label>
          </div>
        </div>
        <button className="btn btn_lg btn_primary">등록하기</button>
      </div>
    </section>
  );
}
