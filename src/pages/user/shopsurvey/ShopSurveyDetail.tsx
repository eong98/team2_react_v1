import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, UserPagination, AlertModal, ConfirmDeleteModal } from '../../../components/ui/index.ts';
import { axiosInstance, getAttachUrl } from '../../../utils/Tool.ts';
import { useTab } from '../../../hooks/useTab.ts';
import {
  SHOP_SURVEY_ATYPE_LABEL,
  SHOP_SURVEY_BASE,
  SHOP_SURVEY_RESPONSE_PAGE_SIZE,
  SHOP_SURVEY_SCALE_MAX,
  SHOP_SURVEY_STATUS_BADGE,
  SHOP_SURVEY_STATUS_LABEL,
  EMPTY_SHOP_SURVEY_RANGE,
  getShopSurveyErrorMessage,
  getShopSurveySentiment,
  toShopSurveyRangeParams,
  type ShopSurveyAnswer,
  type ShopSurveyDateRange,
  type ShopSurveyForm,
  type ShopSurveyPage,
  type ShopSurveyQuestionStat,
  type ShopSurveyResponse,
  type ShopSurveyStats,
  type ShopSurveySummary,
} from '../../../components/ts/ShopSurvey.ts';
import ShopSurveyQrModal from './ShopSurveyQrModal.tsx';
import './shopSurvey.css';

/* ---------------------------------------------------------------------
   매장 설문 상세 (/user/shopsurvey/{svno})

   탭 (URL ?tab= 로 유지)
   - stats     : 문항별 집계 (점수 평균, 보기별 선택 수)
   - responses : 고객 응답 목록 (응답 시각, 문항별 답, 첨부 사진)
   - questions : 설문 문항 미리보기

   API (ShopSurveyCont, /shop_survey)
   GET /shop_survey/{svno}                     설문 + 문항 + 응답 수
   GET /shop_survey/{svno}/stats               집계
   GET /shop_survey/{svno}/responses?page=&size= 응답 목록
   POST /shop_survey/{svno}/summary            AI 요약 + 긍정/부정 점수
   PATCH /shop_survey/{svno}/status            진행중 <-> 종료
   DELETE /shop_survey/{svno}                  삭제 (응답 없으면 실제 삭제, 있으면 숨김)
--------------------------------------------------------------------- */

type TabKey = 'stats' | 'responses' | 'questions';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'stats', label: '집계' },
  { key: 'responses', label: '응답 목록' },
  { key: 'questions', label: '문항' },
];

