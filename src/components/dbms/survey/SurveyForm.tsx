import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminPageHeader } from '../common';

import '../../style/SurveyForm.css';


/* =========================================================
   설문 문항 유형
========================================================= */

/**
 * 백엔드 QTYPE 값과 동일하게 사용합니다.
 *
 * TEXT     : 주관식
 * SINGLE   : 단일 선택
 * MULTIPLE : 복수 선택
 * SCORE    : 만족도
 *
 * 화면에서는 SCORE를 "만족도"라고 표시하지만
 * 서버에는 기존대로 SCORE로 전송합니다.
 */
type QuestionType =
  | 'TEXT'
  | 'SINGLE'
  | 'MULTIPLE'
  | 'SCORE';


/* =========================================================
   설문 문항 인터페이스
========================================================= */

interface SurveyQuestion {

  /**
   * 수정 화면에서 기존 문항 정보를 받을 때 사용합니다.
   * 신규 작성 시에는 없어도 됩니다.
   */
  no?: number;

  surveyNo?: number;


  /**
   * 질문 내용
   */
  qtext: string;


  /**
   * 질문 유형
   */
  qtype: QuestionType;


  /**
   * 객관식 선택지
   *
   * 서버:
   * "CCTV 관제|이상행동 알림|AI 도면"
   *
   * 프론트:
   * [
   *   "CCTV 관제",
   *   "이상행동 알림",
   *   "AI 도면"
   * ]
   */
  qoptions: string[];


  /**
   * 필수 응답 여부
   */
  requiredYn: 'Y' | 'N';


  /**
   * 질문 표시 순서
   */
  seqNo: number;
}


/* =========================================================
   설문 API
========================================================= */

/**
 * 현재 설문 Spring Boot 백엔드는
 * localhost:9103에서 테스트 중입니다.
 *
 * 추후 팀 백엔드 포트를 통합하면
 * 공통 axiosInstance로 변경하면 됩니다.
 */
const surveyApi = axios.create({
  baseURL: 'http://localhost:9103',
});


/* =========================================================
   새 질문 기본값
========================================================= */

const createEmptyQuestion = (
  seqNo: number
): SurveyQuestion => {

  return {

    qtext: '',

    /**
     * 새 질문 기본 유형은 주관식
     */
    qtype: 'TEXT',

    qoptions: [],

    /**
     * 기본값은 필수 응답
     */
    requiredYn: 'Y',

    seqNo,
  };
};


/* =========================================================
   날짜 변환 함수
========================================================= */

/**
 * 서버 날짜:
 * 2026-08-07 00:00:00
 *
 * HTML date input:
 * 2026-08-07
 */
const toInputDate = (
  value?: string
) => {

  if (!value) {
    return '';
  }

  return value.slice(0, 10);
};


/**
 * 사용자는 시작 날짜만 선택합니다.
 *
 * 서버에는 현재 기존 백엔드 형식에 맞춰
 * 00:00:00을 자동으로 붙입니다.
 */
const toServerStartDate = (
  value: string
) => {

  if (!value) {
    return '';
  }

  return `${value} 00:00:00`;
};


/**
 * 종료일은 해당 날짜 마지막 시간까지
 * 설문에 참여할 수 있도록 23:59:59를 붙입니다.
 */
const toServerEndDate = (
  value: string
) => {

  if (!value) {
    return '';
  }

  return `${value} 23:59:59`;
};


/* =========================================================
   질문 유형 문자열 변환
========================================================= */

/**
 * select의 value는 기본적으로 string입니다.
 *
 * JSX 내부에서
 *
 * e.target.value as QuestionType
 *
 * 처럼 캐스팅하면 현재 Vite + OXC 환경에서
 * 파싱 오류가 발생했던 적이 있으므로,
 * 이 함수에서 안전하게 QuestionType으로 변환합니다.
 */
