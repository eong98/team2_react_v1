import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { axiosInstance, getByteLength } from '../../utils/Tool.ts';
import {
  SHOP_SURVEY_SCALE_MAX,
  getShopSurveyErrorMessage,
  type ShopSurveyForm,
  type ShopSurveyQuestion,
} from '../../components/ts/ShopSurvey.ts';
import './shopSurveyPublic.css';

/* ---------------------------------------------------------------------
   손님용 설문 응답 화면 (/s/:qrid)

   매장에 붙은 QR코드를 찍으면 들어오는 페이지입니다.
   - 로그인 불필요, /user·/dbms와 분리 (사이드바/탑바 없는 단독 화면)
   - 휴대폰 화면 기준으로 구성
   - 사진은 업로드 전에 긴 변 1600px JPEG로 줄여서 보냄 (용량 초과 방지)

   API (ShopSurveyCont, /shop_survey/public - SecurityConfig permitAll)
   GET  /shop_survey/public/{qrid}          설문 조회 (진행중만)
   POST /shop_survey/public/{qrid}/submit   multipart
        data        : JSON { answers: [{ sqno, content, scale, sonos }] }
        file_{sqno} : 해당 문항 사진 (여러 장)

   기존 axiosInstance는 401/403이면 토큰 재발급 후 로그인 페이지로 보내는 인터셉터가
   있어서, 손님 화면은 같은 서버 주소로 인터셉터 없는 별도 axios를 씁니다.
--------------------------------------------------------------------- */

const publicApi = axios.create({ baseURL: axiosInstance.defaults.baseURL });

/** 문항당 최대 사진 수 (백엔드와 동일하게 고정) */
const MAX_FILES = 10;
/** 단답/장문 최대 바이트 (SHOP_SURVEY_ANSWER.CONTENT VARCHAR2(3000)) */
const CONTENT_BYTES = 3000;
/** 업로드 전 리사이즈 기준 */
const RESIZE_MAX = 1600;

interface AnswerState {
  content: string;
  scale: number | null;
  sonos: number[];
  files: { file: File; preview: string }[];
}

const emptyAnswer = (): AnswerState => ({ content: '', scale: null, sonos: [], files: [] });

type Phase = 'loading' | 'error' | 'form' | 'done';

