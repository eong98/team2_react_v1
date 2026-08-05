const LOGS = [
  { time: '08-03 14:32:07', channel: 'SMS', channelTone: 'badge_info', to: '본점 관리자', content: 'CAM 03 · 폭행 의심 감지 알림', result: '도달', resultTone: 'badge_success' },
  { time: '08-03 13:58:41', channel: 'SMS', channelTone: 'badge_info', to: '3호점 관리자', content: 'CAM 05 · 장시간 배회 알림', result: '도달', resultTone: 'badge_success' },
  { time: '08-02 23:40:10', channel: '이메일', channelTone: 'badge_neutral', to: '2호점 관리자', content: '주간 이벤트 요약 리포트', result: '실패 · 재발송필요', resultTone: 'badge_danger' },
];

export default function HistoryView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>알림 발송 이력</h1>
        <p>SMS·메일 발송 로그와 도달 상태를 확인합니다.</p>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>발송일시</th>
              <th>채널</th>
              <th>수신자</th>
              <th>내용</th>
              <th>결과</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l) => (
              <tr key={l.time}>
                <td className="mono">{l.time}</td>
                <td>
                  <span className={`badge ${l.channelTone}`}>{l.channel}</span>
                </td>
                <td>{l.to}</td>
                <td>{l.content}</td>
                <td>
                  <span className={`badge ${l.resultTone}`}>{l.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
