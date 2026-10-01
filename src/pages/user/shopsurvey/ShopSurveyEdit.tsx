import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, AlertModal } from '../../../components/ui/index.ts';
import { axiosInstance, getByteLength } from '../../../utils/Tool.ts';
import { GlobalCurrentShop } from '../../../store/UserStore.ts';
import {
  SHOP_SURVEY_ATYPE_LABEL,
  SHOP_SURVEY_BASE,
  getShopSurveyErrorMessage,
  type ShopSurveyAtype,
  type ShopSurveyForm,
  type ShopSurveyQuestion,
} from '../../../components/ts/ShopSurvey.ts';
import './shopSurvey.css';

/* ---------------------------------------------------------------------
   매장 설문 생성 / 수정 (/user/shopsurvey/new, /user/shopsurvey/:svno/edit)

   폼 state는 ShopSurveyForm 형식 그대로입니다. 나중에 AI 자동작성(FastAPI)이
   같은 형식의 JSON을 돌려주면 setForm(...)으로 바로 채울 수 있습니다.

   모드
   - 신규           : [임시저장] [게시하기]
   - 작성중(DRAFT)  : [임시저장] [게시하기]   (임시저장 JSON을 불러와 이어서 작성)
   - 게시됨, 응답 0 : [수정 저장]             (PUT, 문항 전체 교체)
   - 게시됨, 응답 1+: 수정 불가 안내

   API (ShopSurveyCont, /shop_survey)
   GET  /shop_survey/{svno}     수정할 설문 불러오기
   POST /shop_survey/draft      임시저장 → { success, no }
   POST /shop_survey/publish    게시     → { success, no, qrid }
   PUT  /shop_survey/{svno}     게시된 설문 수정 (응답 0건일 때만)
--------------------------------------------------------------------- */

/** 바이트 제한 (VARCHAR2 기준, 한글 3바이트) */
const TITLE_BYTES = 500;
const DESC_BYTES = 1000;
const LABEL_BYTES = 300;

const ATYPES: ShopSurveyAtype[] = ['SHORT', 'LONG', 'SINGLE', 'MULTI', 'SCALE'];
const isChoice = (atype: ShopSurveyAtype) => atype === 'SINGLE' || atype === 'MULTI';

/** 화면에서만 쓰는 고유 key (문항/보기 순서 변경·삭제 시 React key 안정화) */
let keySeq = 0;
const newKey = () => `k${++keySeq}`;

interface OptionDraft {
  key: string;
  no?: number | null;
  label: string;
}
interface QuestionDraft extends Omit<ShopSurveyQuestion, 'options'> {
  key: string;
  options: OptionDraft[];
}
interface FormDraft {
  title: string;
  description: string;
  questions: QuestionDraft[];
}

const newQuestion = (atype: ShopSurveyAtype = 'SINGLE'): QuestionDraft => ({
  key: newKey(),
  title: '',
  atype,
  requiredyn: 0,
  fileyn: 0,
  options: isChoice(atype) ? [{ key: newKey(), label: '' }, { key: newKey(), label: '' }] : [],
});

/** 서버/AI 형식 → 화면 state */
const toDraft = (f: Partial<ShopSurveyForm>): FormDraft => ({
  title: f.title ?? '',
  description: f.description ?? '',
  questions: (f.questions ?? []).map((q) => ({
    ...q,
    key: newKey(),
    requiredyn: q.requiredyn === 1 ? 1 : 0,
    fileyn: q.fileyn === 1 ? 1 : 0,
    options: (q.options ?? []).map((o) => ({ key: newKey(), no: o.no, label: o.label ?? '' })),
  })),
});

