import { useState } from 'react';

const OPTIONS = ['관제 신청', '영상 요청', '장비 장애', '구독/결제'];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="chat_widget">
      {open && (
        <div className="chat_shell chat_panel" id="chatPanel" role="dialog" aria-modal="false" aria-labelledby="chatPanelTitle">
          <div className="chat_top">
            <span className="dot" />
            <b id="chatPanelTitle" style={{ fontSize: 13, flex: 1 }}>
              allimio 상담봇
            </b>
            <button type="button" className="chat_close" onClick={() => setOpen(false)} aria-label="채팅 닫기">
              ✕
            </button>
          </div>
          <div className="chat_body">
            <div className="msg bot">안녕하세요! 무엇을 도와드릴까요?</div>
            <div className="chat_opts">
              {OPTIONS.map((o) => (
                <span className="chat_opt" key={o}>
                  {o}
                </span>
              ))}
            </div>
            <div className="msg user">영상 요청이요</div>
            <div className="msg bot">확인할 CCTV 채널과 날짜/시간을 입력해 주세요. 예: CAM 03, 2026-08-03 21:00</div>
          </div>
          <div className="chat_input">
            <label htmlFor="chatInputField" className="sr_only">
              메시지 입력
            </label>
            <input id="chatInputField" placeholder="메시지를 입력하세요" />
            <button className="btn btn_sm btn_primary">전송</button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="chat_fab"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="chatPanel"
      >
        <span aria-hidden="true">💬</span>
        <span className="sr_only">상담 챗봇 열기</span>
      </button>
    </div>
  );
}
