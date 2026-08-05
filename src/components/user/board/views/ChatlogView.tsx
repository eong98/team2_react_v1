const LOGS = [
  { time: '08-03 09:40', channel: 'WEB', choice: '영상요청', status: '종료', tone: 'badge_success', rate: '👍' },
  { time: '08-02 22:11', channel: 'APP', choice: '장비장애', status: '상담원 이관', tone: 'badge_warning', rate: '-' },
  { time: '08-01 15:03', channel: 'KAKAO', choice: '구독/결제', status: '종료', tone: 'badge_success', rate: '👎' },
];

export default function ChatlogView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>챗봇 대화로그 조회</h1>
        <p>세션별 대화 내용과 만족도를 확인합니다.</p>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>세션 시작</th>
              <th>채널</th>
              <th>최종 선택</th>
              <th>상태</th>
              <th>만족도</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l) => (
              <tr key={l.time}>
                <td className="mono">{l.time}</td>
                <td>{l.channel}</td>
                <td>{l.choice}</td>
                <td>
                  <span className={`badge ${l.tone}`}>{l.status}</span>
                </td>
                <td>{l.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