/** 화면 state → 서버 요청 형식 (정렬순서는 배열 순서) */
const toPayload = (d: FormDraft, extra: { no?: number | null; sno?: number | null }): ShopSurveyForm => ({
  ...extra,
  title: d.title.trim(),
  description: d.description.trim() || null,
  questions: d.questions.map((q, qi) => ({
    no: q.no ?? null,
    title: q.title.trim(),
    atype: q.atype,
    requiredyn: q.requiredyn,
    fileyn: q.fileyn,
    sort: qi + 1,
    options: isChoice(q.atype)
      ? q.options.map((o, oi) => ({ no: o.no ?? null, label: o.label.trim(), sort: oi + 1 }))
      : [],
  })),
});

/** 오류 key: 'title' | 'description' | 'questions' | 'q:{key}' | 'o:{key}' | 'opts:{key}' */
type Errors = Record<string, string>;

type Mode = 'new' | 'draft' | 'edit' | 'locked';

export default function ShopSurveyEdit() {
  const navigate = useNavigate();
  const { svno } = useParams<{ svno: string }>();
  const shopNo = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);

  const [mode, setMode] = useState<Mode>(svno ? 'draft' : 'new');
  const [surveyNo, setSurveyNo] = useState<number | null>(svno ? Number(svno) : null);
  const [form, setForm] = useState<FormDraft>(() => ({ title: '', description: '', questions: [newQuestion()] }));
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(Boolean(svno));
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(
    null,
  );
  const formRef = useRef<HTMLDivElement>(null);

  /* ---- 수정 모드: 기존 설문 불러오기 ---- */
  useEffect(() => {
    if (!svno) return;
    setLoading(true);
    axiosInstance
      .get<ShopSurveyForm>(`/shop_survey/${svno}`)
      .then((res) => {
        const data = res.data;
        const draft = toDraft(data);
        if (draft.questions.length === 0) draft.questions = [newQuestion()];
        setForm(draft);
        setSurveyNo(data.no ?? Number(svno));
        if (data.status === 'DRAFT') setMode('draft');
        else if ((data.responseCount ?? 0) > 0) setMode('locked');
        else setMode('edit');
      })
      .catch((err) =>
        setAlert({
          message: getShopSurveyErrorMessage(err, '설문을 불러오지 못했습니다.'),
          variant: 'error',
          onConfirm: () => navigate(SHOP_SURVEY_BASE),
        }),
      )
      .finally(() => setLoading(false));
  }, [svno, navigate]);

  /* ---- state 변경 헬퍼 ---- */
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const updateQuestion = (key: string, patch: Partial<QuestionDraft>) =>
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.key === key ? { ...q, ...patch } : q)),
    }));

  const changeAtype = (q: QuestionDraft, atype: ShopSurveyAtype) => {
    // 객관식으로 바꾸는데 보기가 없으면 빈 보기 2개를 넣어줌
    const options =
      isChoice(atype) && q.options.length === 0 ? [{ key: newKey(), label: '' }, { key: newKey(), label: '' }] : q.options;
    updateQuestion(q.key, { atype, options });
    clearError(`opts:${q.key}`);
  };

  const moveQuestion = (idx: number, dir: -1 | 1) =>
    setForm((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.questions.length) return prev;
      const questions = [...prev.questions];
      [questions[idx], questions[target]] = [questions[target], questions[idx]];
      return { ...prev, questions };
    });

  const removeQuestion = (key: string) =>
    setForm((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.key !== key) }));

  const addQuestion = () => {
    setForm((prev) => ({ ...prev, questions: [...prev.questions, newQuestion()] }));
    clearError('questions');
  };

  const updateOption = (q: QuestionDraft, okey: string, label: string) => {
    updateQuestion(q.key, { options: q.options.map((o) => (o.key === okey ? { ...o, label } : o)) });
    clearError(`o:${okey}`);
  };

  const addOption = (q: QuestionDraft) => {
    updateQuestion(q.key, { options: [...q.options, { key: newKey(), label: '' }] });
    clearError(`opts:${q.key}`);
  };

  const removeOption = (q: QuestionDraft, okey: string) =>
    updateQuestion(q.key, { options: q.options.filter((o) => o.key !== okey) });

  /* ---- 검증 (게시/수정용, 백엔드 validateForm과 같은 기준) ---- */
  const validate = (forPublish: boolean): boolean => {
    const next: Errors = {};

    if (forPublish && form.title.trim() === '') next.title = '설문제목을 입력해주세요.';
    else if (getByteLength(form.title.trim()) > TITLE_BYTES) next.title = '설문제목이 너무 깁니다. (최대 한글 약 166자)';
    if (getByteLength(form.description.trim()) > DESC_BYTES) next.description = '설명이 너무 깁니다. (최대 한글 약 333자)';

    if (forPublish) {
      if (form.questions.length === 0) next.questions = '문항을 1개 이상 추가해주세요.';
      form.questions.forEach((q) => {
        if (q.title.trim() === '') next[`q:${q.key}`] = '문항 제목을 입력해주세요.';
        else if (getByteLength(q.title.trim()) > TITLE_BYTES) next[`q:${q.key}`] = '문항 제목이 너무 깁니다.';

        if (isChoice(q.atype)) {
          if (q.options.length < 2) next[`opts:${q.key}`] = '보기를 2개 이상 추가해주세요.';
          q.options.forEach((o) => {
            if (o.label.trim() === '') next[`o:${o.key}`] = '보기 내용을 입력해주세요.';
            else if (getByteLength(o.label.trim()) > LABEL_BYTES) next[`o:${o.key}`] = '보기 내용이 너무 깁니다.';
          });
        }
      });
    }

    setErrors(next);

    // 첫 번째 오류 입력으로 포커스 이동
    const firstKey = Object.keys(next)[0];
    if (firstKey) {
      requestAnimationFrame(() => {
        const el = formRef.current?.querySelector<HTMLElement>(`[data-err="${firstKey}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      });
    }
    return !firstKey;
  };

  /* ---- 저장 ---- */
  const saveDraft = async () => {
    if (saving || !validate(false)) return;
    setSaving(true);
    try {
      const res = await axiosInstance.post<{ success: boolean; no: number }>(
        '/shop_survey/draft',
        toPayload(form, { no: surveyNo, sno: shopNo }),
      );
      const no = res.data.no;
      setSurveyNo(no);
      setMode('draft');
      setAlert({ message: '임시저장되었습니다.\n목록에서 [작성중] 설문을 열어 이어서 작성할 수 있어요.', variant: 'success' });
    } catch (err) {
      setAlert({ message: getShopSurveyErrorMessage(err, '임시저장에 실패했습니다.'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (saving || !validate(true)) return;
    setSaving(true);
    try {
      const res = await axiosInstance.post<{ success: boolean; no: number; qrid: string }>(
        '/shop_survey/publish',
        toPayload(form, { no: surveyNo, sno: shopNo }),
      );
      const no = res.data.no;
      setAlert({
        message: '설문이 게시되었습니다.\nQR코드를 저장해서 매장에 붙여주세요.',
        variant: 'success',
        onConfirm: () => navigate(`${SHOP_SURVEY_BASE}/${no}`, { replace: true }),
      });
    } catch (err) {
      setAlert({ message: getShopSurveyErrorMessage(err, '게시에 실패했습니다.'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (saving || !surveyNo || !validate(true)) return;
    setSaving(true);
    try {
      await axiosInstance.put(`/shop_survey/${surveyNo}`, toPayload(form, { no: surveyNo, sno: shopNo }));
      setAlert({
        message: '수정되었습니다.',
        variant: 'success',
        onConfirm: () => navigate(`${SHOP_SURVEY_BASE}/${surveyNo}`, { replace: true }),
      });
    } catch (err) {
      setAlert({ message: getShopSurveyErrorMessage(err, '수정에 실패했습니다.'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(surveyNo && mode !== 'new' ? `${SHOP_SURVEY_BASE}/${surveyNo}` : SHOP_SURVEY_BASE);

  /* ---------------- 화면 ---------------- */

  const alertModal = (
    <AlertModal
      open={alert !== null}
      onClose={() => setAlert(null)}
      onConfirm={alert?.onConfirm}
      message={alert?.message ?? ''}
      variant={alert?.variant}
    />
  );

  if (!shopNo && !svno) {
    return (
      <section className="view active shop-survey-page">
        <PageHeader title="설문 만들기" description="설문을 만들 매장을 먼저 선택해주세요." />
        <div className="card card_pad_lg shop_survey_empty">
          <p className="b_title">먼저 관리할 매장을 선택해주세요.</p>
          <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
            매장 선택하러 가기
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="view active shop-survey-page">
        <PageHeader title="설문 수정" />
        <div className="card card_pad_lg shop_survey_empty">불러오는 중...</div>
        {alertModal}
      </section>
    );
  }

  if (mode === 'locked') {
    return (
      <section className="view active shop-survey-page">
        <PageHeader title="설문 수정" />
        <div className="card card_pad_lg shop_survey_empty">
          <p className="b_title">응답이 있는 설문은 수정할 수 없습니다.</p>
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            설문으로 돌아가기
          </button>
        </div>
      </section>
    );
  }

  const pageTitle = mode === 'new' ? '설문 만들기' : mode === 'draft' ? '설문 작성 (임시저장)' : '설문 수정';

  return (
    <section className="view active shop-survey-page">
      <PageHeader
        title={pageTitle}
        description={`${shopTitle || '선택한 매장'} 고객 설문입니다. 게시하면 QR코드로 고객 응답을 받을 수 있어요.`}
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 돌아가기
          </button>
        }
      />

      <div ref={formRef}>
        {/* ---- 기본 정보 ---- */}
        <div className="card card_pad_lg form_page sv_edit_block">
          <div className="form_group">
            <label className="form_label" htmlFor="svTitle">
              설문제목<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="svTitle"
                data-err="title"
                className={`form_input${errors.title ? ' is_error' : ''}`}
                value={form.title}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, title: e.target.value }));
                  clearError('title');
                }}
                placeholder="예) 매장 이용 만족도 조사"
              />
              {errors.title && <div className="form_hint error">{errors.title}</div>}
            </div>
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="svDesc">
              설명
            </label>
            <div className="form_control">
              <textarea
                id="svDesc"
                data-err="description"
                className={`form_textarea${errors.description ? ' is_error' : ''}`}
                value={form.description}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, description: e.target.value }));
                  clearError('description');
                }}
                placeholder="고객에게 보여줄 안내 문구 (선택)"
                rows={3}
              />
              {errors.description && <div className="form_hint error">{errors.description}</div>}
            </div>
          </div>
        </div>

        {/* ---- 문항 ---- */}
        {form.questions.map((q, idx) => (
          <div key={q.key} className="card card_pad_md sv_edit_q">
            <div className="sv_edit_q_head">
              <span className="shop_survey_q_no mono">Q{idx + 1}</span>
              <div className="sv_edit_q_tools">
                <button
                  type="button"
                  className="btn btn_xsm btn_ghost"
                  onClick={() => moveQuestion(idx, -1)}
                  disabled={idx === 0}
                  aria-label={`${idx + 1}번 문항 위로`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn_xsm btn_ghost"
                  onClick={() => moveQuestion(idx, 1)}
                  disabled={idx === form.questions.length - 1}
                  aria-label={`${idx + 1}번 문항 아래로`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn_xsm btn_danger_outline"
                  onClick={() => removeQuestion(q.key)}
                  aria-label={`${idx + 1}번 문항 삭제`}
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor={`qt_${q.key}`}>
                문항 제목<span className="req">*</span>
              </label>
              <input
                id={`qt_${q.key}`}
                data-err={`q:${q.key}`}
                className={`form_input${errors[`q:${q.key}`] ? ' is_error' : ''}`}
                value={q.title}
                onChange={(e) => {
                  updateQuestion(q.key, { title: e.target.value });
                  clearError(`q:${q.key}`);
                }}
                placeholder="예) 매장 청결 상태는 어떠셨나요?"
              />
              {errors[`q:${q.key}`] && <div className="form_hint error">{errors[`q:${q.key}`]}</div>}
            </div>

            <div className="form_group">
              <span className="form_label">답변 방식</span>
              <div className="chip_select" role="radiogroup" aria-label={`${idx + 1}번 문항 답변 방식`}>
                {ATYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={q.atype === t}
                    className={`chip_opt${q.atype === t ? ' on' : ''}`}
                    onClick={() => changeAtype(q, t)}
                  >
                    {SHOP_SURVEY_ATYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {isChoice(q.atype) && (
              <div className="form_group">
                <span className="form_label">
                  보기<span className="req">*</span>
                </span>
                <div className="sv_edit_options">
                  {q.options.map((o, oi) => (
                    <div key={o.key} className="sv_edit_option">
                      <span className="sv_edit_option_no mono">{oi + 1}</span>
                      <div className="sv_edit_option_input">
                        <input
                          data-err={`o:${o.key}`}
                          className={`form_input${errors[`o:${o.key}`] ? ' is_error' : ''}`}
                          value={o.label}
                          onChange={(e) => updateOption(q, o.key, e.target.value)}
                          placeholder={`보기 ${oi + 1}`}
                          aria-label={`${idx + 1}번 문항 보기 ${oi + 1}`}
                        />
                        {errors[`o:${o.key}`] && <div className="form_hint error">{errors[`o:${o.key}`]}</div>}
                      </div>
                      <button
                        type="button"
                        className="btn btn_xsm btn_ghost"
                        onClick={() => removeOption(q, o.key)}
                        disabled={q.options.length <= 2}
                        aria-label={`보기 ${oi + 1} 삭제`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  data-err={`opts:${q.key}`}
                  className="btn btn_sm btn_outline_primary sv_edit_add_option"
                  onClick={() => addOption(q)}
                >
                  + 보기 추가
                </button>
                {errors[`opts:${q.key}`] && <div className="form_hint error">{errors[`opts:${q.key}`]}</div>}
              </div>
            )}

            <div className="sv_edit_switches">
              <label className="sv_edit_switch">
                <span className="form_switch">
                  <input
                    type="checkbox"
                    checked={q.requiredyn === 1}
                    onChange={(e) => updateQuestion(q.key, { requiredyn: e.target.checked ? 1 : 0 })}
                  />
                  <span className="track" />
                </span>
                필수 응답
              </label>
              <label className="sv_edit_switch">
                <span className="form_switch">
                  <input
                    type="checkbox"
                    checked={q.fileyn === 1}
                    onChange={(e) => updateQuestion(q.key, { fileyn: e.target.checked ? 1 : 0 })}
                  />
                  <span className="track" />
                </span>
                사진 첨부 허용 (최대 10장)
              </label>
            </div>
          </div>
        ))}

        <button type="button" data-err="questions" className="btn btn_md btn_outline_primary sv_edit_add_q" onClick={addQuestion}>
          + 문항 추가
        </button>
        {errors.questions && <div className="form_hint error">{errors.questions}</div>}

        <div className="form_page_footer">
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack} disabled={saving}>
            취소
          </button>
          {mode === 'edit' ? (
            <button type="button" className="btn btn_md btn_primary" onClick={saveEdit} disabled={saving}>
              {saving ? '저장 중...' : '수정 저장'}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn_md btn_outline_primary" onClick={saveDraft} disabled={saving}>
                임시저장
              </button>
              <button type="button" className="btn btn_md btn_primary" onClick={publish} disabled={saving}>
                {saving ? '처리 중...' : '게시하기'}
              </button>
            </>
          )}
        </div>
      </div>

      {alertModal}
    </section>
  );
}