export default function ShopSurveyDetail() {
  const navigate = useNavigate();
  const { svno } = useParams<{ svno: string }>();
  const { tab, changeTab } = useTab<TabKey>({ defaultTab: 'stats' });

  const [survey, setSurvey] = useState<ShopSurveyForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);

  // 응답일 기간 필터: draft = 입력 중, applied = [조회] 눌렀을 때 실제 적용
  const [rangeDraft, setRangeDraft] = useState<ShopSurveyDateRange>(EMPTY_SHOP_SURVEY_RANGE);
  const [range, setRange] = useState<ShopSurveyDateRange>(EMPTY_SHOP_SURVEY_RANGE);

  // AI 요약
  const [summary, setSummary] = useState<ShopSurveySummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // 상태 변경 / 삭제
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; back?: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!svno) return;
    setLoading(true);
    axiosInstance
      .get<ShopSurveyForm>(`/shop_survey/${svno}`)
      .then((res) => setSurvey(res.data))
      .catch((err) => {
        console.error('매장 설문 조회 실패:', err);
        setAlert({
          message: getShopSurveyErrorMessage(err, '설문을 불러오지 못했습니다.'),
          variant: 'error',
          back: true,
        });
      })
      .finally(() => setLoading(false));
  }, [svno]);

  const goList = () => navigate(SHOP_SURVEY_BASE);

  const applyRange = () => {
    if (rangeDraft.from && rangeDraft.to && rangeDraft.from > rangeDraft.to) {
      setAlert({ message: '시작일이 종료일보다 늦습니다.', variant: 'error' });
      return;
    }
    setRange(rangeDraft);
    setSummary(null); // 기간이 바뀌면 이전 요약은 맞지 않으므로 지움
  };

  const resetRange = () => {
    setRangeDraft(EMPTY_SHOP_SURVEY_RANGE);
    setRange(EMPTY_SHOP_SURVEY_RANGE);
    setSummary(null);
  };

  const handleSummarize = async () => {
    if (!svno || summarizing) return;
    setSummarizing(true);
    try {
      const res = await axiosInstance.post<ShopSurveySummary>(`/shop_survey/${svno}/summary`, null, {
        params: toShopSurveyRangeParams(range),
        timeout: 200_000, // LLM 응답 대기 (GPU 공유로 오래 걸릴 수 있음)
      });
      setSummary(res.data);
    } catch (err) {
      setAlert({ message: getShopSurveyErrorMessage(err, 'AI 요약에 실패했습니다.\n잠시 후 다시 시도해주세요.'), variant: 'error' });
    } finally {
      setSummarizing(false);
    }
  };

  /** 진행중 <-> 종료 */
  const handleStatusChange = async (next: 'OPEN' | 'CLOSED') => {
    if (!svno || statusSaving) return;
    setStatusSaving(true);
    try {
      await axiosInstance.patch(`/shop_survey/${svno}/status`, { status: next });
     setSurvey((prev) => (prev ? { ...prev, status: next } : prev));
      setAlert({
        message: next === 'CLOSED' ? '설문이 종료되었습니다.\n더 이상 고객 응답을 받지 않습니다.' : '설문을 다시 진행합니다.',
        variant: 'success',
      });
    } catch (err) {
      setAlert({ message: getShopSurveyErrorMessage(err, '상태 변경에 실패했습니다.'), variant: 'error' });
    } finally {
      setStatusSaving(false);
    }
  };

  /** 삭제 (응답 없으면 실제 삭제, 있으면 서버에서 DELETE 상태로 숨김) */
  const handleDelete = async () => {
    if (!svno || deleting) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/shop_survey/${svno}`);
      setDeleteOpen(false);
      navigate(SHOP_SURVEY_BASE, { replace: true });
    } catch (err) {
      setDeleteOpen(false);
      setAlert({ message: getShopSurveyErrorMessage(err, '삭제에 실패했습니다.'), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

 if (loading || !survey) {
    return (
      <section className="view active shop-survey-page">
        <PageHeader title="고객 설문" />
        <div className="card card_pad_lg shop_survey_empty">
          <p className="b_title">{loading ? '불러오는 중...' : '설문 정보가 없습니다.'}</p>
        </div>
        <AlertModal
          open={alert !== null}
          onClose={() => setAlert(null)}
          onConfirm={alert?.back ? goList : undefined}
          message={alert?.message ?? ''}
          variant={alert?.variant}
        />
      </section>
    );
  }

  const status = survey.status ?? 'DRAFT';
  const isDraft = status === 'DRAFT';
  // 응답이 없을 때만 수정 가능 (DRAFT는 이어서 작성)
  const canEdit = isDraft || (survey.responseCount ?? 0) === 0;
  const goEdit = () => navigate(`${SHOP_SURVEY_BASE}/${svno}/edit`);

  return (
    <section className="view active shop-survey-page">
      <PageHeader
        title={survey.title || '제목 없음'}
        description={survey.description || undefined}
        actions={
          <div className="shop_survey_head_actions">
            <button type="button" className="btn btn_md btn_ghost" onClick={goList}>
              ← 목록으로
            </button>
            {canEdit && (
              <button type="button" className="btn btn_md btn_outline_primary" onClick={goEdit}>
                {isDraft ? '이어서 작성' : '수정'}
              </button>
            )}
            {!isDraft && survey.qrid && (
              <button type="button" className="btn btn_md btn_outline_primary" onClick={() => setQrOpen(true)}>
                QR코드
              </button>
            )}
            {status === 'OPEN' && (
              <button
                type="button"
                className="btn btn_md btn_ghost"
                onClick={() => handleStatusChange('CLOSED')}
                disabled={statusSaving}
              >
                설문 종료
              </button>
            )}
            {status === 'CLOSED' && (
              <button
                type="button"
                className="btn btn_md btn_ghost"
                onClick={() => handleStatusChange('OPEN')}
                disabled={statusSaving}
              >
                다시 진행
              </button>
            )}
            <button type="button" className="btn btn_md btn_danger_outline" onClick={() => setDeleteOpen(true)}>
              삭제
            </button>
           </div>
         }
      />

      {/* ---- 요약 ---- */}
      <div className="shop_survey_kpis">
        <div className="card kpi">
          <div className="lab">상태</div>
          <div className="val">
            <span className={`badge ${SHOP_SURVEY_STATUS_BADGE[status] ?? 'badge_neutral'}`}>
              {SHOP_SURVEY_STATUS_LABEL[status] ?? status}
            </span>
          </div>
        </div>
        <div className="card kpi">
          <div className="lab">총 응답</div>
          <div className="val">{survey.responseCount ?? 0}</div>
        </div>
        <div className="card kpi">
          <div className="lab">문항</div>
          <div className="val">{survey.questions.length}</div>
        </div>
        <div className="card kpi">
          <div className="lab">등록일</div>
          <div className="val shop_survey_kpi_date">{survey.cdate?.slice(0, 10) ?? '-'}</div>
        </div>
      </div>

      {isDraft ? (
        <div className="card card_pad_lg shop_survey_empty">
          <p className="b_title">작성중인 설문입니다. 게시하면 QR코드로 고객 응답을 받을 수 있어요.</p>
          <button type="button" className="btn btn_md btn_primary" onClick={goEdit}>
            이어서 작성하기
          </button>
        </div>
      ) : (
        <>
          {/* ---- 응답일 기간 필터 + AI 요약 버튼 ---- */}
          <div className="card card_pad_md shop_survey_range">
            <span className="shop_survey_range_label">응답일</span>
            <input
              type="date"
              className="form_input shop_survey_date"
              value={rangeDraft.from}
              onClick={(e) => e.currentTarget.showPicker?.()}
              max={rangeDraft.to || undefined}
              onChange={(e) => setRangeDraft((prev) => ({ ...prev, from: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyRange()}
              aria-label="응답일 시작"
            />
            <span className="shop_survey_range_sep">~</span>
            <input
              type="date"
              className="form_input shop_survey_date"
              value={rangeDraft.to}
              onClick={(e) => e.currentTarget.showPicker?.()}
              min={rangeDraft.from || undefined}
              onChange={(e) => setRangeDraft((prev) => ({ ...prev, to: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyRange()}
              aria-label="응답일 종료"
            />
            <button type="button" className="btn btn_sm btn_ghost" onClick={resetRange}>
              초기화
            </button>
            <button type="button" className="btn btn_sm btn_primary" onClick={applyRange}>
              조회
            </button>
            <button
              type="button"
              className="btn btn_sm btn_outline_primary shop_survey_summary_btn"
              onClick={handleSummarize}
              disabled={summarizing}
            >
              {summarizing ? 'AI 분석 중...' : 'AI 응답 요약'}
            </button>
          </div>

          {(summarizing || summary) && (
            <SummaryPanel summary={summary} loading={summarizing} range={range} />
          )}

          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`tab${tab === t.key ? ' on' : ''}`}
                onClick={() => changeTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'stats' && <StatsTab svno={Number(svno)} range={range} />}
          {tab === 'responses' && (
            /* 기간이 바뀌면 1페이지부터 다시 보도록 key로 초기화 */
            <ResponsesTab key={`${range.from}~${range.to}`} svno={Number(svno)} range={range} />
          )}
          {tab === 'questions' && <QuestionsTab survey={survey} />}
        </>
      )}

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="설문 삭제"
        targetLabel={survey.title}
        description={
          (survey.responseCount ?? 0) > 0
            ? `응답 ${survey.responseCount}건이 있는 설문입니다. 목록에서 사라지고 QR 링크로도 응답할 수 없게 됩니다.`
            : '삭제한 설문은 되돌릴 수 없습니다.'
        }
      />

      {survey.qrid && (
        <ShopSurveyQrModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          qrid={survey.qrid}
          title={survey.title}
          isOpen={status === 'OPEN'}
        />
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

/* =====================================================================
   AI 요약 패널 (왼쪽: 요약 / 오른쪽: 긍정·부정 점수)
===================================================================== */

function SummaryPanel({
  summary,
  loading,
  range,
}: {
  summary: ShopSurveySummary | null;
  loading: boolean;
  range: ShopSurveyDateRange;
}) {
  const period =
    range.from || range.to ? `${range.from || '처음'} ~ ${range.to || '오늘'}` : '전체 기간';

  if (loading || !summary) {
    return (
      <div className="card card_pad_md shop_survey_summary is_loading" aria-live="polite">
        AI가 {period} 응답을 분석하고 있어요. 응답이 많으면 1분 이상 걸릴 수 있어요.
      </div>
    );
  }

  const sentiment = getShopSurveySentiment(summary.score);
  const pct = Math.min(100, Math.max(0, summary.score * 10));

  return (
    <div className="card card_pad_md shop_survey_summary" aria-live="polite">
      <section className="shop_survey_summary_text">
        <h3 className="shop_survey_summary_title">
          AI 응답 요약 <span className="cell_sub">{period} · 응답 {summary.responseCount}건</span>
        </h3>
        <p>{summary.summary}</p>
      </section>

      <section className="shop_survey_sentiment" aria-label="긍정 부정 점수">
        <div className="shop_survey_sentiment_head">
          <span className="shop_survey_summary_title">긍정 · 부정 점수</span>
          <span className={`badge ${sentiment.badge}`}>{sentiment.label}</span>
        </div>
        <div className="shop_survey_sentiment_score">
          <span className="mono">{summary.score.toFixed(1)}</span>
          <span className="mono shop_survey_scale_max">/ 10</span>
        </div>
        <div
          className="shop_survey_sentiment_track"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={summary.score}
          title={`${summary.score.toFixed(1)}점 (${sentiment.label})`}
        >
          <span className="shop_survey_sentiment_fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="shop_survey_sentiment_legend">
          <span>0 부정</span>
          <span>5 중립</span>
          <span>10 긍정</span>
        </div>
        {summary.reason && <p className="shop_survey_sentiment_reason">{summary.reason}</p>}
      </section>
    </div>
  );
}

/* =====================================================================
   집계 탭
===================================================================== */

function StatsTab({ svno, range }: { svno: number; range: ShopSurveyDateRange }) {
  const [stats, setStats] = useState<ShopSurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get<ShopSurveyStats>(`/shop_survey/${svno}/stats`, { params: toShopSurveyRangeParams(range) })
      .then((res) => setStats(res.data))
      .catch((err) => {
        console.error('매장 설문 집계 조회 실패:', err);
        setError(getShopSurveyErrorMessage(err, '집계를 불러오지 못했습니다.'));
      })
      .finally(() => setLoading(false));
  }, [svno, range]);

  if (loading) return <div className="card card_pad_lg shop_survey_empty">불러오는 중...</div>;
  if (error || !stats) return <div className="card card_pad_lg shop_survey_empty">{error || '집계 정보가 없습니다.'}</div>;
  if (stats.totalResponses === 0) {
    return (
      <div className="card card_pad_lg shop_survey_empty">
        {range.from || range.to ? '선택한 기간에 응답이 없습니다.' : '아직 응답이 없습니다.'}
      </div>
    );
  }

  return (
    <div className="shop_survey_stats">
      {stats.questions.map((q, idx) => (
        <QuestionStatCard key={q.sqno} index={idx + 1} stat={q} total={stats.totalResponses} />
      ))}
    </div>
  );
}

function QuestionStatCard({ index, stat, total }: { index: number; stat: ShopSurveyQuestionStat; total: number }) {
  const isChoice = stat.atype === 'SINGLE' || stat.atype === 'MULTI';
  // 보기별 비율의 분모: 이 문항에 답한 수 (복수선택은 합이 100%를 넘을 수 있음)
  const base = stat.answerCount || 0;

  return (
    <div className="card card_pad_md shop_survey_stat_card">
      <div className="shop_survey_stat_head">
        <span className="shop_survey_q_no mono">Q{index}</span>
        <span className="shop_survey_q_title">{stat.title}</span>
        <span className="badge badge_info">{SHOP_SURVEY_ATYPE_LABEL[stat.atype]}</span>
      </div>
      <p className="shop_survey_stat_sub">
        응답 {stat.answerCount}명 / 전체 {total}명
      </p>

      {stat.atype === 'SCALE' && (
        <div className="shop_survey_scale">
          <span className="shop_survey_scale_val mono">{stat.scaleAvg ?? '-'}</span>
          <span className="shop_survey_scale_max mono">/ {SHOP_SURVEY_SCALE_MAX}점 평균</span>
        </div>
      )}

      {isChoice && (
        <ul className="shop_survey_bars">
          {stat.options.map((o) => {
            const pct = base > 0 ? Math.round((o.count / base) * 1000) / 10 : 0;
            return (
              <li key={o.sono} className="shop_survey_bar_row" title={`${o.label}: ${o.count}명 (${pct}%)`}>
                <span className="shop_survey_bar_label">{o.label}</span>
                <span className="shop_survey_bar_track" aria-hidden="true">
                  <span className="shop_survey_bar_fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="shop_survey_bar_val mono">
                  {o.count}명 <em>{pct}%</em>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {(stat.atype === 'SHORT' || stat.atype === 'LONG') && (
        <p className="shop_survey_stat_hint">서술형 답변은 '응답 목록' 탭에서 확인할 수 있습니다.</p>
      )}
    </div>
  );
}

/* =====================================================================
   응답 목록 탭
===================================================================== */

function ResponsesTab({ svno, range }: { svno: number; range: ShopSurveyDateRange }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ShopSurveyResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    axiosInstance
      .get<ShopSurveyPage<ShopSurveyResponse>>(`/shop_survey/${svno}/responses`, {
        params: { ...toShopSurveyRangeParams(range), page: page - 1, size: SHOP_SURVEY_RESPONSE_PAGE_SIZE },
      })
      .then((res) => {
        setRows(res.data.content);
        setTotalElements(res.data.totalElements);
        setTotalPages(Math.max(1, res.data.totalPages));
      })
      .catch((err) => {
        console.error('매장 설문 응답 조회 실패:', err);
        setError(getShopSurveyErrorMessage(err, '응답 목록을 불러오지 못했습니다.'));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [svno, range, page]);

  if (loading) return <div className="card card_pad_lg shop_survey_empty">불러오는 중...</div>;
  if (error) return <div className="card card_pad_lg shop_survey_empty">{error}</div>;
  if (rows.length === 0) {
    return (
      <div className="card card_pad_lg shop_survey_empty">
        {range.from || range.to ? '선택한 기간에 응답이 없습니다.' : '아직 응답이 없습니다.'}
      </div>
    );
  }

  return (
    <>
      <div className="shop_survey_responses">
        {rows.map((r, idx) => (
          <article key={r.no} className="card card_pad_md shop_survey_response">
            <header className="shop_survey_response_head">
              <span className="mono">#{totalElements - ((page - 1) * SHOP_SURVEY_RESPONSE_PAGE_SIZE + idx)}</span>
              <span className="mono shop_survey_response_date">{r.cdate}</span>
            </header>

            {r.answers.length === 0 ? (
              <p className="cell_sub">답한 문항이 없습니다.</p>
            ) : (
              <dl className="shop_survey_answers">
                {r.answers.map((a) => (
                  <div key={a.no} className="shop_survey_answer">
                    <dt>{a.questionTitle}</dt>
                    <dd>
                      <AnswerValue answer={a} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        ))}
      </div>

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={SHOP_SURVEY_RESPONSE_PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />
    </>
  );
}

function AnswerValue({ answer }: { answer: ShopSurveyAnswer }) {
  let value: ReactNode = <span className="cell_sub">-</span>;

  if (answer.atype === 'SCALE' && answer.scale !== null) {
    value = (
      <span className="mono">
        {answer.scale} / {SHOP_SURVEY_SCALE_MAX}
      </span>
    );
  } else if ((answer.atype === 'SINGLE' || answer.atype === 'MULTI') && answer.options.length > 0) {
    value = (
      <span className="badge_area">
        {answer.options.map((label) => (
          <span key={label} className="badge badge_neutral">
            {label}
          </span>
        ))}
      </span>
    );
  } else if (answer.content) {
    value = <span className="shop_survey_answer_text">{answer.content}</span>;
  }

  return (
    <>
      {value}
      {answer.files.length > 0 && (
        <div className="shop_survey_photos">
          {answer.files.map((f) => {
            const full = getAttachUrl(f.purl, f.sname);
            const thumb = f.thumb ? getAttachUrl(`${f.purl}/thumbs`, f.thumb) : full;
            return (
              <a key={f.no} href={full} target="_blank" rel="noreferrer" title={f.name}>
                <img src={thumb} alt={f.name} loading="lazy" />
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}

/* =====================================================================
   문항 탭
===================================================================== */

function QuestionsTab({ survey }: { survey: ShopSurveyForm }) {
  if (survey.questions.length === 0) {
    return <div className="card card_pad_lg shop_survey_empty">등록된 문항이 없습니다.</div>;
  }

  return (
    <ol className="shop_survey_questions">
      {survey.questions.map((q, idx) => (
        <li key={q.no ?? idx} className="card card_pad_md">
          <div className="shop_survey_stat_head">
            <span className="shop_survey_q_no mono">Q{idx + 1}</span>
            <span className="shop_survey_q_title">{q.title}</span>
          </div>
          <div className="badge_area shop_survey_q_badges">
            <span className="badge badge_info">{SHOP_SURVEY_ATYPE_LABEL[q.atype]}</span>
            {q.requiredyn === 1 && <span className="badge badge_warning">필수</span>}
            {q.fileyn === 1 && <span className="badge badge_neutral">사진 첨부 가능</span>}
          </div>
          {q.options.length > 0 && (
            <ul className="shop_survey_q_options">
              {q.options.map((o, oi) => (
                <li key={o.no ?? oi}>{o.label}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
