import { useEffect, useRef, useState } from 'react';
import { AlertModal, PageHeader } from '../../../components/ui';
import TextCount from '../../../components/ui/common/TextCount';
import { usePaging } from '../../../hooks/usePaging';
import { axiosInstance, cutByByte, getNowDate, set_focus } from '../../../utils/Tool';
import { QA_TYPE_MAP, type FaqCRequest } from '../../../components/ts/QaType';
import {
  FAQ_SUGGEST_PERIODS,
  clearFaqSuggestCache,
  loadFaqSuggestCache,
  requestFaqSuggest,
  saveFaqSuggestCache,
  type FaqDraftItem,
  type FaqSuggestResult,
} from '../../../components/ts/QaFaqSuggest';
import { logUnexpected } from '../../../components/ts/ApiError';
import './faqSuggest.css';

/* ---------------------------------------------------------------------
   FAQ AI 추천 화면 — 관리자 문의 관리 [자주 묻는 질문] 탭의 [AI 추천]에서 들어옴

   [추천 받기]를 누르면 AI가 기간 내 문의(관리자 답변이 달린 것)를 비슷한 것끼리 묶어
   FAQ 초안을 만들어 줍니다. 초안은 이 화면에서 바로 고쳐서 하나씩 [FAQ 등록]하거나,
   체크한 것을 [선택 등록]으로 한꺼번에 등록합니다. (자동 등록 없음)
   등록한 초안은 목록에서 사라집니다 — 이후 수정은 FAQ 목록에서.

   분석에 몇 분이 걸리므로 남은 초안과 고친 내용은 이 브라우저 탭에 보관합니다 —
   다른 화면을 보고 와도 그대로 남아 있습니다.
   남은 초안이 없으면(모두 등록·제외했거나 추천할 것이 없으면) 처음 화면으로 돌아갑니다.
--------------------------------------------------------------------- */

type DraftErrors = Partial<Record<'title' | 'content' | 'answer', string>>;

// 필수 항목이 늘어나면 이 배열에 한 줄만 추가하면 됩니다. (FAQ 작성 화면과 같은 방식)
const REQUIRED_FIELDS: { field: keyof DraftErrors; label: string }[] = [
  { field: 'title', label: '문의 제목' },
  { field: 'content', label: '문의 내용' },
  { field: 'answer', label: '답변 내용' },
];

const STEPS = [
  { no: 1, title: '문의 모으기', desc: '선택한 기간에 들어온 문의 중 관리자 답변이 달린 것만 읽습니다.' },
  { no: 2, title: '비슷한 질문 묶기', desc: '같은 질문이 2건 이상이면 한 묶음으로 만들고, 이미 FAQ에 있는 내용은 뺍니다.' },
  { no: 3, title: '초안 확인 후 등록', desc: '묶음마다 질문·답변 초안을 만듭니다. 이 화면에서 고친 뒤 등록하세요.' },
];

const fieldId = (id: number, field: string) => `faq_sg_${id}_${field}`;

