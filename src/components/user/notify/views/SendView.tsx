import { useState } from 'react';

const CHANNELS = ['SMS', '이메일', '카카오알림톡'];

export default function SendView() {
  const [channel, setChannel] = useState('SMS');
  const [message, setMessage] = useState(
    '[allimio] 본점 CAM 03에서 폭행 의심 상황이 감지되었습니다(신뢰도 94%). 대시보드에서 즉시 확인해주세요.',
  );

  return (
    <section className="view active">
      <div className="view_head">
        <h1>발송 관리</h1>
        <p>이상행동 감지 시 발송될 SMS·메일을 작성하고 즉시 발송할 수 있습니다.</p>
      </div>
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
          <button className="btn btn_md btn_primary">지금 발송하기</button>
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
  );
}
