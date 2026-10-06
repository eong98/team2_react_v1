import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
  SHOP_SURVEY_AI_MAX_REQUEST,
  SHOP_SURVEY_STATUS_LABEL,
  getShopSurveyErrorMessage,
  type ShopSurveyAiArticle,
  type ShopSurveyAiMode,
  type ShopSurveyAiRequest,
  type ShopSurveyAiResult,
  type ShopSurveyForm,
  type ShopSurveyListItem,
  type ShopSurveyPage,
} from '../../../components/ts/ShopSurvey.ts';
import './shopSurvey.css';

/* ---------------------------------------------------------------------
   AI로 설문 만들기 패널 (설문 생성/수정 폼 위에 붙음)

   - 만들기     : 요청 문장 + 점주가 고른 이전 설문(약한 항목 포함)으로 새 설문 → 폼 전체 교체
   - 수정 요청  : 현재 폼 + 요청 문장으로 고치기 (점주가 손으로 고친 내용 기준)
   - 트렌드 추가: 현재 폼에 업종 뉴스 트렌드 문항 1~2개 추가 (버튼)

   결과는 onApply로 폼에 넣고, 폼은 AIYN = 1로 바뀝니다. 실제 저장은 기존 임시저장/게시 버튼으로.

   API: POST /shop_survey/ai/generate (Spring → FastAPI LangGraph 에이전트)
--------------------------------------------------------------------- */

interface ShopSurveyAiPanelProps {
  /** 매장번호 */
  sno: number;
  /** 지금 편집 중인 설문번호 (참고 목록에서 제외) */
  surveyNo: number | null;
  /** 폼에 문항 내용이 있는지 (있으면 수정 요청/트렌드 추가 가능) */
  hasContent: boolean;
  /** AI가 관여한 설문인지 */
  aiyn: 0 | 1;
  /** 현재 폼 (수정 요청/트렌드 추가 때 보냄) */
  getCurrentForm: () => ShopSurveyForm;
  /** AI 결과를 폼에 적용 */
  onApply: (result: ShopSurveyAiResult, mode: ShopSurveyAiMode) => void;
}

const LOADING_TEXT: Record<ShopSurveyAiMode, string> = {
  create: 'AI가 설문을 만들고 있어요. 30초~1분 정도 걸릴 수 있어요.',
  revise: 'AI가 요청하신 내용을 반영하고 있어요.',
  trend: '최근 업종 뉴스를 찾아 문항을 추가하고 있어요.',
};

