import { useState } from 'react';
import { PageHeader } from '../../../components/ui';

type Period = 'week' | 'month' | 'quarter';

const PERIOD_LABEL: Record<Period, string> = { week: '주간', month: '월간', quarter: '분기' };

const PERIOD_DATA: Record<Period, { title: string; labels: string[]; values: number[] }> = {
  week: {
    title: '기간별 이벤트 발생 추이 · 주간',
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    values: [4, 6, 3, 8, 5, 10, 6],
  },
  month: {
    title: '기간별 이벤트 발생 추이 · 월간',
    labels: ['1주', '2주', '3주', '4주'],
    values: [18, 22, 15, 27],
  },
  quarter: {
    title: '기간별 이벤트 발생 추이 · 분기',
    labels: ['1월', '2월', '3월'],
    values: [64, 58, 82],
  },
};

const LEGEND = [
  { color: 'var(--amber-500)', label: '장시간 배회', pct: 34 },
  { color: '#FF7A45', label: '무단침입', pct: 24 },
  { color: 'var(--red-500)', label: '기물파손', pct: 20 },
  { color: '#C81E5C', label: '쓰러짐', pct: 14 },
  { color: 'var(--violet-500)', label: '폭행', pct: 8 },
];

export default function Test3() {
  const [period, setPeriod] = useState<Period>('week');
  const { title, labels, values } = PERIOD_DATA[period];
  const max = Math.max(...values);

  return (
    <section className="view active">
      <PageHeader title="통계 리포트" description="기간별 이벤트 발생 추이와 유형별 비중을 확인합니다." />

      <div className="period_tabs">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`period_tab${p === period ? ' active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="stats_grid">
        <div className="card kpi">
          <div className="lab">총 이벤트</div>
          <div className="val">42건</div>
          <div className="delta up">▲ 지난 기간 대비 12%</div>
        </div>
        <div className="card kpi">
          <div className="lab">평균 알림 속도</div>
          <div className="val">2.3초</div>
          <div className="delta down">▼ 0.4초 개선</div>
        </div>
        <div className="card kpi">
          <div className="lab">오탐지율</div>
          <div className="val">3.1%</div>
          <div className="delta down">▼ 1.2%p 개선</div>
        </div>
        <div className="card kpi">
          <div className="lab">최다 발생 유형</div>
          <div className="val" style={{ fontSize: 16 }}>
            장시간 배회
          </div>
          <div className="delta">전체의 34%</div>
        </div>
      </div>

      <div className="chart_row">
        <div className="card chart_card">
          <h3 className='b_title'>{title}</h3>
          <div className="bar_chart">
            {labels.map((label, i) => (
              <div className="bcol" key={label}>
                <div className="bfill" style={{ height: `${(values[i] / max) * 100}%` }} />
                <div className="blabel">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart_card">
          <h3 className='b_title'>유형별 비중</h3>
          <div className="donut_wrap">
            <div className="donut" />
            <div className="legend">
              {LEGEND.map((item) => (
                <div className="li" key={item.label}>
                  <span className="sw" style={{ background: item.color }} />
                  {item.label}
                  <span className="pct">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
