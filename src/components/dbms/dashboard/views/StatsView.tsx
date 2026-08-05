import { useState } from 'react';
import { PERIOD_DATA } from '../mock';

type Period = 'week' | 'month' | 'quarter';

const PERIOD_LABEL: Record<Period, string> = { week: '주간', month: '월간', quarter: '분기' };

export default function StatsView() {
  const [period, setPeriod] = useState<Period>('week');
  const data = PERIOD_DATA[period];
  const max = Math.max(...data.values);

  return (
    <section className="view active">
      <div className="view_head">
        <h1>통계 리포트</h1>
        <p>기간별 이벤트 발생 추이와 유형별 비중을 확인합니다.</p>
      </div>

      <div className="period_tabs">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
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
          <h3>{data.title}</h3>
          <div className="bar_chart">
            {data.labels.map((lab, i) => (
              <div className="bcol" key={lab}>
                <div className="bfill" style={{ height: `${((data.values[i] / max) * 100).toFixed(0)}%` }} />
                <div className="blabel">{lab}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card chart_card">
          <h3>유형별 비중</h3>
          <div className="donut_wrap">
            <div className="donut" />
            <div className="legend">
              <div className="li">
                <span className="sw" style={{ background: 'var(--amber-500)' }} />
                장시간 배회<span className="pct">34%</span>
              </div>
              <div className="li">
                <span className="sw" style={{ background: '#FF7A45' }} />
                무단침입<span className="pct">24%</span>
              </div>
              <div className="li">
                <span className="sw" style={{ background: 'var(--red-500)' }} />
                기물파손<span className="pct">20%</span>
              </div>
              <div className="li">
                <span className="sw" style={{ background: '#C81E5C' }} />
                쓰러짐<span className="pct">14%</span>
              </div>
              <div className="li">
                <span className="sw" style={{ background: 'var(--violet-500)' }} />
                폭행<span className="pct">8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
