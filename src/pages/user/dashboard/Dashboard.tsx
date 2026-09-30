import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { GlobalCurrentShop } from '../../../store/UserStore.ts';
import { STATE_BADGE as ISSUE_STATE_BADGE, STATE_LABELS as ISSUE_STATE_LABELS, formatReliability } from '../../../components/ts/CctvIssue.ts';
import {
  AUTO_REFRESH_MS,
  CCTV_STATE_BADGE,
  CCTV_STATE_LABELS,
  CHART_COLORS,
  PERIODS,
  SEVERITY_BADGE,
  SEVERITY_LABELS,
  deltaPercent,
  shortDate,
  type DashboardShop,
  type DashboardStats,
  type PeriodDays,
} from '../../../components/ts/Dashboard.ts';
import './Dashboard.css';

/* ---------------------------------------------------------------------
   /user/dashboard - 매장 통계 대시보드.

   [매장 / 소속매장]
   - GET /dashboard/shops 로 "내가 볼 수 있는 매장"(점주: SHOP.MNO 소유, 직원: SHOP_MEMBER 배정)을
     받아서 상단 드롭다운에 보여줍니다. 서버가 쿠키 JWT로 회원을 식별하므로 mno를 보내지 않습니다.
   - 기본 선택은 Topbar와 같은 GlobalCurrentShop().no. 목록에 없는 매장(다른 계정으로 입장했던
     값 등)이면 첫 번째 매장으로 바꿔 끼웁니다.
   - 드롭다운에서 매장을 바꾸면 setShop()도 같이 호출 → Topbar 매장명 / CCTV 화면도 같은 매장으로 맞춰짐.
   - 소속이 아닌 매장 번호로 요청하면 서버가 403을 돌려줍니다(화면 조작 방지).

   [통계]
   - KPI: 방문객 수(직전 기간 대비), 평균 체류시간, 이슈 발생(직전 기간 대비), 현재 인원,
          미확인 이슈, 오탐률, CCTV 정상 가동
   - 차트: 일별 방문객 / 시간대별 방문객 / 일별 이슈 / 유형별 이슈  (Recharts)
   - 목록: 최근 이슈 5건, CCTV 상태
   - 1분마다 조용히 자동 새로고침
--------------------------------------------------------------------- */

type AlertState = { message: string; variant?: 'success' | 'error' | 'info'; onConfirm?: () => void } | null;

/** 축 공통 스타일 - 눈에 덜 띄게(데이터가 주인공) */
const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };

/**
 * 차트 공통 툴팁. Recharts가 hover 중인 칸의 active/payload/label을 넣어줍니다.
 * @param unit 값 뒤 단위 (명, 건)
 * @param name 지표 이름 (방문객, 이슈)
 * @param fmtLabel x축 라벨 가공 (날짜 → 'MM-dd', 시간 → 'HH시')
 */
function renderTooltip(name: string, unit: string, fmtLabel: (label: string) => string) {
  return ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="dash_tooltip">
        <div className="tt_label">{fmtLabel(String(label ?? ''))}</div>
        <div className="tt_value">
          {name} <b>{Number(payload[0].value ?? 0).toLocaleString()}</b>
          {unit}
        </div>
      </div>
    );
  };
}

/** 데이터가 전부 0일 때 빈 차트 대신 보여줄 안내 */
function EmptyChart({ message }: { message: string }) {
  return <div className="chart_empty">{message}</div>;
}

