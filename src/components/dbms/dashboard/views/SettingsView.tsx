import { useState } from 'react';
import { INTEGRATIONS, SENSITIVITY } from '../mock';

export default function SettingsView() {
  const [sensitivity, setSensitivity] = useState(SENSITIVITY);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [channels, setChannels] = useState({ push: true, sms: true, email: false });

  const updateSensitivity = (key: string, val: number) => {
    setSensitivity((prev) => prev.map((s) => (s.key === key ? { ...s, val } : s)));
  };

  const toggleIntegration = (i: number, on: boolean) => {
    setIntegrations((prev) => prev.map((t, idx) => (idx === i ? { ...t, on } : t)));
  };

  return (
    <section className="view active">
      <div className="view_head">
        <h1>설정</h1>
        <p>이상행동 유형별 알림 민감도와 외부 연동 서비스를 관리합니다.</p>
      </div>

      <div className="card settings_section">
        <h3>알림 민감도</h3>
        <div className="desc">값이 높을수록 더 민감하게 감지하지만, 오탐지가 늘어날 수 있습니다.</div>
        <div>
          {sensitivity.map((s) => (
            <div className="slider_row" key={s.key}>
              <div className="slabel">{s.label}</div>
              <input
                type="range"
                min={0}
                max={100}
                value={s.val}
                onChange={(e) => updateSensitivity(s.key, Number(e.target.value))}
              />
              <div className="sval">{s.val}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card settings_section">
        <h3>연동 서비스</h3>
        <div className="desc">위험도가 높은 이벤트를 외부 대응 체계로 자동 전달합니다.</div>
        <div>
          {integrations.map((t, i) => (
            <div className="toggle_row" key={t.name}>
              <div className="ticon">{t.icon}</div>
              <div className="tinfo">
                <div className="tname">{t.name}</div>
                <div className="tdesc">{t.desc}</div>
              </div>
              <span className={`badge ${t.on ? 'ok' : 'neutral'}`}>{t.on ? '연동됨' : '미연동'}</span>
              <label className="switch">
                <input type="checkbox" checked={t.on} onChange={(e) => toggleIntegration(i, e.target.checked)} />
                <span className="slider_el" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="card settings_section">
        <h3>알림 수신 방법</h3>
        <div className="desc">이상행동 감지 시 알림을 받을 채널을 선택하세요.</div>
        <div className="check_row">
          <input
            type="checkbox"
            id="ck1"
            checked={channels.push}
            onChange={(e) => setChannels((c) => ({ ...c, push: e.target.checked }))}
          />
          <label htmlFor="ck1">앱 푸시 알림</label>
        </div>
        <div className="check_row">
          <input
            type="checkbox"
            id="ck2"
            checked={channels.sms}
            onChange={(e) => setChannels((c) => ({ ...c, sms: e.target.checked }))}
          />
          <label htmlFor="ck2">SMS 문자 알림</label>
        </div>
        <div className="check_row">
          <input
            type="checkbox"
            id="ck3"
            checked={channels.email}
            onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))}
          />
          <label htmlFor="ck3">이메일 알림</label>
        </div>
      </div>

      <div className="card settings_section">
        <h3>관리자 도구</h3>
        <div className="desc">회원·매장·알림·게시판 관리는 별도 화면에서 진행합니다.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="/member" className="nav_item" style={{ border: '1px solid var(--border)' }}>
            👤 회원
          </a>
          <a href="/store" className="nav_item" style={{ border: '1px solid var(--border)' }}>
            🏬 매장 · CCTV 관리
          </a>
          <a href="/notify" className="nav_item" style={{ border: '1px solid var(--border)' }}>
            ✉ 알림 · 메일
          </a>
          <a href="/board" className="nav_item" style={{ border: '1px solid var(--border)' }}>
            💬 게시판 · 챗봇 · 구독
          </a>
          <a href="/" className="nav_item" style={{ border: '1px solid var(--border)' }}>
            🏠 랜딩 페이지로
          </a>
        </div>
      </div>
    </section>
  );
}
