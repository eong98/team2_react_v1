import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AlertModal, PageHeader } from '../../../components/ui';
import type { AnswerState, Survey } from '../../../components/ts/survey';
import { formatDate, getOptions } from '../../../components/ts/survey';
import { GlobalStoreSession } from '../../../store/LoginStore';

import {
  getMemberSurveyResponse,
  getSurvey,
  submitSurveyResponse,
  updateMemberSurveyResponse,
} from '../../../components/ts/surveyApi';

import './SurveyAnswerForm.css';

/* =========================================================
   사용자 설문 답변 페이지
   - 최초 참여: 설문 제출
   - 기존 참여: 설문 기간 중 응답 수정
========================================================= */
export default function SurveyAnswerForm() {
  const { no } = useParams<{ no: string }>();
  const navigate = useNavigate();
  const memberNo = GlobalStoreSession((state) => state.no);
  const grade = GlobalStoreSession((state) => state.grade);
  const isShopOwner = grade === 10;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 프로젝트 공통 AlertModal
  const [alert, setAlert] = useState<{
    message: string;
    variant?: 'success' | 'error';
    onConfirm?: () => void;
  } | null>(null);

  /* 설문 정보와 로그인 회원의 기존 응답을 함께 조회한다. */
  useEffect(() => {
    const loadSurvey = async () => {
      if (!no) {
        setError('설문번호가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // 설문 기본정보와 문항 조회
        const surveyData = await getSurvey(no);
        setSurvey(surveyData);

        /*
         * 기존 응답 조회.
         * 응답이 있으면 수정 모드로 변경하고 기존 답변을 폼에 채운다.
         * 응답이 없어서 조회가 실패하면 최초 작성 모드로 유지한다.
         */
        try {
          const response = await getMemberSurveyResponse(no, memberNo);
          const savedAnswers: AnswerState = {};

          response.answers?.forEach((answer) => {
            const question = surveyData.questions.find(
              (item) => item.no === answer.questionNo
            );

            if (!question) return;

            // 복수선택은 DB의 | 구분 문자열을 다시 배열로 변환한다.
            if (question.qtype === 'MULTIPLE') {
              savedAnswers[answer.questionNo] = answer.atext
                ? answer.atext.split('|').filter(Boolean)
                : [];
            } else {
              savedAnswers[answer.questionNo] = answer.atext ?? '';
            }
          });

          setAnswers(savedAnswers);
          setIsEdit(true);
        } catch {
          // 기존 응답이 없으면 최초 설문 작성 상태
          setAnswers({});
          setIsEdit(false);
        }
      } catch (err) {
        console.error(err);
        setError('설문 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [no, memberNo]);

  /* 주관식, 단일선택, 만족도 답변 변경 */
  const handleAnswerChange = (questionNo: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionNo]: value }));
  };

  /* 복수선택 답변 변경 */
  const handleMultipleChange = (
    questionNo: number,
    option: string,
    checked: boolean
  ) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionNo])
        ? (prev[questionNo] as string[])
        : [];

      const next = checked
        ? [...current, option]
        : current.filter((item) => item !== option);

      return { ...prev, [questionNo]: next };
    });
  };

  /* 해당 문항에 실제 답변이 입력되어 있는지 확인한다. */
  const hasAnswer = (questionNo: number): boolean => {
    const answer = answers[questionNo];

    if (Array.isArray(answer)) return answer.length > 0;

    return Boolean(answer && answer.trim().length > 0);
  };

  // 현재 답변한 문항 수
  const answeredCount =
    survey?.questions.filter((question) => hasAnswer(question.no)).length ?? 0;

  // 전체 문항 기준 진행률
  const progress =
    survey && survey.questions.length > 0
      ? (answeredCount / survey.questions.length) * 100
      : 0;

  /* 필수 문항 중 응답하지 않은 문항이 있는지 검사한다. */
  const validateAnswers = () => {
    if (!survey) return false;

    for (const question of survey.questions) {
      if (question.requiredYn !== 'Y') continue;

      if (!hasAnswer(question.no)) {
        setAlert({
          message: `필수 문항에 응답해주세요.\n${question.qtext}`,
          variant: 'error',
        });
        return false;
      }
    }

    return true;
  };

  /* 최초 제출 또는 기존 응답 수정을 처리한다. */
  const handleSubmit = async () => {
    if (!survey || !no) return;

    // 점주만 설문 제출/수정 가능
    if (!isShopOwner) {
      setAlert({
        message: '설문조사 응답은 점주만 가능합니다.',
        variant: 'error',
      });
      return;
    }

    if (!validateAnswers()) return;

    /*
     * 실제 답변한 문항만 서버로 전달한다.
     * MULTIPLE은 기존 DB 저장방식에 맞춰 | 문자열로 변환한다.
     */
    const answerData = survey.questions
      .map((question) => {
        const answer = answers[question.no];

        if (Array.isArray(answer)) {
          if (answer.length === 0) return null;

          return {
            questionNo: question.no,
            atext: answer.join('|'),
          };
        }

        if (!answer || answer.trim().length === 0) return null;

        return {
          questionNo: question.no,
          atext: answer.trim(),
        };
      })
      .filter(
        (answer): answer is { questionNo: number; atext: string } =>
          answer !== null
      );

    const serverData = {
      memberNo,
      answers: answerData,
    };

    try {
      setSubmitting(true);
      setError('');

      if (isEdit) {
        // 이미 참여한 설문은 기존 응답 수정 API 호출
        await updateMemberSurveyResponse(no, memberNo, serverData);

        setAlert({
          message: '설문 응답이 수정되었습니다.',
          variant: 'success',
          onConfirm: () => navigate('/user/survey'),
        });
      } else {
        // 아직 참여하지 않은 설문은 최초 제출 API 호출
        await submitSurveyResponse(no, serverData);

        setAlert({
          message: '설문이 정상적으로 제출되었습니다.',
          variant: 'success',
          onConfirm: () => navigate('/user/survey'),
        });
      }
    } catch (err) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;

        if (message) {
          setAlert({
            message,
            variant: 'error',
          });
          return;
        }
      }

      setAlert({
        message: isEdit
          ? '설문 수정 중 서버 오류가 발생했습니다.'
          : '설문 제출 중 서버 오류가 발생했습니다.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 이전 화면으로 이동
  const handleCancel = () => {
    navigate(-1);
  };

  /* 설문 데이터 로딩 */
  if (loading) {
    return (
      <section className="view active">
        <PageHeader
          title="설문조사"
          description="설문 정보를 불러오고 있습니다."
        />

        <div className="card card_pad_lg">
          설문을 불러오는 중입니다.
        </div>
      </section>
    );
  }

  /* 점주가 아닌 경우 설문 응답 페이지 접근 제한 */
  if (!isShopOwner) {
    return (
      <section className="view active">
        <PageHeader
          title="설문조사"
          description="설문조사 응답은 점주만 가능합니다."
        />

        <div className="card card_pad_lg">
          <p style={{ margin: 0 }}>
            점주 계정만 설문조사에 참여할 수 있습니다.
          </p>

          <button
            type="button"
            className="btn btn_md btn_primary"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/user/survey')}
          >
            목록으로
          </button>
        </div>
      </section>
    );
  }

  /* 설문 조회 실패 */
  if (!survey) {
    return (
      <section className="view active">
        <PageHeader
          title="설문조사"
          description="설문 정보를 확인할 수 없습니다."
        />

        <div className="card card_pad_lg">
          <div className="survey-error">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="view active survey-answer-page">
      <PageHeader
        title={isEdit ? '설문 응답 수정' : '설문조사'}
        description={
          isEdit
            ? '설문 기간 동안 제출한 응답을 수정할 수 있습니다.'
            : '설문 문항에 응답해주세요.'
        }
      />

      <div className="survey-answer-container">
        {/* 설문 기본정보 */}
        <div className="survey-info-card">
          <div className="survey-info-icon">✓</div>

          <div className="survey-info-content">
            <h2>{survey.title}</h2>

            {survey.detail && <p>{survey.detail}</p>}

            <div className="survey-period">
              설문 기간&nbsp;
              {formatDate(survey.startDate)}
              &nbsp;~&nbsp;
              {formatDate(survey.endDate)}
            </div>
          </div>
        </div>

        {/* 기존 응답 수정 상태 안내 */}
        {isEdit && (
          <div className="card card_pad_md">
            기존에 제출한 답변입니다. 설문 기간 동안 수정할 수 있습니다.
          </div>
        )}

        {/* 설문 진행률 */}
        <div className="survey-progress-area">
          <div className="survey-progress-text">
            전체&nbsp;{survey.questions.length}문항
          </div>

          <div className="survey-progress-bar">
            <div
              className="survey-progress-value"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="survey-progress-count">
            {answeredCount}/{survey.questions.length}
          </div>
        </div>

        {/* 질문 목록 */}
        <div className="survey-question-list">
          {survey.questions.map((question, index) => {
            const options = getOptions(question.qoptions);

            return (
              <div className="survey-question-card" key={question.no}>
                <div className="survey-question-header">
                  <span className="survey-question-number">{index + 1}</span>

                  <div className="survey-question-title">
                    {question.qtext}

                    {question.requiredYn === 'Y' && (
                      <span className="survey-required">*</span>
                    )}
                  </div>
                </div>

                {/* 만족도 */}
                {question.qtype === 'SCORE' && (
                  <div className="survey-score-options">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const selected =
                        answers[question.no] === String(score);

                      return (
                        <label
                          key={score}
                          className={
                            selected
                              ? 'survey-score-item selected'
                              : 'survey-score-item'
                          }
                        >
                          <input
                            type="radio"
                            name={`question_${question.no}`}
                            value={score}
                            checked={selected}
                            onChange={() =>
                              handleAnswerChange(
                                question.no,
                                String(score)
                              )
                            }
                          />

                          <span>{score}점</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 단일선택 */}
                {question.qtype === 'SINGLE' && (
                  <div className="survey-choice-options">
                    {options.map((option) => {
                      const selected =
                        answers[question.no] === option;

                      return (
                        <label
                          key={option}
                          className={
                            selected
                              ? 'survey-choice-item selected'
                              : 'survey-choice-item'
                          }
                        >
                          <input
                            type="radio"
                            name={`question_${question.no}`}
                            checked={selected}
                            onChange={() =>
                              handleAnswerChange(question.no, option)
                            }
                          />

                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 복수선택 */}
                {question.qtype === 'MULTIPLE' && (
                  <div className="survey-choice-options">
                    {options.map((option) => {
                      const answer = answers[question.no];
                      const selected = Array.isArray(answer)
                        ? answer.includes(option)
                        : false;

                      return (
                        <label
                          key={option}
                          className={
                            selected
                              ? 'survey-choice-item selected'
                              : 'survey-choice-item'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              handleMultipleChange(
                                question.no,
                                option,
                                e.target.checked
                              )
                            }
                          />

                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 주관식 */}
                {question.qtype === 'TEXT' && (
                  <textarea
                    className="survey-textarea"
                    placeholder="답변을 입력해주세요."
                    value={
                      typeof answers[question.no] === 'string'
                        ? (answers[question.no] as string)
                        : ''
                    }
                    onChange={(e) =>
                      handleAnswerChange(question.no, e.target.value)
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && <div className="survey-error">{error}</div>}

        {/* 취소 / 제출 또는 수정 */}
        <div className="survey-form-actions">
          <button
            type="button"
            className="btn btn_md"
            disabled={submitting}
            onClick={handleCancel}
          >
            취소
          </button>

          <button
            type="button"
            className="btn btn_md btn_primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? isEdit
                ? '수정 중...'
                : '제출 중...'
              : isEdit
                ? '응답 수정'
                : '설문 제출'}
          </button>
        </div>
      </div>

      {/* 제출/수정 성공 및 오류 알림 */}
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}