const parseQuestionType = (
  value: string
): QuestionType => {

  if (value === 'SINGLE') {
    return 'SINGLE';
  }

  if (value === 'MULTIPLE') {
    return 'MULTIPLE';
  }

  if (value === 'SCORE') {
    return 'SCORE';
  }

  return 'TEXT';
};


/* =========================================================
   SurveyForm Component
========================================================= */

export default function SurveyForm() {

  const navigate = useNavigate();

  const { no } =
    useParams<{ no: string }>();


  /**
   * URL에 no가 있으면 수정,
   * 없으면 신규 작성입니다.
   *
   * /dbms/survey/create
   * → 신규 작성
   *
   * /dbms/survey/3/edit
   * → 3번 설문 수정
   */
  const isEdit =
    Boolean(no);


  /**
   * 로그인 기능 연결 전 임시 관리자 번호
   *
   * 현재 테스트 MEMBER.NO = 1
   */
  const memberNo = 1;


  /* =======================================================
     설문 기본정보 State
  ======================================================= */

  const [
    title,
    setTitle,
  ] = useState('');


  const [
    detail,
    setDetail,
  ] = useState('');


  const [
    startDate,
    setStartDate,
  ] = useState('');


  const [
    endDate,
    setEndDate,
  ] = useState('');


  /* =======================================================
     설문 문항 State
  ======================================================= */

  const [
    questions,
    setQuestions,
  ] = useState<SurveyQuestion[]>([
    createEmptyQuestion(1),
  ]);


  /* =======================================================
     화면 상태
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    saving,
    setSaving,
  ] = useState(false);


  /* =======================================================
     수정 화면 데이터 조회
  ======================================================= */

  useEffect(() => {

    /**
     * 신규 작성 화면이면
     * 기존 데이터를 조회하지 않습니다.
     */
    if (!isEdit || !no) {
      return;
    }


    const loadSurvey =
      async () => {

        try {

          setLoading(true);


          /**
           * 설문 상세 조회
           *
           * GET /api/surveys/{surveyNo}
           */
          const response =
            await surveyApi.get(
              `/api/surveys/${no}`
            );


          const survey =
            response.data;


          /* -------------------------------
             기본정보 세팅
          -------------------------------- */

          setTitle(
            survey.title ?? ''
          );


          setDetail(
            survey.detail ?? ''
          );


          setStartDate(
            toInputDate(
              survey.startDate
            )
          );


          setEndDate(
            toInputDate(
              survey.endDate
            )
          );


          /* -------------------------------
             질문 정보 세팅
          -------------------------------- */

          const loadedQuestions:
            SurveyQuestion[] =
            (
              survey.questions
              ?? []
            ).map(
              (
                question: any,
                index: number
              ) => {

                return {

                  no:
                    question.no,

                  surveyNo:
                    question.surveyNo,

                  qtext:
                    question.qtext
                    ?? '',


                  /**
                   * 서버 문자열을
                   * 안전하게 QuestionType으로 변환
                   */
                  qtype:
                    parseQuestionType(
                      question.qtype
                      ?? 'TEXT'
                    ),


                  /**
                   * DB:
                   * A|B|C
                   *
                   * 화면:
                   * ['A', 'B', 'C']
                   */
                  qoptions:
                    question.qoptions
                      ? question
                          .qoptions
                          .split('|')
                      : [],


                  requiredYn:
                    question.requiredYn
                    === 'N'
                      ? 'N'
                      : 'Y',


                  seqNo:
                    question.seqNo
                    ?? index + 1,
                };

              }
            );


          /**
           * 질문이 존재하면 불러온 질문 사용,
           * 없으면 빈 질문 하나 생성
           */
          if (
            loadedQuestions.length
            > 0
          ) {

            setQuestions(
              loadedQuestions
            );

          } else {

            setQuestions([
              createEmptyQuestion(1),
            ]);

          }

        } catch (
          error: any
        ) {

          console.error(error);


          alert(
            error.response
              ?.data
              ?.message
            ?? '설문 정보를 불러오지 못했습니다.'
          );


          navigate(
            '/dbms/survey'
          );

        } finally {

          setLoading(false);

        }

      };


    loadSurvey();

  }, [
    isEdit,
    no,
    navigate,
  ]);


  /* =======================================================
     질문 추가
  ======================================================= */

  const addQuestion = () => {

    setQuestions(
      (prev) => [

        ...prev,

        createEmptyQuestion(
          prev.length + 1
        ),

      ]
    );

  };


  /* =======================================================
     질문 삭제
  ======================================================= */

  const removeQuestion = (
    index: number
  ) => {

    /**
     * 설문 문항 최소 1개 유지
     */
    if (
      questions.length === 1
    ) {

      alert(
        '설문 문항은 한 개 이상 필요합니다.'
      );

      return;
    }


    setQuestions(
      (prev) =>
        prev
          .filter(
            (
              _,
              questionIndex
            ) =>
              questionIndex
              !== index
          )
          .map(
            (
              question,
              questionIndex
            ) => {

              return {

                ...question,

                /**
                 * 삭제 후 순서를 다시 정렬
                 */
                seqNo:
                  questionIndex
                  + 1,
              };

            }
          )
    );

  };


  /* =======================================================
     질문 내용 변경
  ======================================================= */

  const changeQuestionText = (
    index: number,
    value: string
  ) => {

    setQuestions(
      (prev) =>
        prev.map(
          (
            question,
            questionIndex
          ) => {

            if (
              questionIndex
              !== index
            ) {
              return question;
            }


            return {

              ...question,

              qtext:
                value,
            };

          }
        )
    );

  };


  /* =======================================================
     질문 유형 변경
  ======================================================= */

  const changeQuestionType = (
    index: number,
    value: string
  ) => {

    /**
     * select의 문자열 값을
     * QuestionType으로 변환
     */
    const qtype =
      parseQuestionType(value);


    setQuestions(
      (prev) =>
        prev.map(
          (
            question,
            questionIndex
          ) => {

            if (
              questionIndex
              !== index
            ) {
              return question;
            }


            /**
             * 객관식 유형 여부
             */
            const isChoice =
              qtype === 'SINGLE'
              ||
              qtype === 'MULTIPLE';


            return {

              ...question,

              qtype,


              /**
               * SINGLE / MULTIPLE
               * → 선택지 필요
               *
               * TEXT / SCORE
               * → 선택지 필요 없음
               */
              qoptions:
                isChoice
                  ? (
                      question
                        .qoptions
                        .length > 0

                        ? question
                            .qoptions

                        : ['']
                    )

                  : [],
            };

          }
        )
    );

  };


  /* =======================================================
     필수 응답 변경
  ======================================================= */

  const changeRequired = (
    index: number,
    checked: boolean
  ) => {

    setQuestions(
      (prev) =>
        prev.map(
          (
            question,
            questionIndex
          ) => {

            if (
              questionIndex
              !== index
            ) {
              return question;
            }


            return {

              ...question,

              requiredYn:
                checked
                  ? 'Y'
                  : 'N',
            };

          }
        )
    );

  };


  /* =======================================================
     객관식 선택지 추가
  ======================================================= */

  const addOption = (
    questionIndex: number
  ) => {

    setQuestions(
      (prev) =>
        prev.map(
          (
            question,
            index
          ) => {

            if (
              index
              !== questionIndex
            ) {
              return question;
            }


            return {

              ...question,

              qoptions: [

                ...question
                  .qoptions,

                '',
              ],
            };

          }
        )
    );

  };


  /* =======================================================
     객관식 선택지 내용 변경
  ======================================================= */

  const changeOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {

    setQuestions(
      (prev) =>
        prev.map(
          (
            question,
            index
          ) => {

            if (
              index
              !== questionIndex
            ) {
              return question;
            }


            return {

              ...question,

              qoptions:
                question
                  .qoptions
                  .map(
                    (
                      option,
                      currentOptionIndex
                    ) => {

                      if (
                        currentOptionIndex
                        === optionIndex
                      ) {

                        return value;

                      }

                      return option;

                    }
                  ),
            };

          }
        )
    );

  };


  /* =======================================================
     객관식 선택지 삭제
  ======================================================= */

  const removeOption = (
    questionIndex: number,
    optionIndex: number
  ) => {

    setQuestions(
      (prev) =>
        prev.map(
          (
            question,
            index
          ) => {

            if (
              index
              !== questionIndex
            ) {
              return question;
            }


            return {

              ...question,

              qoptions:
                question
                  .qoptions
                  .filter(
                    (
                      _,
                      currentOptionIndex
                    ) =>
                      currentOptionIndex
                      !== optionIndex
                  ),
            };

          }
        )
    );

  };


  /* =======================================================
     입력값 검증
  ======================================================= */

  const validateForm = () => {

    /* 제목 */
    if (
      !title.trim()
    ) {

      alert(
        '설문 제목을 입력해주세요.'
      );

      return false;
    }


    /* 시작일 */
    if (
      !startDate
    ) {

      alert(
        '설문 시작일을 선택해주세요.'
      );

      return false;
    }


    /* 종료일 */
    if (
      !endDate
    ) {

      alert(
        '설문 종료일을 선택해주세요.'
      );

      return false;
    }


    /* 날짜 순서 */
    if (
      endDate
      < startDate
    ) {

      alert(
        '설문 종료일은 시작일보다 빠를 수 없습니다.'
      );

      return false;
    }


    /* 질문 검증 */
    for (
      let index = 0;
      index
        < questions.length;
      index++
    ) {

      const question =
        questions[index];


      /* 질문 내용 */
      if (
        !question
          .qtext
          .trim()
      ) {

        alert(
          `${index + 1}번 질문 내용을 입력해주세요.`
        );

        return false;
      }


      /**
       * 객관식은 선택지 필수
       */
      if (
        question.qtype
        === 'SINGLE'
        ||
        question.qtype
        === 'MULTIPLE'
      ) {

        const options =
          question
            .qoptions
            .map(
              (option) =>
                option.trim()
            )
            .filter(Boolean);


        if (
          options.length
          === 0
        ) {

          alert(
            `${index + 1}번 객관식 문항에는 선택지가 필요합니다.`
          );

          return false;
        }

      }

    }


    return true;

  };


  /* =======================================================
     설문 저장
  ======================================================= */

  const handleSubmit =
    async () => {

      /**
       * 프론트 검증
       */
      if (
        !validateForm()
      ) {
        return;
      }


      /**
       * 백엔드 전송 데이터
       */
      const serverData = {

        memberNo,

        title:
          title.trim(),

        detail:
          detail.trim(),

        startDate:
          toServerStartDate(
            startDate
          ),

        endDate:
          toServerEndDate(
            endDate
          ),


        questions:
          questions.map(
            (
              question,
              index
            ) => {

              let qoptions:
                string | null =
                null;


              /**
               * 객관식 선택지는
               * | 문자로 합쳐 서버 전송
               */
              if (
                question.qtype
                === 'SINGLE'
                ||
                question.qtype
                === 'MULTIPLE'
              ) {

                qoptions =
                  question
                    .qoptions
                    .map(
                      (option) =>
                        option
                          .trim()
                    )
                    .filter(Boolean)
                    .join('|');

              }


              return {

                qtext:
                  question
                    .qtext
                    .trim(),

                qtype:
                  question.qtype,

                qoptions,

                requiredYn:
                  question
                    .requiredYn,

                seqNo:
                  index + 1,
              };

            }
          ),
      };


      try {

        setSaving(true);


        /**
         * 수정
         */
        if (
          isEdit
          && no
        ) {

          await surveyApi.put(
            `/api/surveys/${no}`,
            serverData
          );


          alert(
            '설문이 수정되었습니다.'
          );

        }

        /**
         * 신규 등록
         */
        else {

          await surveyApi.post(
            '/api/surveys',
            serverData
          );


          alert(
            '설문이 등록되었습니다.'
          );

        }


        /**
         * 저장 성공 후 목록 이동
         */
        navigate(
          '/dbms/survey'
        );

      } catch (
        error: any
      ) {

        console.error(error);


        const message =
          error.response
            ?.data
            ?.message
          ?? '설문 저장 중 오류가 발생했습니다.';


        alert(message);

      } finally {

        setSaving(false);

      }

    };


  /* =======================================================
     목록 이동
  ======================================================= */

  const goList = () => {

    navigate(
      '/dbms/survey'
    );

  };


  /* =======================================================
     수정 데이터 로딩
  ======================================================= */

  if (
    loading
  ) {

    return (

      <section className="view active">

        <AdminPageHeader
          title="설문 관리"
          description="설문 정보를 불러오는 중입니다."
        />


        <div className="card card_pad_lg">

          데이터를 불러오는 중입니다.

        </div>

      </section>

    );

  }


  /* =======================================================
     화면
  ======================================================= */

  return (

    <section className="view active">


      {/* ===================================================
          페이지 상단
      =================================================== */}

      <AdminPageHeader

        title={
          isEdit
            ? '설문 수정'
            : '설문 작성'
        }

        description={
          isEdit
            ? '등록된 설문 기본정보와 문항을 수정합니다.'
            : '점주에게 제공할 설문과 문항을 작성합니다.'
        }

        actions={

          <button
            type="button"
            className="btn btn_md btn_ghost"
            onClick={goList}
          >

            ← 목록으로

          </button>

        }

      />


      {/* ===================================================
          설문 기본정보
      =================================================== */}

      <div
        className="
          card
          card_pad_lg
          form_page
        "
      >


        <div className="survey_form_section_title">

          설문 기본정보

        </div>


        {/* 작성자 */}

        <div className="field_row">

          <div className="field_label">

            작성자

          </div>


          <div className="field_control">

            <input
              type="text"
              className="
                form_input
                survey_writer_input
              "
              value={
                `관리자 ${memberNo}`
              }
              disabled
            />


            <div className="field_hint">

              로그인 기능 연결 전까지
              관리자 회원번호 1번을 사용합니다.

            </div>

          </div>

        </div>


        {/* 제목 */}

        <div className="field_row">

          <div className="field_label">

            제목

            <span className="req">
              *
            </span>

          </div>


          <div className="field_control">

            <input
              type="text"
              className="form_input"
              placeholder="설문 제목을 입력하세요."
              value={title}
              onChange={
                (e) =>
                  setTitle(
                    e.target.value
                  )
              }
            />

          </div>

        </div>


        {/* 설명 */}

        <div className="field_row">

          <div className="field_label">

            설명

          </div>


          <div className="field_control">

            <textarea
              className="
                form_textarea
                survey_detail
              "
              placeholder="설문 안내 내용을 입력하세요."
              value={detail}
              onChange={
                (e) =>
                  setDetail(
                    e.target.value
                  )
              }
            />

          </div>

        </div>


        {/* ===================================================
            설문 기간
        =================================================== */}

        <div className="field_row">

          <div className="field_label">

            설문 기간

            <span className="req">
              *
            </span>

          </div>


          <div className="field_control">


            <div className="survey_date_grid">


              {/* 시작일 */}

              <div className="survey_date_item">

                <div className="field_hint survey_input_label">

                  시작일

                </div>


                <input
                  type="date"
                  className="
                    form_input
                    survey_date_input
                  "
                  value={startDate}
                  onChange={
                    (e) =>
                      setStartDate(
                        e.target.value
                      )
                  }
                  onClick={
                    (e) => {

                      /**
                       * Chrome / Edge
                       *
                       * 날짜 input 전체를 눌러도
                       * 브라우저 기본 달력을 엽니다.
                       */
                      if (
                        e.currentTarget
                          .showPicker
                      ) {

                        e.currentTarget
                          .showPicker();

                      }

                    }
                  }
                />

              </div>


              {/* 종료일 */}

              <div className="survey_date_item">

                <div className="field_hint survey_input_label">

                  종료일

                </div>


                <input
                  type="date"
                  className="
                    form_input
                    survey_date_input
                  "
                  min={startDate}
                  value={endDate}
                  onChange={
                    (e) =>
                      setEndDate(
                        e.target.value
                      )
                  }
                  onClick={
                    (e) => {

                      if (
                        e.currentTarget
                          .showPicker
                      ) {

                        e.currentTarget
                          .showPicker();

                      }

                    }
                  }
                />

              </div>


            </div>


            <div className="field_hint survey_date_hint">

              시작일과 종료일을 달력에서 선택해주세요.

            </div>

          </div>

        </div>


      </div>


      {/* ===================================================
          설문 문항
      =================================================== */}

      <div
        className="
          card
          card_pad_lg
          form_page
          survey_question_section
        "
      >


        <div className="survey_question_header">


          <div>

            <div className="survey_form_section_title">

              설문 문항

            </div>


            <div className="field_hint">

              답변 유형과 필수 여부를 설정할 수 있습니다.

            </div>

          </div>


          <button
            type="button"
            className="
              btn
              btn_md
              btn_primary
            "
            onClick={
              addQuestion
            }
          >

            + 질문 추가

          </button>


        </div>


        {/* ===================================================
            질문 목록
        =================================================== */}

        <div className="survey_question_list">


          {
            questions.map(
              (
                question,
                questionIndex
              ) => (

                <div
                  className="survey_question_card"
                  key={questionIndex}
                >


                  {/* 질문 상단 */}

                  <div className="survey_question_card_head">


                    <div className="survey_question_number">

                      질문 {
                        questionIndex
                        + 1
                      }

                    </div>


                    <button
                      type="button"
                      className="
                        btn
                        btn_sm
                        btn_ghost
                      "
                      onClick={
                        () =>
                          removeQuestion(
                            questionIndex
                          )
                      }
                    >

                      삭제

                    </button>

                  </div>


                  {/* 질문 내용 */}

                  <div className="field_row">

                    <div className="field_label">

                      질문

                      <span className="req">
                        *
                      </span>

                    </div>


                    <div className="field_control">

                      <input
                        type="text"
                        className="form_input"
                        placeholder="질문 내용을 입력하세요."
                        value={
                          question.qtext
                        }
                        onChange={
                          (e) =>
                            changeQuestionText(
                              questionIndex,
                              e.target.value
                            )
                        }
                      />

                    </div>

                  </div>


                  {/* ===================================================
                      답변 유형
                  =================================================== */}

                  <div className="field_row">

                    <div className="field_label">

                      답변 유형

                    </div>


                    <div className="field_control">

                      <select
                        className="
                          form_select
                          survey_type_select
                        "
                        value={
                          question.qtype
                        }
                        onChange={
                          (e) =>
                            changeQuestionType(
                              questionIndex,
                              e.target.value
                            )
                        }
                      >

                        <option value="TEXT">
                          주관식
                        </option>

                        <option value="SCORE">
                          만족도
                        </option>

                        <option value="SINGLE">
                          단일 선택
                        </option>

                        <option value="MULTIPLE">
                          복수 선택
                        </option>

                      </select>

                    </div>

                  </div>


                  {/* ===================================================
                      필수 여부
                  =================================================== */}

                  <div className="field_row">

                    <div className="field_label">

                      필수 여부

                    </div>


                    <div className="field_control">

                      <label className="survey_required_check">

                        <input
                          type="checkbox"
                          checked={
                            question
                              .requiredYn
                            === 'Y'
                          }
                          onChange={
                            (e) =>
                              changeRequired(
                                questionIndex,
                                e.target.checked
                              )
                          }
                        />


                        <span>

                          필수 응답 문항

                        </span>

                      </label>

                    </div>

                  </div>


                  {/* ===================================================
                      단일 / 복수 선택
                  =================================================== */}

                  {
                    (
                      question.qtype
                      === 'SINGLE'
                      ||
                      question.qtype
                      === 'MULTIPLE'
                    )
                    && (

                      <div className="field_row">


                        <div className="field_label">

                          선택지

                          <span className="req">
                            *
                          </span>

                        </div>


                        <div className="field_control">


                          <div className="survey_option_list">


                            {
                              question
                                .qoptions
                                .map(
                                  (
                                    option,
                                    optionIndex
                                  ) => (

                                    <div
                                      className="survey_option_row"
                                      key={
                                        optionIndex
                                      }
                                    >


                                      <span className="survey_option_number">

                                        {
                                          optionIndex
                                          + 1
                                        }

                                      </span>


                                      <input
                                        type="text"
                                        className="form_input"
                                        placeholder={
                                          `선택지 ${
                                            optionIndex
                                            + 1
                                          }`
                                        }
                                        value={
                                          option
                                        }
                                        onChange={
                                          (e) =>
                                            changeOption(
                                              questionIndex,
                                              optionIndex,
                                              e.target.value
                                            )
                                        }
                                      />


                                      <button
                                        type="button"
                                        className="
                                          btn
                                          btn_sm
                                          btn_ghost
                                        "
                                        onClick={
                                          () =>
                                            removeOption(
                                              questionIndex,
                                              optionIndex
                                            )
                                        }
                                      >

                                        삭제

                                      </button>


                                    </div>

                                  )
                                )
                            }


                          </div>


                          <button
                            type="button"
                            className="
                              btn
                              btn_sm
                              btn_ghost
                              survey_option_add
                            "
                            onClick={
                              () =>
                                addOption(
                                  questionIndex
                                )
                            }
                          >

                            + 선택지 추가

                          </button>


                        </div>

                      </div>

                    )
                  }


                  {/* ===================================================
                      만족도
                  =================================================== */}

                  {
                    question.qtype
                    === 'SCORE'
                    && (

                      <div className="survey_satisfaction_preview">


                        <div className="field_hint survey_satisfaction_title">

                          점주 화면 만족도 선택 예시

                        </div>


                        <div className="survey_satisfaction_list">


                          <div className="survey_satisfaction_item">

                            <span className="survey_satisfaction_circle" />

                            <span>

                              매우 불만족

                            </span>

                          </div>


                          <div className="survey_satisfaction_item">

                            <span className="survey_satisfaction_circle" />

                            <span>

                              불만족

                            </span>

                          </div>


                          <div className="survey_satisfaction_item">

                            <span className="survey_satisfaction_circle" />

                            <span>

                              보통

                            </span>

                          </div>


                          <div className="survey_satisfaction_item">

                            <span className="survey_satisfaction_circle" />

                            <span>

                              만족

                            </span>

                          </div>


                          <div className="survey_satisfaction_item">

                            <span className="survey_satisfaction_circle" />

                            <span>

                              매우 만족

                            </span>

                          </div>


                        </div>


                        <div className="field_hint survey_satisfaction_hint">

                          내부 저장값은 1 ~ 5로 처리됩니다.

                        </div>


                      </div>

                    )
                  }


                </div>

              )
            )
          }


        </div>


        {/* ===================================================
            하단 버튼
        =================================================== */}

        <div className="form_page_footer">


          <button
            type="button"
            className="
              btn
              btn_md
              btn_ghost
            "
            onClick={goList}
            disabled={saving}
          >

            취소

          </button>


          <button
            type="button"
            className="
              btn
              btn_md
              btn_primary
            "
            onClick={
              handleSubmit
            }
            disabled={saving}
          >

            {
              saving

                ? '저장 중...'

                : isEdit

                  ? '설문 수정'

                  : '설문 등록'
            }

          </button>


        </div>


      </div>


    </section>

  );

}