export default function DiagramView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>AI 도면 생성 · 관리</h1>
        <p>매장 CCTV 배치를 AI로 자동 도식화해 관리합니다.</p>
      </div>
      <div className="grid_split">
        <div className="card card_pad_lg">
          <div className="form_group">
            <label className="form_label" htmlFor="notify-mail-fld-4">
              대상 매장
            </label>
            <select id="notify-mail-fld-4" className="form_select">
              <option>본점 · 스터디카페 A</option>
            </select>
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="notify-mail-fld-5">
              참고 정보
            </label>
            <textarea id="notify-mail-fld-5" className="form_textarea" placeholder="매장 평면 특징, CCTV 위치 메모 등을 입력하면 도면 생성에 반영됩니다." />
          </div>
          <button className="btn btn_md btn_primary">AI 도면 생성</button>
        </div>
        <div className="card card_pad_lg">
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
            최근 생성 도면
          </div>
          <div style={{ aspectRatio: '4/3', background: 'var(--n-900)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn_sm btn_primary">저장</button>
            <button className="btn btn_sm btn_ghost">다시 생성</button>
          </div>
        </div>
      </div>
    </section>
  );
}