export default function ShopSurveyPublic() {
  const { qrid } = useParams<{ qrid: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [survey, setSurvey] = useState<ShopSurveyForm | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 미리보기 URL 정리용
  const previewsRef = useRef<string[]>([]);
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    if (!qrid) return;
    setPhase('loading');
    publicApi
      .get<ShopSurveyForm>(`/shop_survey/public/${qrid}`)
      .then((res) => {
        setSurvey(res.data);
        const init: Record<number, AnswerState> = {};
        res.data.questions.forEach((q) => {
          if (q.no != null) init[q.no] = emptyAnswer();
        });
        setAnswers(init);
        setPhase('form');
      })
      .catch((err) => {
        setErrorMessage(getShopSurveyErrorMessage(err, '설문을 불러오지 못했습니다.'));
        setPhase('error');
      });
  }, [qrid]);

  const questions = useMemo(() => survey?.questions.filter((q) => q.no != null) ?? [], [survey]);

  const update = (sqno: number, patch: Partial<AnswerState>) => {
    setAnswers((prev) => ({ ...prev, [sqno]: { ...prev[sqno], ...patch } }));
    setErrors((prev) => {
      if (!prev[sqno]) return prev;
      const next = { ...prev };
      delete next[sqno];
      return next;
    });
  };

  const toggleOption = (q: ShopSurveyQuestion, sono: number) => {
    const sqno = q.no as number;
    const current = answers[sqno]?.sonos ?? [];
    if (q.atype === 'SINGLE') {
      update(sqno, { sonos: current[0] === sono ? [] : [sono] });
    } else {
      update(sqno, { sonos: current.includes(sono) ? current.filter((s) => s !== sono) : [...current, sono] });
    }
  };

  const addFiles = async (sqno: number, e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ''; // 같은 파일 다시 선택 가능하게
    if (picked.length === 0) return;

    const current = answers[sqno]?.files ?? [];
    const room = MAX_FILES - current.length;
    if (room <= 0) {
      setErrors((prev) => ({ ...prev, [sqno]: `사진은 ${MAX_FILES}장까지 올릴 수 있어요.` }));
      return;
    }

    const images = picked.filter((f) => f.type.startsWith('image/'));
    const resized = await Promise.all(images.slice(0, room).map(resizeImage));
    const added = resized.map((file) => {
      const preview = URL.createObjectURL(file);
      previewsRef.current.push(preview);
      return { file, preview };
    });

    update(sqno, { files: [...current, ...added] });
    if (images.length < picked.length) {
      setErrors((prev) => ({ ...prev, [sqno]: '이미지 파일만 올릴 수 있어요.' }));
    } else if (images.length > room) {
      setErrors((prev) => ({ ...prev, [sqno]: `사진은 ${MAX_FILES}장까지 올릴 수 있어요.` }));
    }
  };

  const removeFile = (sqno: number, idx: number) => {
    const current = answers[sqno]?.files ?? [];
    update(sqno, { files: current.filter((_, i) => i !== idx) });
  };

  /** 답 값이 있는지 (사진 제외) - 백엔드 hasValue와 같은 기준 */
  const hasValue = (q: ShopSurveyQuestion, a: AnswerState | undefined) => {
    if (!a) return false;
    if (q.atype === 'SHORT' || q.atype === 'LONG') return a.content.trim() !== '';
    if (q.atype === 'SCALE') return a.scale !== null;
    return a.sonos.length > 0;
  };

  const validate = () => {
    const next: Record<number, string> = {};
    for (const q of questions) {
      const sqno = q.no as number;
      const a = answers[sqno];
      if (q.requiredyn === 1 && !hasValue(q, a)) {
        next[sqno] = '필수 문항이에요.';
      } else if ((q.atype === 'SHORT' || q.atype === 'LONG') && a && getByteLength(a.content) > CONTENT_BYTES) {
        next[sqno] = `답변이 너무 길어요. (최대 한글 약 ${CONTENT_BYTES / 3}자)`;
      }
    }
    setErrors(next);

    // 첫 번째 오류 문항으로 이동
    const first = questions.find((q) => next[q.no as number]);
    if (first) {
      const el = document.getElementById(`q_${first.no}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLElement>('input,textarea,button')?.focus({ preventScroll: true });
    }
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !qrid) return;
    setSubmitError('');
    if (!validate()) return;

    const formData = new FormData();
    const payload = {
      answers: questions
        .map((q) => {
          const sqno = q.no as number;
          const a = answers[sqno];
          return {
            sqno,
            content: q.atype === 'SHORT' || q.atype === 'LONG' ? a.content.trim() || null : null,
            scale: q.atype === 'SCALE' ? a.scale : null,
            sonos: q.atype === 'SINGLE' || q.atype === 'MULTI' ? a.sonos : [],
          };
        })
        .filter((a, i) => hasValue(questions[i], answers[a.sqno])),
    };
    formData.append('data', JSON.stringify(payload));
    questions.forEach((q) => {
      const sqno = q.no as number;
      answers[sqno].files.forEach(({ file }) => formData.append(`file_${sqno}`, file, file.name));
    });

    setSubmitting(true);
    try {
      await publicApi.post(`/shop_survey/public/${qrid}/submit`, formData);
      setPhase('done');
      window.scrollTo({ top: 0 });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setSubmitError(
        status === 413
          ? '사진 용량이 너무 커요. 사진 수를 줄여서 다시 시도해주세요.'
          : getShopSurveyErrorMessage(err, '제출하지 못했어요. 잠시 후 다시 시도해주세요.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- 화면 ---------------- */

  if (phase === 'loading') {
    return (
      <main className="sv_public">
        <div className="sv_card sv_state">불러오는 중...</div>
      </main>
    );
  }

  if (phase === 'error' || !survey) {
    return (
      <main className="sv_public">
        <div className="sv_card sv_state">
          <p className="sv_state_title">설문에 참여할 수 없어요</p>
          <p className="sv_state_desc">{errorMessage}</p>
        </div>
      </main>
    );
  }

  if (phase === 'done') {
    return (
      <main className="sv_public">
        <div className="sv_card sv_state">
          <p className="sv_state_icon" aria-hidden="true">✓</p>
          <p className="sv_state_title">응답해주셔서 감사합니다</p>
          <p className="sv_state_desc">
            {survey.shopTitle ? `${survey.shopTitle}에서 ` : ''}소중한 의견을 참고하겠습니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="sv_public">
      <header className="sv_card sv_head">
        {survey.shopTitle && <p className="sv_shop">{survey.shopTitle}</p>}
        <h1 className="sv_title">{survey.title}</h1>
        {survey.description && <p className="sv_desc">{survey.description}</p>}
        {questions.some((q) => q.requiredyn === 1) && (
          <p className="sv_req_note">
            <span className="sv_req">*</span> 표시는 필수 문항입니다.
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {questions.map((q, idx) => {
          const sqno = q.no as number;
          const a = answers[sqno] ?? emptyAnswer();
          const error = errors[sqno];
          const isChoice = q.atype === 'SINGLE' || q.atype === 'MULTI';

          return (
            <fieldset key={sqno} id={`q_${sqno}`} className={`sv_card sv_q${error ? ' has_error' : ''}`}>
              <legend className="sv_q_title">
                <span className="sv_q_no">{idx + 1}.</span> {q.title}
                {q.requiredyn === 1 && <span className="sv_req"> *</span>}
              </legend>
              {q.atype === 'MULTI' && <p className="sv_q_hint">여러 개 선택할 수 있어요.</p>}

              {q.atype === 'SHORT' && (
                <input
                  type="text"
                  className={`form_input${error ? ' is_error' : ''}`}
                  value={a.content}
                  onChange={(e) => update(sqno, { content: e.target.value })}
                  placeholder="답변을 입력해주세요"
                  maxLength={1000}
                />
              )}

              {q.atype === 'LONG' && (
                <textarea
                  className={`form_textarea${error ? ' is_error' : ''}`}
                  value={a.content}
                  onChange={(e) => update(sqno, { content: e.target.value })}
                  placeholder="자유롭게 적어주세요"
                  maxLength={1000}
                  rows={4}
                />
              )}

              {isChoice && (
                <div className="sv_options" role={q.atype === 'SINGLE' ? 'radiogroup' : 'group'}>
                  {q.options.map((o) => {
                    const sono = o.no as number;
                    const on = a.sonos.includes(sono);
                    return (
                      <button
                        key={sono}
                        type="button"
                        role={q.atype === 'SINGLE' ? 'radio' : 'checkbox'}
                        aria-checked={on}
                        className={`sv_option${on ? ' on' : ''}`}
                        onClick={() => toggleOption(q, sono)}
                      >
                        <span className={`sv_option_mark ${q.atype === 'SINGLE' ? 'radio' : 'check'}`} aria-hidden="true" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.atype === 'SCALE' && (
                <div className="sv_scale">
                  <div className="sv_scale_btns" role="radiogroup" aria-label={`0점부터 ${SHOP_SURVEY_SCALE_MAX}점`}>
                    {Array.from({ length: SHOP_SURVEY_SCALE_MAX + 1 }, (_, n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={a.scale === n}
                        className={`sv_scale_btn${a.scale === n ? ' on' : ''}`}
                        onClick={() => update(sqno, { scale: a.scale === n ? null : n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="sv_scale_legend">
                    <span>매우 불만족</span>
                    <span>매우 만족</span>
                  </div>
                </div>
              )}

              {q.fileyn === 1 && (
                <div className="sv_files">
                  <div className="sv_file_grid">
                    {a.files.map((f, i) => (
                      <div key={f.preview} className="sv_file_item">
                        <img src={f.preview} alt={`첨부 사진 ${i + 1}`} />
                        <button
                          type="button"
                          className="sv_file_remove"
                          onClick={() => removeFile(sqno, i)}
                          aria-label={`첨부 사진 ${i + 1} 삭제`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {a.files.length < MAX_FILES && (
                      <label className="sv_file_add">
                        <input type="file" accept="image/*" multiple onChange={(e) => addFiles(sqno, e)} />
                        <span aria-hidden="true">＋</span>
                        <span className="sv_file_add_text">사진 추가</span>
                      </label>
                    )}
                  </div>
                  <p className="form_hint">
                    사진 {a.files.length}/{MAX_FILES}장 (선택)
                  </p>
                </div>
              )}

              {error && <div className="form_hint error">{error}</div>}
            </fieldset>
          );
        })}

        {submitError && <div className="sv_submit_error">{submitError}</div>}

        <button type="submit" className="btn btn_lg btn_primary sv_submit" disabled={submitting}>
          {submitting ? '제출 중...' : '제출하기'}
        </button>
      </form>
    </main>
  );
}

/* ---------------------------------------------------------------------
   사진 리사이즈: 긴 변 RESIZE_MAX px, JPEG 0.85
   GIF(움짤)나 이미 작은 사진, 변환 실패 시에는 원본 그대로 보냄
--------------------------------------------------------------------- */
async function resizeImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, RESIZE_MAX / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file; // HEIC 등 브라우저가 못 읽는 형식
  }
}
