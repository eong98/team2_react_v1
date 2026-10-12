import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
  shortDate,
  type PeriodDays,
} from '../../../components/ts/Dashboard.ts';
import {
  CHAT_DISSATISFIED_COLOR,
  CHAT_SATISFIED_COLOR,
  getChatSentiment,
  percent,
  percentText,
  type ChatAiSummary,
  type ChatGroupCount,
  type ChatStats as ChatStatsData,
} from '../../../components/ts/ChatStats.ts';
// KPI/차트 카드 스타일은 매장 통계(/user/dashboard)와 공용 (.dashboard_page 하위 규칙)
import '../../user/dashboard/Dashboard.css';
import './chatStats.css';

/* ---------------------------------------------------------------------
   /dbms/chatstats - 챗봇 상담 만족도 통계 (관리자).
   결제 통계(/dbms/paystats)와 같은 구성/스타일입니다.

   상담을 끝낼 때 받는 만족도 조사(만족/불만족 → 불만족 사유)를 모아 보여줍니다.
   - AI 감정분석 · 요약: [AI 분석] 버튼을 눌렀을 때만 실행 (요약 + 긍정/부정 점수 + 개선할 점)
   - KPI: 만족률(직전 기간 대비), 응답 수·응답률, 불만족 수, 종료된 상담,
          관리자 문의 연결, 자동 종료, 진행 중 상담
   - 차트: 일별 만족/불만족 응답 수, 일별 만족률
   - 목록: 불만족 사유, 종료 사유, 회원·비회원별, 최근 불만족 의견
   - 1분마다 조용히 자동 새로고침
--------------------------------------------------------------------- */

type AlertState = { message: string; variant?: 'success' | 'error' | 'info' } | null;

const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };

function EmptyChart({ message }: { message: string }) {
  return <div className="chart_empty">{message}</div>;
}

/** 일별 응답 수 툴팁 - 날짜 + 만족/불만족 */
function CountTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as { satisfied: number; dissatisfied: number };
  return (
    <div className="dash_tooltip">
      <div className="tt_label">{String(label ?? '')}</div>
      <div className="tt_value">
        만족 <b>{row.satisfied.toLocaleString()}건</b>
      </div>
      <div className="tt_value">
        불만족 <b>{row.dissatisfied.toLocaleString()}건</b>
      </div>
    </div>
  );
}

/** 일별 만족률 툴팁 */
function RateTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as { rate: number | null; answered: number };
  return (
    <div className="dash_tooltip">
      <div className="tt_label">{String(label ?? '')}</div>
      <div className="tt_value">
        만족률 <b>{row.rate === null ? '-' : `${row.rate}%`}</b>
      </div>
      <div className="tt_value">응답 {row.answered.toLocaleString()}건</div>
    </div>
  );
}

/** 만족률 증감 (퍼센트포인트) — 만족률은 오르는 게 좋음 → 초록 */
function RateDelta({ current, prev, days }: { current: number | null; prev: number | null; days: number }) {
  if (current === null) return <div className="delta neutral">만족도 응답 없음</div>;
  if (prev === null) return <div className="delta neutral">직전 {days}일 응답 없음</div>;
  const diff = current - prev;
  if (diff === 0) return <div className="delta neutral">직전 {days}일과 동일</div>;
  // contents.css: .delta.up = 빨강, .delta.down = 초록 → 만족률 상승은 초록(down 클래스)
  return (
    <div className={`delta ${diff > 0 ? 'down' : 'up'}`}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}%p · 직전 {days}일 대비
    </div>
  );
}

