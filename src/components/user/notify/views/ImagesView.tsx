const IMAGES = [
  { tag: 'EVT-1024', name: 'CAM 03 · 폭행 의심', date: '08-03 14:32' },
  { tag: 'EVT-1023', name: 'CAM 05 · 장시간 배회', date: '08-03 13:58' },
  { tag: 'EVT-1021', name: 'CAM 01 · 쓰러짐', date: '08-02 12:47' },
  { tag: 'EVT-1018', name: 'CAM 04 · 무단침입', date: '08-01 03:14' },
];

export default function ImagesView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>생성이미지 관리</h1>
        <p>이벤트 알림용으로 AI가 생성한 이미지를 관리합니다.</p>
      </div>
      <div className="img_grid">
        {IMAGES.map((img) => (
          <div className="img_card" key={img.tag}>
            <div className="img_thumb">
              <span className="tag mono">{img.tag}</span>
            </div>
            <div className="img_body">
              <div className="n">{img.name}</div>
              <div className="d">{img.date}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
