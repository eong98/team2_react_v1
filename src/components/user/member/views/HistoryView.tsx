const LOGS = [
  { time: '2026-08-03 09:12:04', ip: '121.128.**.**', device: 'Chrome · Windows', ok: true, label: '성공' },
  { time: '2026-08-02 21:40:51', ip: '121.128.**.**', device: 'Safari · iOS', ok: true, label: '성공' },
  { time: '2026-08-01 14:03:22', ip: '211.36.**.**', device: 'Chrome · Windows', ok: false, label: '비밀번호 오류' },
];

export default function HistoryView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>로그인 이력</h1>
        <p>최근 접속 기록을 확인해 계정 보안을 관리하세요.</p>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>일시</th>
              <th>IP</th>
              <th>접속기기</th>
              <th>결과</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l) => (
              <tr key={l.time}>
                <td className="mono">{l.time}</td>
                <td className="mono">{l.ip}</td>
                <td>{l.device}</td>
                <td>
                  <span className={`badge ${l.ok ? 'badge_success' : 'badge_danger'}`}>{l.label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