export default function FaqSuggest() {
  const { goToList } = usePaging({ basePath: '/dbms/qa' });

  const cached = useRef(loadFaqSuggestCache()).current;
  const [days, setDays] = useState<number>(cached?.days ?? 90);
  const [result, setResult] = useState<FaqSuggestResult | null>(cached?.result ?? null);
  const [items, setItems] = useState<FaqDraftItem[]>(cached?.items ?? []);
  const [registered, setRegistered] = useState<number>(cached?.registered ?? 0);
  const [analyzedAt, setAnalyzedAt] = useState(cached?.at ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 처음 화면에 보여 줄 안내 — 직전 추천이 어떻게 끝났는지 (추천할 것이 없음 / 초안을 모두 처리함)
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<Record<number, DraftErrors>>({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  // 화면을 떠난 뒤 늦게 도착한 응답은 버림
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // 남은 초안·고친 내용을 보관 — 다른 화면을 보고 와도 남아 있게
  // 남은 초안이 없으면 보관한 것을 지우고 처음 화면으로
  useEffect(() => {
    if (!result) return;
    if (items.length > 0) {
      saveFaqSuggestCache({ days, result, items, registered, at: analyzedAt });
      return;
    }
    clearFaqSuggestCache();
    setNotice(
      result.candidates.length === 0
        ? `${result.from} ~ ${result.to} 문의 ${result.analyzed.toLocaleString()}건을 분석했지만 ` +
            (result.groups === 0
              ? '같은 질문이 2건 이상 들어온 경우가 없어 추천할 FAQ가 없습니다.'
              : '추천할 만한 새 FAQ가 없습니다. (이미 FAQ에 있거나, 답변이 서로 달라 초안으로 만들지 못했습니다)')
        : registered > 0
          ? `초안을 모두 처리했습니다. (${registered}개 등록) 등록한 FAQ는 목록의 [자주 묻는 질문] 탭에서 확인·수정할 수 있습니다.`
          : '초안을 모두 제외했습니다.',
    );
    setResult(null);
    setRegistered(0);
    setAnalyzedAt('');
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, result, registered, analyzedAt]);

  const suggest = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await requestFaqSuggest(days);
      const at = new Date().toLocaleString('ko-KR');
      const drafts: FaqDraftItem[] = data.candidates.map((c, idx) => ({
        id: idx,
        type: QA_TYPE_MAP[c.type] ? c.type : 0,
        title: cutByByte(c.title ?? '', 200),
        content: c.content ?? '',
        answer: c.answer ?? '',
        count: c.count,
        sources: c.sources ?? [],
        reason: c.reason ?? '',
        checked: true,
      }));
      // 화면을 떠났어도 결과는 보관 — 돌아오면 보임 (추천할 것이 없으면 보관하지 않음)
      if (drafts.length > 0) saveFaqSuggestCache({ days, result: data, items: drafts, registered: 0, at });
      else clearFaqSuggestCache();
      if (!alive.current) return;
      setResult(data);
      setItems(drafts);
      setRegistered(0);
      setAnalyzedAt(at);
      setErrors({});
    } catch (err) {
      if (!alive.current) return;
      logUnexpected('FAQ AI 추천 실패:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'AI 추천에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (alive.current) setLoading(false);
    }
  };

  const change = (id: number, patch: Partial<FaqDraftItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const cleared = Object.keys(patch).filter((k) => errors[id]?.[k as keyof DraftErrors]);
    if (cleared.length > 0) {
      setErrors((prev) => {
        const next = { ...prev[id] };
        cleared.forEach((k) => delete next[k as keyof DraftErrors]);
        return { ...prev, [id]: next };
      });
    }
  };

  /** 등록할 초안들의 필수 항목 확인 — 하나라도 비어 있으면 표시하고 첫 오류 칸으로 이동 */
  const validate = (targets: FaqDraftItem[]) => {
    const nextErrors: Record<number, DraftErrors> = {};
    let firstErrorId: string | null = null;
    for (const item of targets) {
      const itemErrors: DraftErrors = {};
      for (const { field, label } of REQUIRED_FIELDS) {
        if (!item[field].trim()) {
          itemErrors[field] = `${label}을(를) 입력해주세요.`;
          if (!firstErrorId) firstErrorId = fieldId(item.id, field);
        }
      }
      nextErrors[item.id] = itemErrors;
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (firstErrorId) {
      set_focus(firstErrorId);
      return false;
    }
    return true;
  };

  /** 초안 등록 — 하나든 여러 개든 같은 처리. 등록된 초안은 목록에서 뺌 */
  const register = async (targets: FaqDraftItem[]) => {
    if (saving || targets.length === 0 || !validate(targets)) return;
    setSaving(true);
    const done: number[] = [];
    let failMessage = '';
    for (const item of targets) {
      // 작성 관리자 번호는 보내지 않음 — 서버가 로그인 토큰에서 찾음
      const payload: FaqCRequest = {
        type: item.type,
        title: item.title.trim(),
        content: item.content.trim(),
        answer: item.answer.trim(),
        cdate: getNowDate(),
        pw: '', // FAQ는 게시글 비밀번호를 쓰지 않음
        fileyn: 'N',
      };
      try {
        await axiosInstance.post('/qa/faq', payload);
        done.push(item.id);
      } catch (err) {
        logUnexpected('FAQ 등록 실패:', err);
        failMessage =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'FAQ를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        break; // 서버 문제일 가능성이 높아 나머지는 시도하지 않음 (남은 초안은 그대로 유지)
      }
    }
    if (done.length > 0) {
      setItems((prev) => prev.filter((it) => !done.includes(it.id)));
      setRegistered((prev) => prev + done.length);
    }
    setSaving(false);
    if (failMessage) {
      const prefix = done.length > 0 ? `${done.length}개는 등록했고, 나머지는 등록하지 못했습니다.\n` : '';
      setAlert({ message: prefix + failMessage, variant: 'error' });
    } else {
      setAlert({ message: done.length > 1 ? `FAQ ${done.length}개가 등록되었습니다.` : 'FAQ가 등록되었습니다.', variant: 'success' });
    }
  };

  const checkedItems = items.filter((it) => it.checked);
  const allChecked = items.length > 0 && checkedItems.length === items.length;

  return (
    <section className="view active">
      <PageHeader
        title="FAQ AI 추천"
        description="자주 들어온 문의를 AI가 묶어 FAQ 초안을 만들어 줍니다."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="card card_pad_lg faq_sg">
        <div className="faq_sg_bar">
          <div className="faq_sg_bar_text">
            <strong>분석할 기간</strong>
            <span className="cell_sub">관리자 답변이 달린 문의만 읽습니다. 초안은 등록 버튼을 눌러야 등록됩니다.</span>
          </div>
          <select
            className="form_select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={loading || saving}
            aria-label="분석할 기간"
          >
            {FAQ_SUGGEST_PERIODS.map((p) => (
              <option key={p.days} value={p.days}>{p.label}</option>
            ))}
          </select>
          <button type="button" className="btn btn_md btn_primary" disabled={loading || saving} onClick={suggest}>
            {loading ? '분석 중...' : result ? '✨ 다시 추천' : '✨ 추천 받기'}
          </button>
        </div>

        {/* 진행 단계 안내 — 결과가 없을 때(처음·분석 중)만 */}
        {(!result || loading) && (
          <ol className={`faq_sg_steps${loading ? ' is_running' : ''}`}>
            {STEPS.map((s) => (
              <li className="faq_sg_step" key={s.no}>
                <span className="faq_sg_step_no">{s.no}</span>
                <strong>{s.title}</strong>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        )}

        {loading && (
          <p className="faq_sg_message" aria-live="polite">
            AI가 문의를 읽고 비슷한 질문끼리 묶고 있어요. 몇 분 걸릴 수 있어요.
            다른 화면을 보고 와도 결과는 이 화면에 남아 있습니다.
          </p>
        )}
        {!loading && !result && !error && (
          <p className="faq_sg_message" aria-live="polite">
            {notice || '아직 추천받은 내용이 없습니다. 기간을 고르고 [추천 받기]를 눌러 주세요.'}
          </p>
        )}
        {!loading && error && <p className="faq_sg_message is_error" aria-live="polite">{error}</p>}
      </div>

      {!loading && result && items.length > 0 && (
        <div aria-live="polite">
          <p className="faq_sg_summary">
            {result.from} ~ {result.to} · 문의 {result.analyzed.toLocaleString()}건 분석 · 비슷한 질문 묶음 {result.groups}개
            {result.skipped > 0 && ` · 이미 FAQ에 있어 제외 ${result.skipped}개`}
            {registered > 0 && ` · ${registered}개 등록함`}
            {analyzedAt && ` · ${analyzedAt} 분석`}
          </p>

          <>
              {/* 일괄 등록 — 체크한 초안을 한꺼번에 */}
              <div className="faq_sg_bulk">
                <label className="faq_sg_check">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    disabled={saving}
                    onChange={(e) => setItems((prev) => prev.map((it) => ({ ...it, checked: e.target.checked })))}
                  />
                  전체 선택 ({checkedItems.length} / {items.length})
                </label>
                <button
                  type="button"
                  className="btn btn_md btn_primary"
                  disabled={saving || checkedItems.length === 0}
                  onClick={() => register(checkedItems)}
                >
                  {saving ? '등록 중...' : `선택한 ${checkedItems.length}개 등록`}
                </button>
              </div>

              <ul className="faq_sg_list">
                {items.map((item) => {
                  const err = errors[item.id] ?? {};
                  return (
                    <li className={`faq_sg_item${item.checked ? ' is_checked' : ''}`} key={item.id}>
                      <div className="faq_sg_item_head">
                        <label className="faq_sg_check">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            disabled={saving}
                            onChange={(e) => change(item.id, { checked: e.target.checked })}
                            aria-label="일괄 등록에 포함"
                          />
                        </label>
                        <span className="badge badge_info">문의 {item.count}건</span>
                        {item.reason && <span className="faq_sg_reason">{item.reason}</span>}
                      </div>

                      <div className="faq_sg_form">
                        <div className="form_group faq_sg_type">
                          <label className="form_label" htmlFor={fieldId(item.id, 'type')}>문의 유형</label>
                          <select
                            id={fieldId(item.id, 'type')}
                            className="form_select"
                            value={item.type}
                            disabled={saving}
                            onChange={(e) => change(item.id, { type: Number(e.target.value) })}
                          >
                            {Object.entries(QA_TYPE_MAP).map(([type, { label }]) => (
                              <option key={type} value={type}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form_group faq_sg_title_group">
                          <label className="form_label" htmlFor={fieldId(item.id, 'title')}>
                            문의 제목<span className="req" title="필수 입력 요소">*</span>
                          </label>
                          <input
                            type="text"
                            id={fieldId(item.id, 'title')}
                            className={`form_input ${err.title ? 'is_error' : ''}`}
                            value={item.title}
                            disabled={saving}
                            onChange={(e) => change(item.id, { title: cutByByte(e.target.value, 200) })}
                          />
                          <TextCount value={item.title} maxBytes={200} />
                          {err.title && <div className="form_hint error">{err.title}</div>}
                        </div>

                        <div className="form_group">
                          <label className="form_label" htmlFor={fieldId(item.id, 'content')}>
                            Q. 문의 내용<span className="req" title="필수 입력 요소">*</span>
                          </label>
                          <textarea
                            id={fieldId(item.id, 'content')}
                            className={`form_textarea ${err.content ? 'is_error' : ''}`}
                            value={item.content}
                            disabled={saving}
                            onChange={(e) => change(item.id, { content: e.target.value })}
                          />
                          {err.content && <div className="form_hint error">{err.content}</div>}
                        </div>

                        <div className="form_group">
                          <label className="form_label is_answer" htmlFor={fieldId(item.id, 'answer')}>
                            A. 답변 내용<span className="req" title="필수 입력 요소">*</span>
                          </label>
                          <textarea
                            id={fieldId(item.id, 'answer')}
                            className={`form_textarea ${err.answer ? 'is_error' : ''}`}
                            value={item.answer}
                            disabled={saving}
                            onChange={(e) => change(item.id, { answer: e.target.value })}
                          />
                          {err.answer && <div className="form_hint error">{err.answer}</div>}
                        </div>
                      </div>

                      {item.sources.length > 0 && (
                        <div className="faq_sg_sources">
                          <span className="faq_sg_label">근거가 된 문의 (새 탭에서 열림)</span>
                          <ul>
                            {item.sources.map((s) => (
                              <li key={s.no}>
                                <a className="faq_sg_source" href={`/dbms/qa/${s.no}`} target="_blank" rel="noopener noreferrer">
                                  No.{s.no} · {s.title || '(제목 없음)'}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="faq_sg_actions">
                        <button
                          type="button"
                          className="btn btn_sm btn_ghost"
                          disabled={saving}
                          onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                        >
                          제외
                        </button>
                        <button
                          type="button"
                          className="btn btn_sm btn_outline_primary"
                          disabled={saving}
                          onClick={() => register([item])}
                        >
                          FAQ 등록
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
          </>
        </div>
      )}

      <AlertModal
        open={alert !== null}
        message={alert?.message ?? ''}
        variant={alert?.variant}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
