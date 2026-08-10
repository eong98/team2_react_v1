import { useState } from 'react';
import { PageHeader } from '../../../components/ui';

const CHANNELS = ['SMS', '이메일', '카카오알림톡'];
const LOGS = [
  { time: '08-03 14:32:07', channel: 'SMS', channelTone: 'badge_info', to: '본점 관리자', content: 'CAM 03 · 폭행 의심 감지 알림', result: '도달', resultTone: 'badge_success' },
  { time: '08-03 13:58:41', channel: 'SMS', channelTone: 'badge_info', to: '3호점 관리자', content: 'CAM 05 · 장시간 배회 알림', result: '도달', resultTone: 'badge_success' },
  { time: '08-02 23:40:10', channel: '이메일', channelTone: 'badge_neutral', to: '2호점 관리자', content: '주간 이벤트 요약 리포트', result: '실패 · 재발송필요', resultTone: 'badge_danger' },
];


const MAILS = [
  {
    subject: '[Urgent] CCTV integration request for new branch',
    from: 'branch-manager@overseas-partner.com',
    time: '08-03 10:12',
    lang: 'EN',
    original:
      "We'd like to integrate 8 additional CCTV channels for our new branch opening next month. Could you share the setup guide and pricing?",
    translated: '다음 달 오픈하는 신규 지점에 CCTV 8채널을 추가로 연동하고 싶습니다. 설치 가이드와 가격 안내를 부탁드립니다.',
  },
  {
    subject: '週次イベントレポートについて',
    from: 'tanaka@partner-jp.co.jp',
    time: '08-02 18:44',
    lang: 'JA',
    original: '来週のイベントレポートのフォーマットについて確認したいことがあります。担当者様よりご連絡いただけますでしょうか。',
    translated: '다음 주 이벤트 리포트 양식에 대해 확인하고 싶은 내용이 있습니다. 담당자분께서 연락 주실 수 있을까요?',
  },
  {
    subject: '구독 결제 세금계산서 발행 요청',
    from: 'acc@partner.co.kr',
    time: '08-01 09:03',
    lang: 'KO',
    original: '7월분 구독 결제에 대한 세금계산서 발행을 요청드립니다. 사업자등록증은 첨부파일로 전달드립니다.',
    translated: '(원문이 한국어라 번역이 필요하지 않습니다.)',
  },
];


export default function SendForm() {
  const [channel, setChannel] = useState('SMS');
  const [message, setMessage] = useState(
    '[allimio] 본점 CAM 03에서 폭행 의심 상황이 감지되었습니다(신뢰도 94%). 대시보드에서 즉시 확인해주세요.',
  );

  
  const [selected, setSelected] = useState(0);
  const [readIdx, setReadIdx] = useState<Set<number>>(new Set());
  const mail = MAILS[selected];

  const openMail = (i: number) => {
    setSelected(i);
    setReadIdx((prev) => new Set(prev).add(i));
  };

  return (
    <>
      <section className="view active">
        <PageHeader
          title='발송 관리'
          description='이상행동 감지 시 발송될 SMS·메일을 작성하고 즉시 발송할 수 있습니다.'
        />

        <div className="grid_split">
          <div className="card card_pad_lg">
            <div className="form_group">
              <span className="form_label" id="notify-mail-channel-label">
                발송 채널
              </span>
              <div className="chip_select" role="group" aria-labelledby="notify-mail-channel-label">
                {CHANNELS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip_opt${channel === c ? ' on' : ''}`}
                    aria-pressed={channel === c}
                    onClick={() => setChannel(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="notify-mail-fld-1">
                수신 대상
              </label>
              <select id="notify-mail-fld-1" className="form_select">
                <option>본점 관리자 전체</option>
                <option>본점 · 김관리자</option>
                <option>전체 매장 관리자</option>
              </select>
            </div>
            <div className="form_group">
              <label className="form_label" htmlFor="notify-mail-fld-2">
                제목 (메일 선택 시)
              </label>
              <input id="notify-mail-fld-2" className="form_input" placeholder="예: [긴급] 본점 CAM 03 이상행동 감지" />
            </div>
            <div className="form_group">
              <label className="form_label" htmlFor="notify-mail-fld-3">
                내용
              </label>
              <textarea id="notify-mail-fld-3" className="form_textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            
            <div className="form_page_footer">
              <button className="btn btn_md btn_primary">지금 발송하기</button>
            </div>
          </div>

          <div className="card card_pad_lg">
            <div className="form_group" style={{ marginBottom: 6 }}>
              <span className="form_label">미리보기</span>
            </div>
            <div style={{ background: 'var(--n-900)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13 }}>
              <div className="mono" style={{ color: 'var(--text-faint)', fontSize: 11, marginBottom: 8 }}>
                {channel} · 발신번호 1666-0000
              </div>
              {message}
            </div>
          </div>
        </div>
      </section>

      
      <section className="view active">
        <PageHeader
          title='웹메일함 · 번역 결과'
          description='해외 매장·거래처 메일을 수신하고 번역 결과를 함께 확인합니다.'
        />

        <div className="grid_split">
          <div className="card">
            {MAILS.map((m, i) => (
              <button type="button" className="mail_row" key={m.subject} onClick={() => openMail(i)}>
                <div className="dot" style={readIdx.has(i) ? { background: 'var(--border-strong)' } : undefined} />
                <div className="mt">
                  <div className="s1">{m.subject}</div>
                  <div className="s2">{m.from}</div>
                </div>
                <div className="time mono">{m.time}</div>
              </button>
            ))}
          </div>

          <div className="card card_pad_lg">
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>
              원문 · {mail.lang}
            </div>
            <p style={{ fontSize: 13 }}>{mail.original}</p>
            <div className="translate_box">
              <div className="lab">AI 번역 결과 · KO</div>
              <p style={{ fontSize: 13 }}>{mail.translated}</p>
            </div>

            
            <div className="form_row_inline">
              <button className="btn btn_sm btn_ghost">원문 회신</button>
              <button className="btn btn_sm btn_primary">번역 답장 작성</button>
            </div>
          </div>
        </div>
      </section>

      
      <section className="view active">
        <PageHeader
          title='AI 도면 생성 · 관리'
          description='매장 CCTV 배치를 AI로 자동 도식화해 관리합니다.'
        />
        
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
            
            <div className="form_page_footer">
              <button className="btn btn_md btn_primary">AI 도면 생성</button>
            </div>
          </div>

          
          <div className="card card_pad_lg">
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
              최근 생성 도면
            </div>
            <div style={{ aspectRatio: '4/3', background: 'var(--n-900)', border: '1px solid var(--border)', borderRadius: 8 }} />

            <div className="form_row_inline">
              <button className="btn btn_sm btn_ghost">다시 생성</button>
              <button className="btn btn_sm btn_primary">저장</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
