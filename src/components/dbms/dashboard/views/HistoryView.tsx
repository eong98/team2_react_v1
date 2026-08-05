import { useMemo, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { CAMERAS, statusBadgeClass, type EventStatus } from '../mock';

const TYPES = ['폭행', '기물파손', '쓰러짐', '무단침입', '장시간 배회'];
const STATUSES: EventStatus[] = ['대기', '처리완료', '오탐지'];

export default function HistoryView() {
  const { events, openDetail } = useDashboard();
  const [cam, setCam] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [appliedFilter, setAppliedFilter] = useState({ cam: '', type: '', status: '' });

  const filtered = useMemo(() => {
    const { cam: fc, type: ft, status: fs } = appliedFilter;
    return events.filter((ev) => (!fc || ev.cam === fc) && (!ft || ev.type === ft) && (!fs || ev.status === fs));
  }, [events, appliedFilter]);

  const applyFilter = () => setAppliedFilter({ cam, type, status });
  const resetFilter = () => {
    setCam('');
    setType('');
    setStatus('');
    setAppliedFilter({ cam: '', type: '', status: '' });
  };

  return (
    <section className="view active">
      <div className="view_head">
        <h1>이벤트 이력</h1>
        <p>날짜·카메라·유형별로 필터링해 지난 이벤트를 확인할 수 있습니다.</p>
      </div>

      <div className="filter_bar">
        <select value={cam} onChange={(e) => setCam(e.target.value)}>
          <option value="">전체 카메라</option>
          {CAMERAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">전체 유형</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체 상태</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn_ghost" onClick={applyFilter}>
          필터 적용
        </button>
        <button className="btn btn_ghost" onClick={resetFilter}>
          초기화
        </button>
      </div>

      <table className="hist_table">
        <thead>
          <tr>
            <th>시간</th>
            <th>카메라</th>
            <th>유형</th>
            <th>신뢰도</th>
            <th>상태</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr className="empty_row">
              <td colSpan={6}>조건에 맞는 이벤트가 없습니다.</td>
            </tr>
          ) : (
            filtered.map((ev) => (
              <tr className="rowclick" key={ev.id} onClick={() => openDetail(ev.id)}>
                <td className="t_mono">
                  {ev.date} {ev.time}
                </td>
                <td>{ev.cam}</td>
                <td>{ev.type}</td>
                <td className="t_mono">{ev.confidence}%</td>
                <td>
                  <span className={`badge ${statusBadgeClass(ev.status)}`}>{ev.status}</span>
                </td>
                <td>
                  <button
                    className="btn btn_ghost"
                    style={{ padding: '6px 12px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(ev.id);
                    }}
                  >
                    보기
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
