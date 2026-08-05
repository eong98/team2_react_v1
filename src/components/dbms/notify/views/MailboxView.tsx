import { useState } from 'react';

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

export default function MailboxView() {
  const [selected, setSelected] = useState(0);
  const [readIdx, setReadIdx] = useState<Set<number>>(new Set());
  const mail = MAILS[selected];

  const openMail = (i: number) => {
    setSelected(i);
    setReadIdx((prev) => new Set(prev).add(i));
  };

  return (
    <section className="view active">
      <div className="view_head">
        <h1>웹메일함 · 번역 결과</h1>
        <p>해외 매장·거래처 메일을 수신하고 번역 결과를 함께 확인합니다.</p>
      </div>
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
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn_sm btn_primary">번역 답장 작성</button>
            <button className="btn btn_sm btn_ghost">원문 회신</button>
          </div>
        </div>
      </div>
    </section>
  );
}
