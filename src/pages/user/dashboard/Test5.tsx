import { useState } from 'react';
import { PageHeader } from '../../../components/ui';

interface SensitivityItem {
  key: string;
  label: string;
  value: number;
}

interface Integration {
  icon: string;
  name: string;
  desc: string;
  on: boolean;
}

const INITIAL_SENSITIVITY: SensitivityItem[] = [
  { key: 'assault', label: '폭행', value: 90 },
  { key: 'damage', label: '기물파손', value: 75 },
  { key: 'fall', label: '쓰러짐(응급)', value: 95 },
  { key: 'intrusion', label: '무단침입', value: 80 },
  { key: 'loiter', label: '장시간 배회', value: 60 },
];

const INITIAL_INTEGRATIONS: Integration[] = [
  { icon: '🚓', name: '경찰 신고 자동 연동', desc: '폭행·무단침입 감지 시 관할 경찰서로 자동 연계', on: false },
  { icon: '🚑', name: '119 신고 자동 연동', desc: '쓰러짐(응급) 감지 시 119로 자동 연계', on: false },
  { icon: '🛡️', name: '보안업체 연동', desc: '위험도 높은 이벤트를 계약 보안업체로 자동 전달', on: false },
];

const ADMIN_TOOLS = [
  { icon: '👤', label: '회원', href: '/member' },
  { icon: '🏬', label: '매장 · CCTV 관리', href: '/store' },
  { icon: '✉', label: '알림 · 메일', href: '/notify' },
  { icon: '💬', label: '게시판 · 챗봇 · 구독', href: '/board' },
  { icon: '🏠', label: '랜딩 페이지로', href: '/' },
];

export default function Test5() {
  const [sensitivity, setSensitivity] = useState(INITIAL_SENSITIVITY);
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [channels, setChannels] = useState({ push: true, sms: true, email: false });

  const updateSensitivity = (key: string, value: number) => {
    setSensitivity((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const toggleIntegration = (i: number, on: boolean) => {
    setIntegrations((prev) => prev.map((t, idx) => (idx === i ? { ...t, on } : t)));
  };

  return (
    <section className="view active">
      <PageHeader title="설정" description="이상행동 유형별 알림 민감도와 외부 연동 서비스를 관리합니다." />

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
                value={s.value}
                onChange={(e) => updateSensitivity(s.key, Number(e.target.value))}
              />
              <div className="sval">{s.value}%</div>
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
              <span className={`badge ${t.on ? 'badge_success' : 'badge_neutral'}`}>{t.on ? '연동됨' : '미연동'}</span>
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
          {ADMIN_TOOLS.map((tool) => (
            <a key={tool.label} href={tool.href} className="nav_item" style={{ border: '1px solid var(--border)' }}>
              {tool.icon} {tool.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