/** 증감 표시. goodWhenUp=true(방문객)면 증가가 초록, false(이슈)면 증가가 빨강 */
function Delta({ current, prev, days, goodWhenUp }: { current: number; prev: number; days: number; goodWhenUp: boolean }) {
  const pct = deltaPercent(current, prev);
  if (pct === null) {
    return <div className="delta neutral">직전 {days}일 데이터 없음</div>;
  }
  if (pct === 0) {
    return <div className="delta neutral">직전 {days}일과 동일</div>;
  }
  const isUp = pct > 0;
  // contents.css: .delta.up = 빨강(나쁨), .delta.down = 초록(좋음) → 방문객은 반대로 매핑
  const cls = isUp === goodWhenUp ? 'down' : 'up';
  return (
    <div className={`delta ${cls}`}>
      {isUp ? '▲' : '▼'} {Math.abs(pct)}% · 직전 {days}일 대비
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const currentShopNo = GlobalCurrentShop((state) => state.no);
  const setShop = GlobalCurrentShop((state) => state.setShop);

  const [shops, setShops] = useState<DashboardShop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);

  const [days, setDays] = useState<PeriodDays>(7);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [alert, setAlert] = useState<AlertState>(null);

  // 매장/기간을 빠르게 바꿀 때 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 요청 번호로 구분
  const requestSeq = useRef(0);

  // 현재 선택 매장: GlobalCurrentShop이 내 매장 목록에 있을 때만 유효
  const selectedShop = useMemo(
    () => shops.find((s) => s.no === currentShopNo) ?? null,
    [shops, currentShopNo]
  );

  /* ---- 1) 내 매장 목록 ---- */
  useEffect(() => {
    let alive = true;
    setShopsLoading(true);
    axiosInstance
      .get<DashboardShop[]>('/dashboard/shops')
      .then((res) => {
        if (!alive) return;
        setShops(res.data);
      })
      .catch((err) => {
        console.error('매장 목록 조회 실패:', err);
        if (alive) setAlert({ message: '매장 목록을 불러오지 못했습니다.', variant: 'error' });
      })
      .finally(() => {
        if (alive) setShopsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ---- 2) 선택 매장 보정: 목록에 없는 매장이면 첫 매장으로 ---- */
  useEffect(() => {
    if (shopsLoading || shops.length === 0) return;
    if (!selectedShop) {
      setShop({ no: shops[0].no, title: shops[0].title ?? '' });
    }
  }, [shopsLoading, shops, selectedShop, setShop]);

  /* ---- 3) 통계 조회 ---- */
  const loadStats = useCallback(
    async (silent = false) => {
      if (!selectedShop) return;
      const seq = ++requestSeq.current;
      if (!silent) setLoading(true);

      try {
        const res = await axiosInstance.get<DashboardStats>('/dashboard/stats', {
          params: { sno: selectedShop.no, days },
        });
        if (seq !== requestSeq.current) return; // 더 최신 요청이 있으면 버림
        setStats(res.data);
        setUpdatedAt(new Date().toLocaleTimeString('ko-KR', { hourCycle: 'h23' }));
      } catch (err: unknown) {
        if (seq !== requestSeq.current) return;
        console.error('매장 통계 조회 실패:', err);
        // 자동 새로고침 실패는 조용히 넘어가고, 사용자가 직접 부른 조회만 알림
        if (!silent) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          setAlert({
            message: status === 403 ? '소속된 매장의 통계만 볼 수 있습니다.' : '통계를 불러오지 못했습니다.',
            variant: 'error',
          });
        }
      } finally {
        if (seq === requestSeq.current && !silent) setLoading(false);
      }
    },
    [selectedShop, days]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ---- 4) 자동 새로고침 (탭이 보일 때만) ---- */
  useEffect(() => {
    if (!selectedShop) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadStats(true);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [selectedShop, loadStats]);

  const onChangeShop = (no: number) => {
    const shop = shops.find((s) => s.no === no);
    if (shop) setShop({ no: shop.no, title: shop.title ?? '' });
  };

  /* ---- 파생값 ---- */
  const summary = stats?.summary;
  const hasVisitorData = !!stats && stats.visitorDaily.some((p) => p.value > 0);
  const hasIssueData = !!stats && stats.issueDaily.some((p) => p.value > 0);
  const falseRate =
    summary && summary.issueCount > 0 ? Math.round((summary.falseIssues / summary.issueCount) * 100) : null;
  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? '';

  // [추가] 기간 내 이슈가 없을 때 "차트가 고장났다"로 오해하지 않도록 마지막 감지 시각을 같이 안내
  const lastIssueAt = stats?.recentIssues[0]?.cdate;
  const emptyIssueMsg = lastIssueAt
    ? `기간 내 감지된 이상행동이 없습니다. (마지막 감지 ${lastIssueAt.slice(0, 10)} · 기간을 늘려보세요)`
    : '기간 내 감지된 이상행동이 없습니다.';

  // 표 보기용: 날짜별 방문객 + 이슈를 한 줄로 합침 (차트를 못 보는 경우 / 정확한 숫자 확인용)
  const dailyRows = useMemo(() => {
    if (!stats) return [];
    return stats.visitorDaily.map((p, i) => ({
      date: p.label,
      visitors: p.value,
      issues: stats.issueDaily[i]?.value ?? 0,
    }));
  }, [stats]);

  // 기간이 길면 x축 라벨이 겹치므로 간격을 늘림 (7일: 전부, 30일: 5일 간격, 90일: 15일 간격)
  const dateTickInterval = days === 7 ? 0 : days === 30 ? 4 : 14;

  /* ---- 매장 목록 로딩 / 매장 없음 ---- */
  if (shopsLoading) {
    return (
      <section className="view active dashboard_page">
        <PageHeader title="매장 통계" description="매장 정보를 확인하고 있습니다." />
        <div className="card card_pad_lg chart_empty">불러오는 중...</div>
      </section>
    );
  }

  if (shops.length === 0) {
    return (
      <section className="view active dashboard_page">
        <PageHeader title="매장 통계" description="소속된 매장이 있어야 통계를 확인할 수 있습니다." />
        <div className="card card_pad_lg dash_empty_state">
          <p className="b_title">소유하거나 소속된 매장이 없습니다.</p>
          <p className="b_title sm">매장을 등록하거나, 점주에게 받은 초대코드로 매장에 합류해주세요.</p>
          <div className="dash_empty_actions">
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
              매장 관리
            </button>
            <button type="button" className="btn btn_md btn_outline_primary" onClick={() => navigate('/user/invite')}>
              초대코드 입력
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view active dashboard_page">
      <PageHeader
        title="매장 통계"
        description={`${selectedShop?.title ?? '선택한 매장'}의 방문객과 이상행동 발생 현황입니다.`}
        actions={
          <div className="dash_toolbar">
            <select
              className="form_select"
              value={selectedShop?.no ?? ''}
              onChange={(e) => onChangeShop(Number(e.target.value))}
              aria-label="매장 선택"
            >
              {shops.map((s) => (
                <option key={s.no} value={s.no}>
                  {s.title} {s.role === 'STAFF' ? '(소속)' : ''}
                </option>
              ))}
            </select>
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
        // [수정] dash_body → stat_dash_body : 랜딩(home.css)의 .dash_body(grid 3열)와 이름이 겹쳐 레이아웃이 깨졌음
        <div className={loading ? 'stat_dash_body is_loading' : 'stat_dash_body'}>
          {/* ---- KPI 1행: 기간 지표 ---- */}
          <div className="stats_grid">
            <div className="card kpi">
              <div className="lab">방문객 수 · {periodLabel}</div>
              <div className="val">{summary.visitorCount.toLocaleString()}명</div>
              <Delta current={summary.visitorCount} prev={summary.visitorCountPrev} days={days} goodWhenUp />
            </div>
            <div className="card kpi">
              <div className="lab">평균 체류시간</div>
              <div className="val">{summary.avgStayMinutes != null ? `${summary.avgStayMinutes}분` : '-'}</div>
              <div className="delta neutral">장시간 체류 {summary.longStayCount.toLocaleString()}건</div>
            </div>
            <div className="card kpi">
              <div className="lab">이상행동 발생 · {periodLabel}</div>
              <div className="val">{summary.issueCount.toLocaleString()}건</div>
              <Delta current={summary.issueCount} prev={summary.issueCountPrev} days={days} goodWhenUp={false} />
            </div>
            <div className="card kpi">
              <div className="lab">현재 매장 인원</div>
              <div className="val">{summary.currentVisitors.toLocaleString()}명</div>
              <div className="delta neutral">입장 후 아직 퇴장하지 않은 손님</div>
            </div>
          </div>

          {/* ---- KPI 2행: 처리/설비 상태 ---- */}
          <div className="stats_grid">
            <div className={`card kpi${summary.unconfirmedIssues > 0 ? ' wait' : ''}`}>
              <div className="lab">미확인 이슈</div>
              <div className="val">{summary.unconfirmedIssues.toLocaleString()}건</div>
              <button type="button" className="kpi_link" onClick={() => navigate('/user/cctvissue')}>
                이슈 확인하러 가기 →
              </button>
            </div>
            <div className="card kpi">
              <div className="lab">정탐 / 오탐</div>
              <div className="val">
                {summary.confirmedIssues.toLocaleString()} / {summary.falseIssues.toLocaleString()}
              </div>
              <div className="delta neutral">{falseRate !== null ? `오탐률 ${falseRate}%` : '판정된 이슈 없음'}</div>
            </div>
            <div className={`card kpi${summary.cctvTotal > summary.cctvNormal ? ' wait' : ''}`}>
              <div className="lab">CCTV 정상 가동</div>
              <div className="val">
                {summary.cctvNormal} / {summary.cctvTotal}대
              </div>
              <div className="delta neutral">
                {summary.cctvTotal === 0
                  ? '등록된 CCTV 없음'
                  : summary.cctvTotal > summary.cctvNormal
                    ? `점검·고장 ${summary.cctvTotal - summary.cctvNormal}대`
                    : '전체 정상'}
              </div>
            </div>
            <div className="card kpi">
              <div className="lab">일평균 방문객</div>
              <div className="val">{(Math.round((summary.visitorCount / days) * 10) / 10).toLocaleString()}명</div>
              <div className="delta neutral">{periodLabel} 기준</div>
            </div>
          </div>

          {/* ---- 차트 1행: 방문객 ---- */}
          <div className="chart_row dash_chart_row">
            <div className="card chart_card">
              <h3 className="b_title lg">일별 방문객 추이</h3>
              <div className="chart_box">
                {hasVisitorData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.visitorDaily} margin={{ top: 8, right: 20, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashVisitorFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.visitor} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={CHART_COLORS.visitor} stopOpacity={0} />
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
                      <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '3 3' }}
                        content={renderTooltip('방문객', '명', (l) => l)}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.visitor}
                        strokeWidth={2}
                        fill="url(#dashVisitorFill)"
                        dot={false}
                        activeDot={{ r: 5, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="기간 내 방문 기록이 없습니다." />
                )}
              </div>
            </div>

            <div className="card chart_card">
              <h3 className="b_title lg">시간대별 방문객</h3>
              <div className="chart_box">
                {hasVisitorData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.visitorHourly} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="label" interval={2} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: CHART_COLORS.cursor }} content={renderTooltip('방문객', '명', (l) => `${l}시`)} />
                      <Bar dataKey="value" fill={CHART_COLORS.visitor} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="기간 내 방문 기록이 없습니다." />
                )}
              </div>
            </div>
          </div>

          {/* ---- 차트 2행: 이슈 ---- */}
          <div className="chart_row dash_chart_row">
            <div className="card chart_card">
              <h3 className="b_title lg">일별 이상행동 발생</h3>
              <div className="chart_box">
                {hasIssueData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.issueDaily} margin={{ top: 8, right: 20, left: -16, bottom: 0 }}>
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
                      <Tooltip cursor={{ fill: CHART_COLORS.cursor }} content={renderTooltip('이슈', '건', (l) => l)} />
                      <Bar dataKey="value" fill={CHART_COLORS.issue} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message={emptyIssueMsg} />
                )}
              </div>
            </div>

            <div className="card chart_card">
              <h3 className="b_title lg">유형별 이상행동</h3>
              {stats.issueByCode.length > 0 ? (
                /* 유형은 5종 내외라 막대 차트 대신 "라벨 + 값 + 비율 막대" 목록이 더 읽기 쉬움 */
                <ul className="type_list">
                  {stats.issueByCode.map((c) => {
                    const pct = summary.issueCount > 0 ? Math.round((c.value / summary.issueCount) * 100) : 0;
                    return (
                      <li key={c.code} className="type_row">
                        <div className="type_head">
                          <span className="type_name">{c.codeName}</span>
                          <span className={`badge ${SEVERITY_BADGE[c.severity] ?? 'badge_neutral'}`}>
                            위험도 {SEVERITY_LABELS[c.severity] ?? c.severity}
                          </span>
                          <span className="type_val mono">
                            {c.value.toLocaleString()}건 · {pct}%
                          </span>
                        </div>
                        <div className="type_track" aria-hidden="true">
                          <div className="type_fill" style={{ width: `${pct}%`, background: CHART_COLORS.issue }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyChart message={emptyIssueMsg} />
              )}
            </div>
          </div>

          {/* ---- 3행: 최근 이슈 / CCTV 상태 ---- */}
          <div className="chart_row dash_chart_row">
            <div className="card chart_card">
              <div className="dash_card_head">
                <h3 className="b_title lg">최근 이상행동</h3>
                <button type="button" className="kpi_link" onClick={() => navigate('/user/cctvissue')}>
                  전체 보기 →
                </button>
              </div>
              {stats.recentIssues.length > 0 ? (
                <ul className="recent_list">
                  {stats.recentIssues.map((r) => (
                    <li key={r.no} className="recent_row">
                      <span className={`badge ${ISSUE_STATE_BADGE[r.state] ?? 'badge_neutral'}`}>
                        {ISSUE_STATE_LABELS[r.state] ?? r.state}
                      </span>
                      <span className="recent_name">{r.codeName}</span>
                      <span className="recent_meta mono">
                        CCTV #{r.cno} · 신뢰도 {formatReliability(r.reliability)}
                      </span>
                      <span className="recent_time mono">{r.cdate}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyChart message="감지된 이상행동이 없습니다." />
              )}
            </div>

            <div className="card chart_card">
              <div className="dash_card_head">
                <h3 className="b_title lg">CCTV 상태</h3>
                <button type="button" className="kpi_link" onClick={() => navigate('/user/cctv')}>
                  CCTV 관리 →
                </button>
              </div>
              {stats.cctvByState.length > 0 ? (
                <ul className="recent_list">
                  {stats.cctvByState.map((c) => (
                    <li key={c.state} className="recent_row">
                      <span className={`badge ${CCTV_STATE_BADGE[c.state] ?? 'badge_neutral'}`}>
                        {CCTV_STATE_LABELS[c.state] ?? c.state}
                      </span>
                      <span className="recent_meta mono">{c.value}대</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyChart message="등록된 CCTV가 없습니다." />
              )}
            </div>
          </div>

          {/* ---- 표로 보기 (정확한 수치 확인 / 차트 대체 텍스트) ---- */}
          <details className="card dash_table">
            <summary>일별 데이터 표로 보기</summary>
            <div className="table_wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>방문객</th>
                    <th>이상행동</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows
                    .slice()
                    .reverse()
                    .map((row) => (
                      <tr key={row.date}>
                        <td className="mono">{row.date}</td>
                        <td className="mono">{row.visitors.toLocaleString()}명</td>
                        <td className="mono">{row.issues.toLocaleString()}건</td>
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
        onConfirm={alert?.onConfirm}
      />
    </section>
  );
}
