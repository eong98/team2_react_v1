import { useState } from 'react';
import Modal from '../../../ui/Modal';

const ISSUES = [
  { time: '2026-08-03 14:32:07', cam: '본점 · CAM 03', type: '폭행', typeTone: 'badge_danger', conf: '94%', audio: '🔊 있음', audioTone: 'badge_info', status: '미해결', statusTone: 'badge_warning' },
  { time: '2026-08-02 21:05:33', cam: '2호점 · CAM 06', type: '장시간 배회', typeTone: 'badge_warning', conf: '76%', audio: '없음', audioTone: 'badge_neutral', status: '해결', statusTone: 'badge_success' },
  { time: '2026-07-22 23:40:10', cam: '3호점 · CAM 02', type: '기물파손', typeTone: 'badge_danger', conf: '91%', audio: '🔊 있음', audioTone: 'badge_info', status: '오탐 처리', statusTone: 'badge_neutral' },
];

const WAVE_BARS = [10, 6, 12, 2, 8, 4, 10, 0, 9, 6, 11, 3, 8, 1, 10, 7, 9, 12, 4, 10];

export default function IssuesView() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="view active">
      <div className="view_head">
        <div>
          <h1>CCTV 이슈 원장</h1>
          <p>감지된 이상행동 이벤트의 처리 상태를 관리합니다. 실시간 대응은 관제 대시보드, 이 화면은 이슈 데이터 원장/사후 검토용입니다.</p>
        </div>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>발생일시</th>
              <th>CCTV</th>
              <th>유형(code)</th>
              <th>신뢰도</th>
              <th>오디오 증거</th>
              <th>처리상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ISSUES.map((i) => (
              <tr key={i.time}>
                <td className="mono">{i.time}</td>
                <td>{i.cam}</td>
                <td>
                  <span className={`badge ${i.typeTone}`}>{i.type}</span>
                </td>
                <td className="mono">{i.conf}</td>
                <td>
                  <span className={`badge ${i.audioTone}`}>{i.audio}</span>
                </td>
                <td>
                  <span className={`badge ${i.statusTone}`}>{i.status}</span>
                </td>
                <td className="actions">
                  <button className="btn btn_sm btn_ghost" onClick={() => setModalOpen(true)}>
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titleId="issueModalTitle"
        title="이슈 상세 · 본점 CAM 03 · 폭행 의심"
        footer={
          <>
            <button className="btn btn_md btn_ghost" onClick={() => setModalOpen(false)}>
              오탐 처리
            </button>
            <button className="btn btn_md btn_primary" onClick={() => setModalOpen(false)}>
              해결 완료
            </button>
          </>
        }
      >
        <div style={{ aspectRatio: '16/9', background: 'var(--n-900)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14 }} />
        <div className="grid_2" style={{ marginBottom: 14 }}>
          <div className="form_group" style={{ marginBottom: 0 }}>
            <span className="form_label">신뢰도</span>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--red-200)' }}>
              94%
            </div>
          </div>
          <div className="form_group" style={{ marginBottom: 0 }}>
            <span className="form_label">발생 시각</span>
            <div className="mono" style={{ fontSize: 13 }}>
              2026-08-03 14:32:07
            </div>
          </div>
        </div>
        <div className="form_group">
          <span className="form_label" id="audioEvidenceLabel">
            오디오 증거 (ISSUE_AUDIO)
          </span>
          <div style={{ background: 'var(--n-900)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }} role="group" aria-labelledby="audioEvidenceLabel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <button type="button" className="btn btn_sm btn_ghost" aria-label="오디오 재생">
                ▶
              </button>
              <svg width="100%" height="28" viewBox="0 0 260 28" preserveAspectRatio="none" aria-hidden="true">
                <g fill="var(--border-strong)">
                  {WAVE_BARS.map((h, i) => (
                    <rect key={i} x={i * 6} y={14 - h / 2} width="3" height={h || 1} />
                  ))}
                </g>
              </svg>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              SOUNDLEVEL 78dB · THRESHOLDLEVEL 60dB 초과 · 기기 ESP-AUD-01
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}
