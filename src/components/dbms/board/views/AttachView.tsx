const FILES = [
  { icon: '📄', name: '서버점검_안내문.pdf', size: '1.2MB', from: '공지사항' },
  { icon: '🖼️', name: 'CAM03_이벤트스냅샷.jpg', size: '640KB', from: '1:1문의' },
  { icon: '📄', name: '구독_결제내역_7월.xlsx', size: '88KB', from: '1:1문의' },
];

export default function AttachView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>첨부파일 관리</h1>
        <p>공지사항·문의사항에 첨부된 파일을 관리합니다.</p>
      </div>
      <div className="card">
        {FILES.map((f) => (
          <div className="attach_row" key={f.name}>
            <div className="ic">{f.icon}</div>
            <div className="fn">{f.name}</div>
            <span className="fs">{f.size}</span>
            <span className="badge badge_neutral">{f.from}</span>
            <button className="btn btn_sm btn_ghost">삭제</button>
          </div>
        ))}
      </div>
    </section>
  );
}
