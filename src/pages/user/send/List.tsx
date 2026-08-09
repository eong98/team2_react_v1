import { PageHeader } from "../../../components/ui";

const LOGS = [
  { time: '08-03 14:32:07', channel: 'SMS', channelTone: 'badge_info', to: '본점 관리자', content: 'CAM 03 · 폭행 의심 감지 알림', result: '도달', resultTone: 'badge_success' },
  { time: '08-03 13:58:41', channel: 'SMS', channelTone: 'badge_info', to: '3호점 관리자', content: 'CAM 05 · 장시간 배회 알림', result: '도달', resultTone: 'badge_success' },
  { time: '08-02 23:40:10', channel: '이메일', channelTone: 'badge_neutral', to: '2호점 관리자', content: '주간 이벤트 요약 리포트', result: '실패 · 재발송필요', resultTone: 'badge_danger' },
];
const IMAGES = [
  { tag: 'EVT-1024', name: 'CAM 03 · 폭행 의심', date: '08-03 14:32' },
  { tag: 'EVT-1023', name: 'CAM 05 · 장시간 배회', date: '08-03 13:58' },
  { tag: 'EVT-1021', name: 'CAM 01 · 쓰러짐', date: '08-02 12:47' },
  { tag: 'EVT-1018', name: 'CAM 04 · 무단침입', date: '08-01 03:14' },
];

export default function HistoryView() {
  return (

    <>
      <section className="view active">
        <PageHeader
          title='생성이미지 관리'
          description='이벤트 알림용으로 AI가 생성한 이미지를 관리합니다.'
        />
        
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
    </>
  );
}