/** 항목별 건수 목록 (라벨 + 건수 + 비율 막대) */
function CountList({ items, total, color, empty }: { items: ChatGroupCount[]; total: number; color: string; empty: string }) {
  if (items.length === 0) return <EmptyChart message={empty} />;
  return (
    <ul className="type_list">
      {items.map((it) => {
        const pct = percent(it.count, total) ?? 0;
        return (
          <li key={it.key} className="type_row">
            <div className="type_head">
              <span className="type_name">{it.label}</span>
              <span className="type_val mono">
                {it.count.toLocaleString()}건 · {pct}%
              </span>
            </div>
            <div className="type_track" aria-hidden="true">
              <div className="type_fill" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* =====================================================================
   AI 감정분석 · 요약 패널 (왼쪽: 요약·개선할 점 / 오른쪽: 긍정·부정 점수)
   매장 설문 상세의 AI 요약 패널과 같은 구성입니다.
===================================================================== */
function AiPanel({
  result,
  loading,
  error,
  canAnalyze,
  periodLabel,
  onAnalyze,
}: {
  result: ChatAiSummary | null;
  loading: boolean;
  error: string;
  canAnalyze: boolean;
  periodLabel: string;
  onAnalyze: () => void;
}) {
  const sentiment = result ? getChatSentiment(result.score) : null;
  const pct = result ? Math.min(100, Math.max(0, result.score * 10)) : 0;

  return (
    <div className="card card_pad_md chat_ai" aria-busy={loading}>
      <div className="chat_ai_head">
        <h3 className="chat_ai_title">
          AI 감정분석 · 요약
          {result && (
            <span className="cell_sub">
              {result.from} ~ {result.to} · 응답 {result.answered.toLocaleString()}건 · {result.analyzedAt} 분석
            </span>
          )}
        </h3>
        <button
          type="button"
          className="btn btn_md btn_primary"
          onClick={onAnalyze}
          disabled={loading || !canAnalyze}
          title={canAnalyze ? undefined : '기간 내 만족도 응답이 없습니다'}
        >
          {loading ? '분석 중...' : result ? '다시 분석' : 'AI 분석'}
        </button>
      </div>

      {loading ? (
        <p className="chat_ai_message" aria-live="polite">
          AI가 {periodLabel} 만족도 응답과 고객 의견을 분석하고 있어요. 1분 이상 걸릴 수 있어요.
        </p>
      ) : error ? (
        <p className="chat_ai_message is_error" aria-live="polite">{error}</p>
      ) : !result || !sentiment ? (
        <p className="chat_ai_message">
          {canAnalyze
            ? `[AI 분석]을 누르면 ${periodLabel} 만족·불만족 응답, 불만족 사유, 고객이 남긴 의견을 AI가 읽고 요약과 긍정·부정 점수를 보여줍니다.`
            : '기간 내 만족도 응답이 없어 분석할 수 없습니다.'}
        </p>
      ) : (
        <div className="chat_ai_body" aria-live="polite">
          <section className="chat_ai_text">
            <p>{result.summary}</p>
            {result.weakPoints.length > 0 && (
              <>
                <h4 className="chat_ai_sub">개선할 점</h4>
                <ul className="chat_ai_points">
                  {result.weakPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="chat_ai_sentiment" aria-label="긍정 부정 점수">
            <div className="chat_ai_sentiment_head">
              <span className="chat_ai_sub">긍정 · 부정 점수</span>
              <span className={`badge ${sentiment.badge}`}>{sentiment.label}</span>
            </div>
            <div className="chat_ai_score">
              <span className="mono">{result.score.toFixed(1)}</span>
              <span className="mono chat_ai_score_max">/ 10</span>
            </div>
            <div
              className="chat_ai_track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={result.score}
              title={`${result.score.toFixed(1)}점 (${sentiment.label})`}
            >
              <span className="chat_ai_fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="chat_ai_legend">
              <span>0 부정</span>
              <span>5 중립</span>
              <span>10 긍정</span>
            </div>
            {result.reason && <p className="chat_ai_reason">{result.reason}</p>}
          </section>
        </div>
      )}
    </div>
  );
}

export default function ChatStats() {
  const [days, setDays] = useState<PeriodDays>(30);
  const [stats, setStats] = useState<ChatStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [alert, setAlert] = useState<AlertState>(null);

  // AI 감정분석 · 요약 — 분석은 버튼을 눌렀을 때만 실행하고 결과는 서버에 저장됨
  // 화면에 들어오거나 조회기간을 바꾸면 그 기간의 마지막 분석 결과를 불러옴
  const [aiResult, setAiResult] = useState<ChatAiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiSeq = useRef(0);

  useEffect(() => {
    aiSeq.current++; // 진행 중이던 분석 결과는 버림 (다른 기간의 결과가 뒤늦게 표시되지 않게)
    const seq = aiSeq.current;
    setAiResult(null);
    setAiError('');
    setAiLoading(false);

    axiosInstance
      .get<ChatAiSummary | ''>('/chat_stats/ai-summary', { params: { days } })
      .then((res) => {
        // 분석한 적이 없으면 204(빈 응답) — 그 사이 [AI 분석]을 눌렀으면 덮어쓰지 않음
        if (seq === aiSeq.current && res.status === 200 && res.data) setAiResult(res.data);
      })
      .catch((err: unknown) => {
        console.error('챗봇 만족도 AI 분석 결과 조회 실패:', err);
      });
  }, [days]);

  const analyze = async () => {
    const seq = ++aiSeq.current;
    setAiLoading(true);
    setAiError('');
    try {
      // AI 응답은 1분 이상 걸릴 수 있어 이 요청만 넉넉히 기다림
      const res = await axiosInstance.post<ChatAiSummary>('/chat_stats/ai-summary', null, {
        params: { days },
        timeout: 200_000,
      });
      if (seq !== aiSeq.current) return;
      setAiResult(res.data);
    } catch (err: unknown) {
      if (seq !== aiSeq.current) return;
      const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      // 응답 없음·AI 서버 미반영 등 서버가 안내 문구를 준 경우(409)는 그대로 표시
      if (response?.status !== 409) console.error('챗봇 만족도 AI 분석 실패:', err);
      setAiError(response?.data?.message || 'AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (seq === aiSeq.current) setAiLoading(false);
    }
  };

  // 기간을 빠르게 바꿀 때 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 요청 번호로 구분
  const requestSeq = useRef(0);

  const loadStats = useCallback(
    async (silent = false) => {
      const seq = ++requestSeq.current;
      if (!silent) setLoading(true);
      try {
        const res = await axiosInstance.get<ChatStatsData>('/chat_stats/stats', { params: { days } });
        if (seq !== requestSeq.current) return;
        setStats(res.data);
        setUpdatedAt(new Date().toLocaleTimeString('ko-KR', { hourCycle: 'h23' }));
      } catch (err: unknown) {
        if (seq !== requestSeq.current) return;
        console.error('챗봇 만족도 통계 조회 실패:', err);
        if (!silent) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          setAlert({
            message:
              status === 403
                ? '관리자만 볼 수 있습니다.'
                : status === 404
                  ? '백엔드에 /chat_stats API가 없습니다. 백엔드 서버를 최신 코드로 재시작해주세요.'
                  : '챗봇 만족도 통계를 불러오지 못했습니다.',
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
  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? '';
  const dateTickInterval = days === 7 ? 0 : days === 30 ? 4 : 14;

  // 일별 만족률(%) — 응답이 없는 날은 null(선을 끊음)
  const dailyWithRate = useMemo(
    () =>
      (stats?.daily ?? []).map((p) => {
        const answered = p.satisfied + p.dissatisfied;
        return { ...p, answered, rate: percent(p.satisfied, answered) };
      }),
    [stats]
  );
  const hasAnswerData = dailyWithRate.some((p) => p.answered > 0);
  const dailyRows = useMemo(() => dailyWithRate.slice().reverse(), [dailyWithRate]);

  const satisfyRate = summary ? percent(summary.satisfied, summary.answered) : null;
  const satisfyRatePrev = summary ? percent(summary.satisfiedPrev, summary.answeredPrev) : null;

  return (
    <section className="view active dashboard_page">
      <PageHeader
        title="챗봇 상담 만족도"
        description="상담을 끝낼 때 받은 만족도 조사 결과입니다."
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
              // 분석 중에 기간을 바꾸면 진행 중인 분석 결과를 화면에 못 보여 주므로 끝날 때까지 막음
              disabled={aiLoading && p.days !== days}
              title={aiLoading && p.days !== days ? 'AI 분석이 끝난 뒤에 바꿀 수 있어요' : undefined}
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
          {/* ---- AI 감정분석 · 요약 (버튼을 눌렀을 때만 실행) ---- */}
          <AiPanel
            result={aiResult}
            loading={aiLoading}
            error={aiError}
            canAnalyze={summary.answered > 0}
            periodLabel={periodLabel}
            onAnalyze={analyze}
          />

          {/* ---- KPI 1행: 만족도 ---- */}
          <div className="stats_grid">
            <div className="card kpi">
              <div className="lab">만족률 · {periodLabel}</div>
              <div className="val">{satisfyRate === null ? '-' : `${satisfyRate}%`}</div>
              <RateDelta current={satisfyRate} prev={satisfyRatePrev} days={days} />
            </div>
            <div className="card kpi">
              <div className="lab">만족도 응답</div>
              <div className="val">{summary.answered.toLocaleString()}건</div>
              <div className="delta neutral">
                만족 {summary.satisfied.toLocaleString()} · 불만족 {summary.dissatisfied.toLocaleString()}
              </div>
            </div>
            <div className="card kpi">
              <div className="lab">응답률</div>
              <div className="val">{percentText(summary.answered, summary.closed)}</div>
              <div className="delta neutral">종료된 상담 {summary.closed.toLocaleString()}건 중</div>
            </div>
            <div className={`card kpi${summary.dissatisfied > 0 ? ' wait' : ''}`}>
              <div className="lab">불만족 응답</div>
              <div className="val">{summary.dissatisfied.toLocaleString()}건</div>
              <div className="delta neutral">
                {summary.dissatisfied > 0 ? '아래 사유와 의견을 확인하세요' : '불만족 응답 없음'}
              </div>
            </div>
          </div>

          {/* ---- KPI 2행: 상담 종료 현황 ---- */}
          <div className="stats_grid">
            <div className="card kpi">
              <div className="lab">종료된 상담 · {periodLabel}</div>
              <div className="val">{summary.closed.toLocaleString()}건</div>
              <div className="delta neutral">사용자가 종료 {summary.userClosed.toLocaleString()}건</div>
            </div>
            <div className="card kpi">
              <div className="lab">관리자 문의로 연결</div>
              <div className="val">{summary.adminConnect.toLocaleString()}건</div>
              <div className="delta neutral">종료 상담의 {percentText(summary.adminConnect, summary.closed)}</div>
            </div>
            <div className="card kpi">
              <div className="lab">자동 종료</div>
              <div className="val">{summary.autoClosed.toLocaleString()}건</div>
              <div className="delta neutral">30분 방치 · 만족도 미응답</div>
            </div>
            <div className="card kpi">
              <div className="lab">진행 중인 상담</div>
              <div className="val">{summary.inProgress.toLocaleString()}건</div>
              <div className="delta neutral">지금 열려 있는 상담</div>
            </div>
          </div>

          {/* ---- 차트 1행: 일별 응답 수 / 만족률 ---- */}
          <div className="chart_row dash_chart_row">
            <div className="card chart_card">
              <div className="chat_stats_title_row">
                <h3 className="b_title lg">일별 만족도 응답</h3>
                <ul className="chat_stats_legend" aria-label="범례">
                  <li>
                    <span className="swatch" style={{ background: CHAT_SATISFIED_COLOR }} aria-hidden="true" />
                    만족
                  </li>
                  <li>
                    <span className="swatch" style={{ background: CHAT_DISSATISFIED_COLOR }} aria-hidden="true" />
                    불만족
                  </li>
                </ul>
              </div>
              <div className="chart_box">
                {hasAnswerData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyWithRate} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
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
                      <Tooltip cursor={{ fill: CHART_COLORS.cursor }} content={CountTooltip} />
                      <Bar dataKey="satisfied" stackId="answer" fill={CHAT_SATISFIED_COLOR} maxBarSize={24} isAnimationActive={false} />
                      <Bar
                        dataKey="dissatisfied"
                        stackId="answer"
                        fill={CHAT_DISSATISFIED_COLOR}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="기간 내 만족도 응답이 없습니다." />
                )}
              </div>
            </div>

            <div className="card chart_card">
              <h3 className="b_title lg">일별 만족률</h3>
              <div className="chart_box">
                {hasAnswerData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyWithRate} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickFormatter={shortDate}
                        interval={dateTickInterval}
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '3 3' }} content={RateTooltip} />
                      {/* 응답이 없는 날은 값이 없어 점만 따로 찍히므로 선으로 잇고(connectNulls) 점을 표시 */}
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke={CHAT_SATISFIED_COLOR}
                        strokeWidth={2}
                        connectNulls
                        dot={{ r: 3, fill: CHAT_SATISFIED_COLOR, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="기간 내 만족도 응답이 없습니다." />
                )}
              </div>
            </div>
          </div>

          {/* ---- 2행: 불만족 사유 / 종료 사유·회원 구분 ---- */}
          <div className="chart_row dash_chart_row">
            <div className="card chart_card">
              <h3 className="b_title lg">불만족 사유</h3>
              <CountList
                items={stats.byReason}
                total={summary.dissatisfied}
                color={CHAT_DISSATISFIED_COLOR}
                empty="기간 내 불만족 응답이 없습니다."
              />
            </div>

            <div className="card chart_card">
              <h3 className="b_title lg">상담 종료 사유</h3>
              <CountList
                items={stats.byCloseReason}
                total={summary.closed}
                color={CHART_COLORS.axis}
                empty="기간 내 종료된 상담이 없습니다."
              />

              <h3 className="b_title lg chat_stats_sub_title">회원 · 비회원</h3>
              <ul className="type_list">
                {stats.byUserType.map((t) => {
                  const answered = t.satisfied + t.dissatisfied;
                  const pct = percent(t.satisfied, answered) ?? 0;
                  return (
                    <li key={t.key} className="type_row">
                      <div className="type_head">
                        <span className="type_name">{t.label}</span>
                        <span className="badge badge_neutral">상담 {t.closed.toLocaleString()}건</span>
                        <span className="type_val mono">
                          만족 {t.satisfied.toLocaleString()} · 불만족 {t.dissatisfied.toLocaleString()} · 만족률{' '}
                          {percentText(t.satisfied, answered)}
                        </span>
                      </div>
                      <div className="type_track" aria-hidden="true">
                        <div className="type_fill" style={{ width: `${pct}%`, background: CHAT_SATISFIED_COLOR }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* ---- 3행: 최근 불만족 의견 ---- */}
          <div className="card chart_card dash_chart_row">
            <h3 className="b_title lg">최근 불만족 의견</h3>
            {stats.recent.length > 0 ? (
              <ul className="recent_list">
                {stats.recent.map((r) => (
                  <li key={r.no} className="recent_row chat_stats_opinion">
                    <span className="badge badge_neutral">{r.reasonLabel}</span>
                    <span className="recent_name">{r.stitle ?? 'AI 상담'}</span>
                    <span className="recent_meta mono">{r.member ? '회원' : '비회원'}</span>
                    <span className="recent_time mono">{r.closedat}</span>
                    {r.smemo && <p className="chat_stats_memo">{r.smemo}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyChart message="기간 내 불만족 응답이 없습니다." />
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
                    <th>종료된 상담</th>
                    <th>만족</th>
                    <th>불만족</th>
                    <th>만족률</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((row) => (
                    <tr key={row.label}>
                      <td className="mono">{row.label}</td>
                      <td className="mono">{row.closed.toLocaleString()}건</td>
                      <td className="mono">{row.satisfied.toLocaleString()}건</td>
                      <td className="mono">{row.dissatisfied.toLocaleString()}건</td>
                      <td className="mono">{row.rate === null ? '-' : `${row.rate}%`}</td>
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
