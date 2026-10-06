import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { AlertModal, PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
  AUTO_REFRESH_MS,
  CHART_COLORS,
  PERIODS,
  deltaPercent,
  shortDate,
  type PeriodDays,
} from '../../../components/ts/Dashboard.ts';
import {
  PAY_COLOR,
  PAY_STATUS_BADGE,
  PAY_STATUS_LABELS,
  shortWon,
  won,
  type PayGroupAmount,
  type PayStats as PayStatsData,
} from '../../../components/ts/PayStats.ts';
import { PMETHOD_MAP } from '../../../components/ts/ShopPayment.ts';
// KPI/차트 카드 스타일은 매장 통계(/user/dashboard)와 공용 (.dashboard_page 하위 규칙)
import '../../user/dashboard/Dashboard.css';
import './payStats.css';

/* ---------------------------------------------------------------------
   /dbms/paystats - 구독권 결제 통계 (관리자).
   매장 통계(/user/dashboard)와 같은 구성/스타일입니다.

   - KPI: 결제 금액·건수(직전 기간 대비), 평균 결제액, 환불 완료,
          정상 구독, 매장연결 대기, 결제 실패/취소, 환불 처리 대기
   - 차트: 일별 결제 금액 / 일별 결제 건수 (Recharts)
   - 목록: 구독권별 매출, 결제수단별, 구독기간별, 최근 결제
   - 1분마다 조용히 자동 새로고침
--------------------------------------------------------------------- */

type AlertState = { message: string; variant?: 'success' | 'error' | 'info' } | null;

const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };

/** 차트 툴팁 - 날짜 + 금액/건수 */
function renderTooltip(name: string, fmt: (v: number) => string) {
  return ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="dash_tooltip">
        <div className="tt_label">{String(label ?? '')}</div>
        <div className="tt_value">
          {name} <b>{fmt(Number(payload[0].value ?? 0))}</b>
        </div>
      </div>
    );
  };
}

function EmptyChart({ message }: { message: string }) {
  return <div className="chart_empty">{message}</div>;
}

