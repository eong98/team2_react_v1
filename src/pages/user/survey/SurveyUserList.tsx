import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../../../components/ui';

import type { Survey } from '../../../components/ts/survey';

import {
    SURVEY_LIST_PAGE_SIZE,
    formatDate,
    getSurveyStatus,
} from '../../../components/ts/survey';

import {
    getMemberSurveyResponse,
    getSurveys,
} from '../../../components/ts/surveyApi';

import { GlobalStoreSession } from '../../../store/LoginStore';


/* =========================================================
   사용자 설문 목록
========================================================= */

export default function SurveyUserList() {

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
       설문 목록
    ======================================================= */

    const [
        surveys,
        setSurveys,
    ] = useState<Survey[]>([]);


    /* =======================================================
       참여 완료 설문번호
    ======================================================= */

    const [
        participatedSurveyNos,
        setParticipatedSurveyNos,
    ] = useState<Set<number>>(
        new Set()
    );


    /* =======================================================
       페이지
    ======================================================= */

    const [
        page,
        setPage,
    ] = useState(1);


    /* =======================================================
       로딩
    ======================================================= */

    const [
        loading,
        setLoading,
    ] = useState(false);


    /* =======================================================
       설문 목록 + 참여 여부 조회
    ======================================================= */

    useEffect(() => {

        const loadSurveys =
            async () => {

                try {

                    setLoading(true);


                    /*
                     * 전체 설문 조회
                     */
                    const list =
                        await getSurveys();


                    /*
                     * 최신 설문이 위로 오도록 정렬
                     */
                    const sorted =
                        [...list].sort(
                            (a, b) =>
                                b.no - a.no
                        );


                    setSurveys(
                        sorted
                    );


                    /*
                     * 현재 진행 중인 설문만
                     * 참여 여부 확인
                     */
                    const activeList =
                        sorted.filter(
                            (survey) =>
                                getSurveyStatus(
                                    survey
                                ) === 'ACTIVE'
                        );


                    /*
                     * 로그인 회원이
                     * 각각의 설문에 이미 응답했는지 확인
                     */
                    const participated =
                        await Promise.all(

                            activeList.map(
                                async (survey) => {

                                    try {

                                        await getMemberSurveyResponse(
                                            survey.no,
                                            memberNo
                                        );


                                        /*
                                         * 응답이 존재하면
                                         * 설문번호 반환
                                         */
                                        return survey.no;

                                    } catch {

                                        /*
                                         * 응답이 없으면
                                         * 참여하지 않은 설문
                                         */
                                        return null;

                                    }

                                }
                            )

                        );


                    /*
                     * null 제거 후
                     * 참여 완료 설문번호 저장
                     */
                    const completedNos =
                        participated.filter(
                            (
                                surveyNo
                            ): surveyNo is number =>
                                surveyNo !== null
                        );


                    setParticipatedSurveyNos(
                        new Set(
                            completedNos
                        )
                    );

                } catch (
                error: any
                ) {

                    console.error(
                        error
                    );


                    alert(
                        error.response
                            ?.data
                            ?.message
                        ?? '설문 목록을 불러오지 못했습니다.'
                    );

                } finally {

                    setLoading(false);

                }

            };


        loadSurveys();

    }, [
        memberNo,
    ]);


    /* =======================================================
       현재 참여 가능한 설문만 표시
    ======================================================= */

    const activeSurveys =
        useMemo(() => {

            return surveys.filter(
                (survey) =>
                    getSurveyStatus(
                        survey
                    ) === 'ACTIVE'
            );

        }, [
            surveys,
        ]);


    /* =======================================================
       페이지 계산
    ======================================================= */

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                activeSurveys.length
                / SURVEY_LIST_PAGE_SIZE
            )
        );


    const paged =
        activeSurveys.slice(

            (page - 1)
            * SURVEY_LIST_PAGE_SIZE,

            page
            * SURVEY_LIST_PAGE_SIZE

        );


    /* =======================================================
       설문 참여
    ======================================================= */

    const handleSurvey =
        (
            surveyNo: number
        ) => {

            navigate(
                `/user/survey/${surveyNo}`
            );

        };


    /* =======================================================
       화면
    ======================================================= */

    return (

        <section
            className="
        view
        active
      "
        >

            <PageHeader
                title="설문조사"
                description="현재 참여 가능한 설문입니다."
            />


            <div className="card card_pad_lg">


                {/* ===============================================
            로딩
        ================================================ */}

                {loading && (

                    <div>
                        설문 목록을 불러오는 중입니다.
                    </div>

                )}


                {/* ===============================================
            설문 없음
        ================================================ */}

                {!loading
                    &&
                    activeSurveys.length === 0
                    && (

                        <div>
                            현재 참여 가능한 설문이 없습니다.
                        </div>

                    )}


                {/* ===============================================
            설문 목록
        ================================================ */}

                {!loading
                    &&
                    paged.map(
                        (survey) => {

                            /*
                             * 현재 로그인 회원이
                             * 이미 참여한 설문인지 확인
                             */
                            const participated =
                                participatedSurveyNos.has(
                                    survey.no
                                );


                            return (

                                <div
                                    key={survey.no}
                                    style={{
                                        display:
                                            'flex',

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'space-between',

                                        gap:
                                            '20px',

                                        padding:
                                            '18px 0',

                                        borderBottom:
                                            '1px solid #e5e7eb',
                                    }}
                                >

                                    <div>

                                        <h3
                                            style={{
                                                margin:
                                                    '0 0 8px',
                                            }}
                                        >
                                            {survey.title}
                                        </h3>


                                        {survey.detail && (

                                            <div
                                                style={{
                                                    marginBottom:
                                                        '8px',

                                                    color:
                                                        '#666',
                                                }}
                                            >
                                                {survey.detail}
                                            </div>

                                        )}


                                        <div
                                            style={{
                                                fontSize:
                                                    '13px',

                                                color:
                                                    '#777',
                                            }}
                                        >

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


                                    {/* =====================================
                      참여 상태
                  ====================================== */}

                                    {participated ? (

                                        <button
                                            type="button"
                                            className="
                        btn
                        btn_md
                      "
                                            disabled
                                        >
                                            참여완료
                                        </button>

                                    ) : (

                                        <button
                                            type="button"
                                            className="
                        btn
                        btn_md
                        btn_primary
                      "
                                            onClick={() =>
                                                handleSurvey(
                                                    survey.no
                                                )
                                            }
                                        >
                                            참여하기
                                        </button>

                                    )}

                                </div>

                            );

                        }
                    )}


                {/* ===============================================
            페이징
        ================================================ */}

                {!loading
                    &&
                    activeSurveys.length > 0
                    && (

                        <div
                            style={{
                                display:
                                    'flex',

                                justifyContent:
                                    'center',

                                alignItems:
                                    'center',

                                gap:
                                    '12px',

                                marginTop:
                                    '24px',
                            }}
                        >

                            <button
                                type="button"
                                className="
                  btn
                  btn_sm
                "
                                disabled={
                                    page === 1
                                }
                                onClick={() =>
                                    setPage(
                                        (prev) =>
                                            Math.max(
                                                1,
                                                prev - 1
                                            )
                                    )
                                }
                            >
                                이전
                            </button>


                            <span>
                                {page}
                                {' / '}
                                {totalPages}
                            </span>


                            <button
                                type="button"
                                className="
                  btn
                  btn_sm
                "
                                disabled={
                                    page
                                    === totalPages
                                }
                                onClick={() =>
                                    setPage(
                                        (prev) =>
                                            Math.min(
                                                totalPages,
                                                prev + 1
                                            )
                                    )
                                }
                            >
                                다음
                            </button>

                        </div>

                    )}

            </div>

        </section>

    );
}