import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  AdminPageHeader,
  DataTable,
} from '../common';

import type {
  DataTableColumn,
} from '../common';


/* =========================================================
   응답 답변 타입
========================================================= */

/**
 * 응답 상세에서 내려오는 실제 문항별 답변 구조
 *
 * no
 *   → SURVEYANSWER.NO
 *
 * questionNo
 *   → 어떤 질문에 대한 답변인지
 *
 * responseNo
 *   → 어떤 설문 응답에 속한 답변인지
 *
 * atext
 *   → 실제 점주가 작성/선택한 답변
 *
 * evalScore
 *   → AI 평가점수
 */
interface SurveyAnswer {

  no: number;

  responseNo: number;

  questionNo: number;

  qtext: string;

  qtype: string;

  atext: string | null;

  evalScore: number | null;

  cdate: string;
}


/* =========================================================
   설문 응답 타입
========================================================= */

/**
 * 설문 응답 한 건
 *
 * 목록 조회에서는 answers가 빈 배열로 내려오고,
 * 상세 조회에서는 실제 답변이 포함됩니다.
 */
interface SurveyResponse {

  no: number;

  surveyNo: number;

  memberNo: number;

  checkYn: 'Y' | 'N';

  checkDate: string | null;

  cdate: string;

  answers: SurveyAnswer[];
}


/* =========================================================
   설문 기본정보 타입
========================================================= */

/**
 * 상단에 설문 제목을 보여주기 위해
 * 최소 정보만 사용합니다.
 */
interface SurveyInfo {

  no: number;

  title: string;

  detail: string;

  startDate: string;

  endDate: string;
}


/* =========================================================
   API
========================================================= */

/**
 * 현재 설문 백엔드는 9103 포트에서 테스트 중입니다.
 *
 * 추후 팀 백엔드 통합 시
 * 공통 axiosInstance로 변경하면 됩니다.
 */
const surveyApi = axios.create({
  baseURL: 'http://localhost:9103',
});


/* =========================================================
   날짜 표시 함수
========================================================= */

/**
 * 서버:
 * 2026-08-07 10:18:49
 *
 * 화면:
 * 2026-08-07 10:18
 */
const formatDateTime = (
  value?: string | null
) => {

  if (!value) {
    return '-';
  }

  return value.slice(0, 16);
};


/**
 * 설문 기간에서는 날짜만 표시
 */
const formatDate = (
  value?: string | null
) => {

  if (!value) {
    return '-';
  }

  return value.slice(0, 10);
};


/* =========================================================
   답변 유형 한글 표시
========================================================= */

/**
 * 백엔드 QTYPE 값을
 * 관리자 화면용 한글로 변환합니다.
 */
const getQuestionTypeLabel = (
  qtype: string
) => {

  if (
    qtype === 'SCORE'
  ) {
    return '만족도';
  }

  if (
    qtype === 'SINGLE'
  ) {
    return '단일 선택';
  }

  if (
    qtype === 'MULTIPLE'
  ) {
    return '복수 선택';
  }

  return '주관식';
};


/* =========================================================
   만족도 표시
========================================================= */

/**
 * SCORE 문항은 DB에는
 * 1 ~ 5 값으로 저장됩니다.
 *
 * 관리자 화면에서는
 * 만족도 문구로 보여줍니다.
 */
const getSatisfactionLabel = (
  value?: string | null
) => {

  if (
    value === '1'
  ) {
    return '매우 불만족';
  }

  if (
    value === '2'
  ) {
    return '불만족';
  }

  if (
    value === '3'
  ) {
    return '보통';
  }

  if (
    value === '4'
  ) {
    return '만족';
  }

  if (
    value === '5'
  ) {
    return '매우 만족';
  }

  return value ?? '-';
};


/* =========================================================
   실제 답변 표시
========================================================= */

/**
 * SCORE이면 만족도 문구로 보여주고,
 * 나머지는 저장된 ATEXT를 그대로 보여줍니다.
 */
const getAnswerText = (
  answer: SurveyAnswer
) => {

  if (
    answer.qtype === 'SCORE'
  ) {

    return getSatisfactionLabel(
      answer.atext
    );

  }

  return (
    answer.atext
    ?? '-'
  );
};


/* =========================================================
   SurveyResponseList Component
========================================================= */

