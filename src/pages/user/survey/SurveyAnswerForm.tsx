import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../../../components/ui';
import type { AnswerState, Survey } from '../../../components/ts/survey';
import { formatDate, getOptions } from '../../../components/ts/survey';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getSurvey, submitSurveyResponse } from '../../../components/ts/surveyApi';
import './SurveyAnswerForm.css';


/* =========================================================
   사용자 설문 답변 페이지
========================================================= */

export default function SurveyAnswerForm() {

  /* URL의 설문번호 */
  const { no } =
    useParams<{ no: string }>();

  const navigate =
    useNavigate();


  /* =======================================================
     로그인 회원번호
  ======================================================= */

  const memberNo =
    GlobalStoreSession(
      (state) => state.no
    );


  /* =======================================================
     State
  ======================================================= */

  const [
    survey,
    setSurvey,
  ] = useState<Survey | null>(null);


  const [
    answers,
    setAnswers,
  ] = useState<AnswerState>({});


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  /* =======================================================
     설문 조회
  ======================================================= */

  useEffect(() => {

    const loadSurvey = async () => {

      if (!no) {

        setError(
          '설문번호가 없습니다.'
        );

        setLoading(false);

        return;
      }


      try {

        setLoading(true);
        setError('');


        const response =
          await getSurvey(no);


        setSurvey(
          response
        );

      } catch (err) {

        console.error(err);

        setError(
          '설문 정보를 불러오지 못했습니다.'
        );

      } finally {

        setLoading(false);
      }
    };


    loadSurvey();

  }, [no]);


  /* =======================================================
     TEXT / SINGLE / SCORE 답변 변경
  ======================================================= */

  const handleAnswerChange = (
    questionNo: number,
    value: string
  ) => {

    setAnswers((prev) => ({
      ...prev,
      [questionNo]: value,
    }));
  };


  /* =======================================================
     MULTIPLE 답변 변경
  ======================================================= */

  const handleMultipleChange = (
    questionNo: number,
    option: string,
    checked: boolean
  ) => {

    setAnswers((prev) => {

      const current =
        Array.isArray(
          prev[questionNo]
        )
          ? prev[questionNo] as string[]
          : [];


      const next =
        checked
          ? [...current, option]
          : current.filter(
            (item) =>
              item !== option
          );


      return {
        ...prev,
        [questionNo]: next,
      };
    });
  };


  /* =======================================================
     해당 문항에 답변했는지 확인
  ======================================================= */

  const hasAnswer = (
    questionNo: number
  ): boolean => {

    const answer =
      answers[questionNo];


    if (Array.isArray(answer)) {
      return answer.length > 0;
    }


    return Boolean(
      answer
      && answer.trim().length > 0
    );
  };


  /* =======================================================
     현재 답변한 문항 수
  ======================================================= */

  const answeredCount =
    survey && survey.questions
      ? survey.questions.filter(
        (question) =>
          hasAnswer(question.no)
      ).length
      : 0;


  /* =======================================================
     진행률
  ======================================================= */

  const progress =
    survey
      && survey.questions.length > 0

      ? (
        answeredCount
        / survey.questions.length
      ) * 100

      : 0;


  /* =======================================================
     필수 문항 검사
  ======================================================= */

  const validateAnswers = () => {

    if (!survey) {
      return false;
    }


    for (
      const question
      of survey.questions
    ) {

      if (
        question.requiredYn !== 'Y'
      ) {
        continue;
      }


      if (
        !hasAnswer(question.no)
      ) {

        alert(
          `필수 문항에 응답해주세요.\n${question.qtext}`
        );

        return false;
      }
    }


    return true;
  };


  /* =======================================================
     설문 제출
  ======================================================= */

  const handleSubmit = async () => {

    if (!survey || !no) {
      return;
    }


    /* 필수문항 검사 */
    if (!validateAnswers()) {
      return;
    }


    /*
     * 실제 답변한 문항만
     * 서버로 전송
     */
    const answerData =
      survey.questions
        .map((question) => {

          const answer =
            answers[question.no];


          /* 복수선택 */
          if (
            Array.isArray(answer)
          ) {

            if (
              answer.length === 0
            ) {
              return null;
            }


            return {

              questionNo:
                question.no,

              /*
               * 복수선택 답변은
               * | 로 묶어서 저장
               */
              atext:
                answer.join('|'),
            };
          }


          /* TEXT / SINGLE / SCORE */
          if (
            !answer
            || answer.trim().length === 0
          ) {
            return null;
          }


          return {

            questionNo:
              question.no,

            atext:
              answer.trim(),
          };
        })

        .filter(
          (
            answer
          ): answer is {
            questionNo: number;
            atext: string;
          } =>
            answer !== null
        );


    /*
     * 현재 로그인한 회원번호로
     * 설문 응답 제출
     */
    const serverData = {

      memberNo,

      answers:
        answerData,
    };


    try {

      setSubmitting(true);
      setError('');


      await submitSurveyResponse(
        no,
        serverData
      );


      alert(
        '설문이 정상적으로 제출되었습니다.'
      );


      /*
       * 제출 완료 후
       * 사용자 설문 목록으로 이동
       *
       * 목록으로 돌아가면
       * 참여완료 상태로 표시됨
       */
      navigate(
        '/user/survey'
      );


    } catch (err) {

      console.error(err);


      if (
        axios.isAxiosError(err)
      ) {

        const message =
          err.response
            ?.data
            ?.message;


        if (message) {

          setError(message);

          return;
        }
      }


      setError(
        '설문 제출 중 서버 오류가 발생했습니다.'
      );

    } finally {

      setSubmitting(false);
    }
  };


  /* =======================================================
     취소
  ======================================================= */

  const handleCancel = () => {

    navigate(-1);
  };


  /* =======================================================
     로딩 화면
  ======================================================= */

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


  /* =======================================================
     설문 조회 실패
  ======================================================= */

  if (!survey) {

    return (

      <section className="view active">

        <PageHeader
          title="설문조사"
          description="설문 정보를 확인할 수 없습니다."
        />


        <div className="card card_pad_lg">

          <div className="survey-error">
            {error}
          </div>

        </div>

      </section>
    );
  }


  /* =======================================================
     사용자 설문 화면
  ======================================================= */

  return (

    <section
      className="
        view
        active
        survey-answer-page
      "
    >

      <PageHeader
        title="설문조사"
        description="설문 문항에 응답해주세요."
      />


      <div className="survey-answer-container">


        {/* ===============================================
            설문 기본정보
        ================================================ */}

        <div className="survey-info-card">

          <div className="survey-info-icon">
            ✓
          </div>


          <div className="survey-info-content">

            <h2>
              {survey.title}
            </h2>


            {survey.detail && (

              <p>
                {survey.detail}
              </p>

            )}


            <div className="survey-period">

              설문 기간&nbsp;

              {formatDate(
                survey.startDate
              )}

              &nbsp;~&nbsp;

              {formatDate(
                survey.endDate
              )}

            </div>

          </div>

        </div>


        {/* ===============================================
            설문 진행률
        ================================================ */}

        <div className="survey-progress-area">

          <div className="survey-progress-text">

            전체&nbsp;
            {survey.questions.length}
            문항

          </div>


          <div className="survey-progress-bar">

            <div
              className="survey-progress-value"
              style={{
                width:
                  `${progress}%`,
              }}
            />

          </div>


          <div className="survey-progress-count">

            {answeredCount}
            /
            {survey.questions.length}

          </div>

        </div>


        {/* ===============================================
            질문 목록
        ================================================ */}

        <div className="survey-question-list">

          {survey.questions.map(
            (
              question,
              index
            ) => {

              const options =
                getOptions(
                  question.qoptions
                );


              return (

                <div
                  className="survey-question-card"
                  key={question.no}
                >


                  {/* 질문 제목 */}
                  <div className="survey-question-header">

                    <span className="survey-question-number">

                      {index + 1}

                    </span>


                    <div className="survey-question-title">

                      {question.qtext}


                      {question.requiredYn === 'Y' && (

                        <span className="survey-required">
                          *
                        </span>

                      )}

                    </div>

                  </div>


                  {/* =====================================
                      SCORE
                  ====================================== */}

                  {question.qtype === 'SCORE' && (

                    <div className="survey-score-options">

                      {[1, 2, 3, 4, 5].map(
                        (score) => {

                          const selected =
                            answers[
                            question.no
                            ]
                            === String(score);


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
                                name={
                                  `question_${question.no}`
                                }
                                value={score}
                                checked={selected}
                                onChange={() =>
                                  handleAnswerChange(
                                    question.no,
                                    String(score)
                                  )
                                }
                              />


                              <span>
                                {score}점
                              </span>

                            </label>

                          );
                        }
                      )}

                    </div>

                  )}


                  {/* =====================================
                      SINGLE
                  ====================================== */}

                  {question.qtype === 'SINGLE' && (

                    <div className="survey-choice-options">

                      {options.map(
                        (option) => {

                          const selected =
                            answers[
                            question.no
                            ]
                            === option;


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
                                name={
                                  `question_${question.no}`
                                }
                                checked={selected}
                                onChange={() =>
                                  handleAnswerChange(
                                    question.no,
                                    option
                                  )
                                }
                              />


                              <span>
                                {option}
                              </span>

                            </label>

                          );
                        }
                      )}

                    </div>

                  )}


                  {/* =====================================
                      MULTIPLE
                  ====================================== */}

                  {question.qtype === 'MULTIPLE' && (

                    <div className="survey-choice-options">

                      {options.map(
                        (option) => {

                          const answer =
                            answers[
                            question.no
                            ];


                          const selected =
                            Array.isArray(
                              answer
                            )
                              ? answer.includes(
                                option
                              )
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


                              <span>
                                {option}
                              </span>

                            </label>

                          );
                        }
                      )}

                    </div>

                  )}


                  {/* =====================================
                      TEXT
                  ====================================== */}

                  {question.qtype === 'TEXT' && (

                    <textarea
                      className="survey-textarea"
                      placeholder="답변을 입력해주세요."
                      value={
                        typeof answers[
                          question.no
                        ] === 'string'

                          ? answers[
                          question.no
                          ] as string

                          : ''
                      }
                      onChange={(e) =>
                        handleAnswerChange(
                          question.no,
                          e.target.value
                        )
                      }
                    />

                  )}

                </div>

              );
            }
          )}

        </div>


        {/* ===============================================
            서버 오류
        ================================================ */}

        {error && (

          <div className="survey-error">
            {error}
          </div>

        )}


        {/* ===============================================
            하단 버튼
        ================================================ */}

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
              ? '제출 중...'
              : '설문 제출'}

          </button>

        </div>

      </div>

    </section>
  );
}