export default function ShopSurveyAiPanel({
  sno,
  surveyNo,
  hasContent,
  aiyn,
  getCurrentForm,
  onApply,
}: ShopSurveyAiPanelProps) {
  const [request, setRequest] = useState('');
  const [refs, setRefs] = useState<ShopSurveyListItem[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<number[]>([]);
  const [industry, setIndustry] = useState<string | null>(null);

  const [loading, setLoading] = useState<ShopSurveyAiMode | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [articles, setArticles] = useState<ShopSurveyAiArticle[]>([]);
  const [message, setMessage] = useState('');

  /* ---- 참고할 이전 설문 (게시된 설문만, 지금 편집 중인 설문 제외) ---- */
  useEffect(() => {
    axiosInstance
      .get<ShopSurveyPage<ShopSurveyListItem>>(`/shop_survey/list/${sno}`, { params: { page: 0, size: 50 } })
      .then((res) => setRefs(res.data.content.filter((s) => s.status !== 'DRAFT' && s.no !== surveyNo)))
      .catch(() => setRefs([]));
  }, [sno, surveyNo]);

  const toggleRef = (no: number) =>
    setSelectedRefs((prev) => (prev.includes(no) ? prev.filter((n) => n !== no) : [...prev, no].slice(0, 5)));

  const run = async (mode: ShopSurveyAiMode) => {
    if (loading) return;
    const text = request.trim();
    if (mode !== 'trend' && !text) {
      setError(mode === 'create' ? '어떤 설문을 만들지 적어주세요.' : '어떻게 고칠지 적어주세요.');
      return;
    }

    const body: ShopSurveyAiRequest = {
      sno,
      mode,
      request: mode === 'trend' ? '' : text,
      industry,
      refSvnos: mode === 'create' ? selectedRefs : [],
      currentForm: mode === 'create' ? undefined : getCurrentForm(),
    };

    setLoading(mode);
    setError('');
    setMessage('');
    try {
      const res = await axiosInstance.post<ShopSurveyAiResult>('/shop_survey/ai/generate', body, {
        timeout: 200_000, // LLM 응답 대기 (GPU 공유로 오래 걸릴 수 있음)
      });
      const result = res.data;

      setIndustry(result.industry || industry);
      if (result.message) {
        // 트렌드 기사 없음 등: 폼은 그대로
        setMessage(result.message);
        return;
      }

      onApply(result, mode);
      setNotes(result.notes ?? []);
      setArticles(mode === 'trend' ? result.articles ?? [] : []);
      if (mode !== 'trend') setRequest('');
    } catch (err) {
      setError(getShopSurveyErrorMessage(err, 'AI 요청에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="card card_pad_md sv_ai" aria-busy={loading !== null}>
      <div className="sv_ai_head">
        <h3 className="sv_ai_title">✨ AI로 설문 만들기</h3>
        {aiyn === 1 && <span className="badge badge_info">AI 생성 설문</span>}
      </div>

      <textarea
        className={`form_textarea sv_ai_input${error ? ' is_error' : ''}`}
        rows={2}
        maxLength={SHOP_SURVEY_AI_MAX_REQUEST}
        value={request}
        disabled={loading !== null}
        onChange={(e) => {
          setRequest(e.target.value);
          setError('');
        }}
        placeholder={
          hasContent
            ? '고칠 점을 말씀해 주세요. 예) 3번 빼줘 / 1번 보기에 콘 아이스크림 추가해줘 / 문항을 5개로 줄여줘'
            : '어떤 설문을 만들고 싶으신가요? 예) 아이스크림 매장인데 부족한 물품, 청결, 만족도 설문 만들어줘'
        }
        aria-label="AI 요청"
      />
      {error && <div className="form_hint error">{error}</div>}

      {refs.length > 0 && (
        <div className="sv_ai_refs">
          <span className="sv_ai_label">
            참고할 이전 설문 <span className="cell_sub">(새로 만들 때 사용, 최대 5개)</span>
          </span>
          <div className="chip_select">
            {refs.map((r) => (
              <button
                key={r.no}
                type="button"
                className={`chip_opt${selectedRefs.includes(r.no) ? ' on' : ''}`}
                aria-pressed={selectedRefs.includes(r.no)}
                disabled={loading !== null}
                onClick={() => toggleRef(r.no)}
              >
                {r.title} · {SHOP_SURVEY_STATUS_LABEL[r.status]} · 응답 {r.responseCount}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sv_ai_actions">
        {hasContent ? (
          <>
            <button
              type="button"
              className="btn btn_sm btn_ghost"
              disabled={loading !== null}
              onClick={() => run('create')}
              title="지금 작성 중인 문항이 AI 초안으로 바뀌어요"
            >
              새로 만들기
            </button>
            <button type="button" className="btn btn_sm btn_primary" disabled={loading !== null} onClick={() => run('revise')}>
              수정 요청
            </button>
          </>
        ) : (
          <button type="button" className="btn btn_sm btn_primary" disabled={loading !== null} onClick={() => run('create')}>
            만들기
          </button>
        )}
      </div>

      {loading && (
        <p className="sv_ai_loading" aria-live="polite">
          {LOADING_TEXT[loading]}
        </p>
      )}

      {!loading && notes.length > 0 && (
        <ul className="sv_ai_notes">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {!loading && articles.length > 0 && (
        <div className="sv_ai_articles">
          <span className="sv_ai_label">📰 참고한 최근 기사</span>
          <ul>
            {articles.slice(0, 5).map((a) => (
              <li key={a.title}>
                {a.link ? (
                  <a href={a.link} target="_blank" rel="noreferrer">
                    {a.title}
                  </a>
                ) : (
                  a.title
                )}
                {a.source && <span className="cell_sub"> · {a.source}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && message && <p className="sv_ai_message">{message}</p>}

      {hasContent && (
        <div className="sv_ai_trend">
          <span>
            💡 최근 <b>{industry || '업종'}</b> 트렌드를 반영한 문항을 추가해볼까요?
          </span>
          <button type="button" className="btn btn_sm btn_outline_primary" disabled={loading !== null} onClick={() => run('trend')}>
            트렌드 문항 추가
          </button>
        </div>
      )}
    </div>
  );
}