export default function SurveyResponseList() {

  const navigate =
    useNavigate();


  /**
   * /dbms/survey/:no/responses
   *
   * 예:
   * /dbms/survey/3/responses
   *
   * no = 설문번호
   */
  const { no } =
    useParams<{ no: string }>();


  /* =======================================================
     설문 정보
  ======================================================= */

  const [
    survey,
    setSurvey,
  ] = useState<SurveyInfo | null>(
    null
  );


  /* =======================================================
     응답 목록
  ======================================================= */

  const [
    responses,
    setResponses,
  ] = useState<SurveyResponse[]>([]);


  /* =======================================================
     선택한 응답 상세
  ======================================================= */

  const [
    selectedResponse,
    setSelectedResponse,
  ] = useState<SurveyResponse | null>(
    null
  );


  /* =======================================================
     로딩 상태
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);


  const [
    checking,
    setChecking,
  ] = useState(false);


  /* =======================================================
     설문 정보 + 응답 목록 조회
  ======================================================= */

  const loadData =
    async () => {

      if (!no) {
        return;
      }


      try {

        setLoading(true);


        /**
         * 설문 기본정보와 응답 목록을
         * 동시에 조회합니다.
         */
        const [
          surveyResponse,
          responseListResponse,
        ] =
          await Promise.all([

            /**
             * GET /api/surveys/{surveyNo}
             */
            surveyApi.get(
              `/api/surveys/${no}`
            ),


            /**
             * GET /api/surveys/{surveyNo}/responses
             */
            surveyApi.get(
              `/api/surveys/${no}/responses`
            ),

          ]);


        setSurvey(
          surveyResponse.data
        );


        const list:
          SurveyResponse[] =
          Array.isArray(
            responseListResponse.data
          )
            ? responseListResponse.data
            : [];


        /**
         * 최신 응답이 위로 오도록
         * 응답번호 기준 내림차순 정렬
         */
        const sorted =
          [...list].sort(
            (a, b) =>
              b.no - a.no
          );


        setResponses(
          sorted
        );

      } catch (
        error: any
      ) {

        console.error(error);


        alert(
          error.response
            ?.data
            ?.message
          ?? '설문 응답 목록을 불러오지 못했습니다.'
        );

      } finally {

        setLoading(false);

      }

    };


  /**
   * 페이지 최초 진입 시 조회
   */
  useEffect(() => {

    loadData();

  }, [no]);


  /* =======================================================
     응답 상세 조회
  ======================================================= */

  const loadResponseDetail =
    async (
      responseNo: number
    ) => {

      try {

        setDetailLoading(true);


        /**
         * GET /api/surveys/responses/{responseNo}
         */
        const response =
          await surveyApi.get(
            `/api/surveys/responses/${responseNo}`
          );


        setSelectedResponse(
          response.data
        );

      } catch (
        error: any
      ) {

        console.error(error);


        alert(
          error.response
            ?.data
            ?.message
          ?? '응답 상세정보를 불러오지 못했습니다.'
        );

      } finally {

        setDetailLoading(false);

      }

    };


  /* =======================================================
     관리자 확인 처리
  ======================================================= */

  const handleCheck =
    async () => {

      if (
        !selectedResponse
      ) {
        return;
      }


      /**
       * 이미 확인된 응답이면
       * 다시 요청하지 않습니다.
       */
      if (
        selectedResponse.checkYn
        === 'Y'
      ) {

        alert(
          '이미 확인 처리된 응답입니다.'
        );

        return;
      }


      try {

        setChecking(true);


        /**
         * PATCH
         * /api/surveys/responses/{responseNo}/check
         */
        const response =
          await surveyApi.patch(
            `/api/surveys/responses/${selectedResponse.no}/check`
          );


        const updated:
          SurveyResponse =
          response.data;


        /**
         * 상세 데이터 갱신
         */
        setSelectedResponse(
          updated
        );


        /**
         * 응답 목록의 확인 상태도
         * 바로 반영합니다.
         */
        setResponses(
          (prev) =>
            prev.map(
              (item) => {

                if (
                  item.no
                  !== updated.no
                ) {
                  return item;
                }


                return {

                  ...item,

                  checkYn:
                    updated.checkYn,

                  checkDate:
                    updated.checkDate,

                };

              }
            )
        );


        alert(
          '응답을 확인 처리했습니다.'
        );

      } catch (
        error: any
      ) {

        console.error(error);


        alert(
          error.response
            ?.data
            ?.message
          ?? '응답 확인 처리 중 오류가 발생했습니다.'
        );

      } finally {

        setChecking(false);

      }

    };


  /* =======================================================
     가상 번호 계산
  ======================================================= */

  /**
   * 회의에서 정한 방식대로
   * DB PK가 아닌 화면용 가상번호를 표시합니다.
   *
   * 응답이 10건이면
   * 10, 9, 8 ... 형태
   */
  const virtualNoMap =
    useMemo(() => {

      const map =
        new Map<
          number,
          number
        >();


      responses.forEach(
        (
          response,
          index
        ) => {

          map.set(
            response.no,
            responses.length
            - index
          );

        }
      );


      return map;

    }, [
      responses,
    ]);


  /* =======================================================
     응답 목록 테이블 컬럼
  ======================================================= */

  const columns:
    DataTableColumn<SurveyResponse>[] = [


      /* -------------------------------
         번호
      -------------------------------- */

      {
        header: '번호',

        render:
          (response) => (

            <span className="mono">

              {
                virtualNoMap.get(
                  response.no
                )
              }

            </span>

          ),
      },


      /* -------------------------------
         회원번호
      -------------------------------- */

      {
        header: '회원번호',

        render:
          (response) => (

            <span className="mono">

              {
                response.memberNo
              }

            </span>

          ),
      },


      /* -------------------------------
         제출일
      -------------------------------- */

      {
        header: '제출일',

        render:
          (response) => (

            <span className="mono">

              {
                formatDateTime(
                  response.cdate
                )
              }

            </span>

          ),
      },


      /* -------------------------------
         확인 상태
      -------------------------------- */

      {
        header: '확인 상태',

        render:
          (response) => {

            const checked =
              response.checkYn
              === 'Y';


            return (

              <span
                className={
                  checked
                    ? 'badge badge_success'
                    : 'badge'
                }
              >

                {
                  checked
                    ? '확인'
                    : '미확인'
                }

              </span>

            );

          },
      },


      /* -------------------------------
         확인일
      -------------------------------- */

      {
        header: '확인일',

        render:
          (response) => (

            <span className="mono">

              {
                formatDateTime(
                  response.checkDate
                )
              }

            </span>

          ),
      },


      /* -------------------------------
         상세보기
      -------------------------------- */

      {
        header: '응답',

        render:
          (response) => (

            <button
              type="button"
              className="
                btn
                btn_sm
                btn_ghost
              "
              onClick={
                () =>
                  loadResponseDetail(
                    response.no
                  )
              }
            >

              상세보기

            </button>

          ),
      },

    ];


  /* =======================================================
     화면
  ======================================================= */

  return (

    <section className="view active">


      {/* ===================================================
          페이지 헤더
      =================================================== */}

      <AdminPageHeader

        title={
          survey
            ? `${survey.title} 응답 관리`
            : '설문 응답 관리'
        }

        description={
          survey
            ? `${formatDate(
                survey.startDate
              )} ~ ${formatDate(
                survey.endDate
              )} · 총 ${responses.length}건의 응답`
            : '점주가 제출한 설문 응답을 확인합니다.'
        }

        actions={

          <button
            type="button"
            className="
              btn
              btn_md
              btn_ghost
            "
            onClick={
              () =>
                navigate(
                  '/dbms/survey'
                )
            }
          >

            ← 설문 목록

          </button>

        }

      />


      {/* ===================================================
          응답 목록
      =================================================== */}

      <div
        className="
          card
          card_pad_lg
        "
      >


        <div
          style={{
            marginBottom: 14,
            fontWeight: 700,
          }}
        >

          응답 목록

        </div>


        <DataTable

          columns={
            columns
          }

          data={
            responses
          }

          rowKey={
            (response) =>
              response.no
          }

          loading={
            loading
          }

          emptyMessage="
            제출된 설문 응답이 없습니다.
          "

        />


      </div>


      {/* ===================================================
          선택한 응답 상세
      =================================================== */}

      <div
        className="
          card
          card_pad_lg
        "
        style={{
          marginTop: 18,
        }}
      >


        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 12,
            marginBottom: 18,
          }}
        >


          <div>

            <div
              style={{
                fontWeight: 700,
                marginBottom: 4,
              }}
            >

              응답 상세

            </div>


            {
              selectedResponse
              && (

                <div className="field_hint">

                  회원번호 {
                    selectedResponse.memberNo
                  }

                  {' · '}

                  제출 {
                    formatDateTime(
                      selectedResponse.cdate
                    )
                  }

                </div>

              )
            }

          </div>


          {
            selectedResponse
            && (

              <button
                type="button"
                className="
                  btn
                  btn_md
                  btn_primary
                "
                onClick={
                  handleCheck
                }
                disabled={
                  checking
                  ||
                  selectedResponse.checkYn
                  === 'Y'
                }
              >

                {
                  selectedResponse.checkYn
                  === 'Y'

                    ? '확인 완료'

                    : checking

                      ? '처리 중...'

                      : '확인 처리'
                }

              </button>

            )
          }


        </div>


        {/* -------------------------------
            상세 로딩
        -------------------------------- */}

        {
          detailLoading
          && (

            <div className="field_hint">

              응답 상세정보를 불러오는 중입니다.

            </div>

          )
        }


        {/* -------------------------------
            아직 응답을 선택하지 않은 경우
        -------------------------------- */}

        {
          !detailLoading
          &&
          !selectedResponse
          && (

            <div
              style={{
                padding: '34px 0',
                textAlign: 'center',
              }}
              className="field_hint"
            >

              위 응답 목록에서
              상세보기를 선택해주세요.

            </div>

          )
        }


        {/* -------------------------------
            실제 응답 상세
        -------------------------------- */}

        {
          !detailLoading
          &&
          selectedResponse
          && (

            <div>


              {/* 확인 정보 */}

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginBottom: 18,
                }}
              >


                <span
                  className={
                    selectedResponse.checkYn
                    === 'Y'

                      ? 'badge badge_success'

                      : 'badge'
                  }
                >

                  {
                    selectedResponse.checkYn
                    === 'Y'

                      ? '확인'

                      : '미확인'
                  }

                </span>


                {
                  selectedResponse.checkDate
                  && (

                    <span className="field_hint">

                      확인일:
                      {' '}
                      {
                        formatDateTime(
                          selectedResponse.checkDate
                        )
                      }

                    </span>

                  )
                }


              </div>


              {/* 문항별 실제 답변 */}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >


                {
                  selectedResponse.answers
                    .map(
                      (
                        answer,
                        index
                      ) => (

                        <div
                          key={
                            answer.no
                          }
                          style={{
                            padding: 16,
                            border:
                              '1px solid var(--border)',
                            borderRadius: 8,
                            background:
                              'var(--bg-elevated)',
                          }}
                        >


                          {/* 질문 */}

                          <div
                            style={{
                              display: 'flex',
                              alignItems:
                                'center',
                              gap: 8,
                              marginBottom: 10,
                            }}
                          >


                            <span
                              style={{
                                fontWeight: 700,
                              }}
                            >

                              Q{
                                index + 1
                              }.

                            </span>


                            <span
                              style={{
                                fontWeight: 600,
                              }}
                            >

                              {
                                answer.qtext
                              }

                            </span>


                            <span className="badge">

                              {
                                getQuestionTypeLabel(
                                  answer.qtype
                                )
                              }

                            </span>


                          </div>


                          {/* 실제 답변 */}

                          <div
                            style={{
                              paddingLeft: 24,
                              marginBottom:
                                answer.evalScore
                                !== null
                                  ? 12
                                  : 0,
                            }}
                          >

                            <span
                              style={{
                                color:
                                  'var(--text-dim)',
                                marginRight: 8,
                              }}
                            >

                              답변

                            </span>


                            <strong>

                              {
                                getAnswerText(
                                  answer
                                )
                              }

                            </strong>

                          </div>


                          {/* AI 평가점수 */}

                          {
                            answer.evalScore
                            !== null
                            && (

                              <div
                                style={{
                                  paddingLeft: 24,
                                }}
                              >

                                <span
                                  style={{
                                    color:
                                      'var(--text-dim)',
                                    marginRight: 8,
                                  }}
                                >

                                  AI 평가점수

                                </span>


                                <span
                                  className="badge badge_success"
                                >

                                  {
                                    answer.evalScore
                                  }

                                </span>

                              </div>

                            )
                          }


                        </div>

                      )
                    )
                }


              </div>


            </div>

          )
        }


      </div>


    </section>

  );

}