/** 증감 표시 (매출은 증가가 좋음 → 초록) */
function Delta({ current, prev, days }: { current: number; prev: number; days: number }) {
  const pct = deltaPercent(current, prev);
  if (pct === null) return <div className="delta neutral">직전 {days}일 데이터 없음</div>;
  if (pct === 0) return <div className="delta neutral">직전 {days}일과 동일</div>;
  const isUp = pct > 0;
  // contents.css: .delta.up = 빨강, .delta.down = 초록 → 매출 증가는 초록(down 클래스)
  return (
    <div className={`delta ${isUp ? 'down' : 'up'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(pct)}% · 직전 {days}일 대비
    </div>
  );
}

/** 항목별 금액 목록 (라벨 + 금액 + 비율 막대) */
function AmountList({ items, total, empty }: { items: PayGroupAmount[]; total: number; empty: string }) {
  if (items.length === 0) return <EmptyChart message={empty} />;
  return (
    <ul className="type_list">
      {items.map((it) => {
        const pct = total > 0 ? Math.round((it.amount / total) * 100) : 0;
        return (
          <li key={it.key} className="type_row">
            <div className="type_head">
              <span className="type_name">{it.label}</span>
              <span className="badge badge_neutral">{it.count.toLocaleString()}건</span>
              <span className="type_val mono">
                {won(it.amount)} · {pct}%
              </span>
            </div>
            <div className="type_track" aria-hidden="true">
              <div className="type_fill" style={{ width: `${pct}%`, background: PAY_COLOR }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function PayStats() {
  const [days, setDays] = useState<PeriodDays>(30);
  const [stats, setStats] = useState<PayStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [alert, setAlert] = useState<AlertState>(null);

  // 기간을 빠르게 바꿀 때 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 요청 번호로 구분
  const requestSeq = useRef(0);

  const loadStats = useCallback(
    async (silent = false) => {
      const seq = ++requestSeq.current;
      if (!silent) setLoading(true);
      try {
        const res = await axiosInstance.get<PayStatsData>('/pay_stats/stats', { params: { days } });
        if (seq !== requestSeq.current) return;
        setStats(res.data);
        setUpdatedAt(new Date().toLocaleTimeString('ko-KR', { hourCycle: 'h23' }));
      } catch (err: unknown) {
        if (seq !== requestSeq.current) return;
        console.error('결제 통계 조회 실패:', err);
        if (!silent) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          setAlert({
            message:
              status === 403
                ? '관리자만 볼 수 있습니다.'
                : status === 404
                  ? '백엔드에 /pay_stats API가 없습니다. 백엔드 서버를 최신 코드로 재시작해주세요.'
                  : '결제 통계를 불러오지 못했습니다.',
            variant: 'error',
          });
        }
      } finally {
        if (seq === requestSeq.current && !silent) setLoading(false);
      }
    },
    [days]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // 자동 새로고침 (탭이 보일 때만)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadStats(true);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadStats]);

  const summary = stats?.summary;
  const hasPayData = !!stats && stats.daily.some((p) => p.count > 0);
  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? '';
  const avgPrice = summary && summary.payCount > 0 ? Math.round(summary.payAmount / summary.payCount) : null;
  const dateTickInterval = days === 7 ? 0 : days === 30 ? 4 : 14;

  const dailyRows = useMemo(() => (stats ? stats.daily.slice().reverse() : []), [stats]);

  return (
    <section className="view active dashboard_page">
      <PageHeader
        title="구독권 결제 통계"
        description="구독권 결제 금액과 구독 현황입니다."
        actions={
          <div className="dash_toolbar">
            <button type="button" className="btn btn_outline_primary" onClick={() => loadStats()} disabled={loading}>
              {loading ? '불러오는 중' : '새로고침'}
            </button>
          </div>
        }
      />

      {/* ---- 조회기간 ---- */}
      <div className="dash_period_row">
        <div className="period_tabs" role="tablist" aria-label="조회기간">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              role="tab"
              aria-selected={p.days === days}
              className={`period_tab${p.days === days ? ' active' : ''}`}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {stats && (
          <div className="dash_range mono">
            {stats.from} ~ {stats.to}
            {updatedAt && <span> · {updatedAt} 갱신</span>}
          </div>
        )}
      </div>

      {!stats || !summary ? (
        <div className="card card_pad_lg chart_empty">{loading ? '통계를 불러오는 중...' : '표시할 통계가 없습니다.'}</div>
      ) : (
        <div className={loading ? 'stat_dash_body is_loading' : 'stat_dash_body'}>
          {/* ---- KPI 1행: 매출 ---- */}
          <div className="stats_grid">
            <div className="card kpi">
              <div className="lab">결제 금액 · {periodLabel}</div>
              <div className="val">{won(summary.payAmount)}</div>
              <Delta current={summary.payAmount} prev={summary.payAmountPrev} days={days} />
            </div>
            <div className="card kpi">
              <div className="lab">결제 건수 · {periodLabel}</div>
              <div className="val">{summary.payCount.toLocaleString()}건</div>
              <Delta current={summary.payCount} prev={summary.payCountPrev} days={days} />
            </div>
            <div className="card kpi">
              <div className="lab">평균 결제액</div>
              <div className="val">{avgPrice !== null ? won(avgPrice) : '-'}</div>
              <div className="delta neutral">결제완료 1건당</div>
            </div>
            <div className="card kpi">
              <div className="lab">환불 완료 · {periodLabel}</div>
              <div className="val">{won(summary.refundAmount)}</div>
              <div className="delta neutral">{summary.refundCount.toLocaleString()}건</div>
            </div>
          </div>

          {/* ---- KPI 2행: 구독 / 처리 현황 ---- */}
          <div className="stats_grid">
            <div className="card kpi">
              <div className="lab">정상 구독</div>
              <div className="val">{summary.activeOrders.toLocaleString()}건</div>
              <div className="delta neutral">현재 이용 중인 구독</div>
            </div>
            <div className={`card kpi${summary.waitingOrders > 0 ? ' wait' : ''}`}>
              <div className="lab">매장연결 대기</div>
              <div className="val">{summary.waitingOrders.toLocaleString()}건</div>
              <div className="delta neutral">결제 후 매장 연결 전</div>
            </div>
            <div className="card kpi">
              <div className="lab">결제 실패 / 취소</div>
              <div className="val">
                {summary.failCount.toLocaleString()} / {summary.cancelCount.toLocaleString()}
              </div>
              <div className="delta neutral">{periodLabel} 기준</div>
            </div>
            <div className={`card kpi${summary.refundPending > 0 ? ' wait' : ''}`}>
              <div className="lab">환불 처리 대기</div>
              <div className="val">{summary.refundPending.toLocaleString()}건</div>
              <div className="delta neutral">{summary.refundPending > 0 ? '처리가 필요합니다' : '대기 없음'}</div>
            </div>
          </div>

          {/* ---- 차트 1행: 일별 금액 / 건수 ---- */}
          <div className="chart_row dash_chart_row">
            <div className="card chart_card">
              <h3 className="b_title lg">일별 결제 금액</h3>
              <div className="chart_box">
                {hasPayData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.daily} margin={{ top: 8, right: 20, left: -4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="payAmountFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PAY_COLOR} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={PAY_COLOR} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickFormatter={shortDate}
                        interval={dateTickInterval}
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tickFormatter={shortWon} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '3 3' }}
                        content={renderTooltip('결제 금액', won)}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke={PAY_COLOR}
                        strokeWidth={2}
                        fill="url(#payAmountFill)"
                        dot={false}
                        activeDot={{ r: 5, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="기간 내 결제 내역이 없습니다." />
                )}
              </div>
            </div>

            <div className="card chart_card">
              <h3 className="b_title lg">일별 결제 건수</h3>
              <div className="chart_box">
                {hasPayData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.daily} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickFormatter={shortDate}
                        interval={dateTickInterval}
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: CHART_COLORS.cursor }}
                        content={renderTooltip('결제', (v) => `${v.toLocaleString()}건`)}
                      />
                      <Bar dataKey="count" fill={PAY_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="기간 내 결제 내역이 없습니다." />
                )}
              </div>
            </div>
          </div>

          {/* ---- 2행: 구독권별 / 결제수단·구독기간별 ---- */}
          <div className="chart_row dash_chart_row">
            <div className="card chart_card">
              <h3 className="b_title lg">구독권별 매출</h3>
              <AmountList items={stats.byPlan} total={summary.payAmount} empty="기간 내 결제 내역이 없습니다." />
            </div>

            <div className="card chart_card">
              <h3 className="b_title lg">결제수단별</h3>
              <AmountList items={stats.byMethod} total={summary.payAmount} empty="기간 내 결제 내역이 없습니다." />
              <h3 className="b_title lg pay_sub_title">구독기간별</h3>
              <AmountList items={stats.byMonth} total={summary.payAmount} empty="기간 내 결제 내역이 없습니다." />
            </div>
          </div>

          {/* ---- 3행: 최근 결제 ---- */}
          <div className="card chart_card dash_chart_row">
            <h3 className="b_title lg">최근 결제</h3>
            {stats.recent.length > 0 ? (
              <ul className="recent_list">
                {stats.recent.map((r) => (
                  <li key={r.no} className="recent_row">
                    <span className={`badge ${PAY_STATUS_BADGE[r.pstatus] ?? 'badge_neutral'}`}>
                      {PAY_STATUS_LABELS[r.pstatus] ?? r.pstatus}
                    </span>
                    <span className="recent_name">{r.pname ?? '-'}</span>
                    <span className="recent_meta mono">
                      {r.pmonth ? `${r.pmonth}개월` : ''}
                      {r.ccnt ? ` · CCTV ${r.ccnt}대` : ''} · {PMETHOD_MAP[r.pmethod]?.label ?? '-'} · {r.mname ?? '-'}
                    </span>
                    <span className="recent_meta mono pay_recent_price">{won(r.price)}</span>
                    <span className="recent_time mono">{r.cdate}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyChart message="결제 내역이 없습니다." />
            )}
          </div>

          {/* ---- 표로 보기 ---- */}
          <details className="card dash_table">
            <summary>일별 데이터 표로 보기</summary>
            <div className="table_wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>결제 금액</th>
                    <th>결제 건수</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((row) => (
                    <tr key={row.label}>
                      <td className="mono">{row.label}</td>
                      <td className="mono">{won(row.amount)}</td>
                      <td className="mono">{row.count.toLocaleString()}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}
