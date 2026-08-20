import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AlertModal, PageHeader } from '../../../components/ui';
import type { Survey, SurveyResponse } from '../../../components/ts/survey';
import {
    formatDate,
    formatDateTime,
    getAnswerText,
    getQuestionTypeLabel,
} from '../../../components/ts/survey';
import {
    getMemberSurveyResponse,
    getSurvey,
} from '../../../components/ts/surveyApi';
import { GlobalStoreSession } from '../../../store/LoginStore';

/* =========================================================
   사용자 내 설문 응답 상세
   - 설문 종료 후 본인이 제출한 응답을 조회한다.
   - 조회 전용 페이지이므로 답변 수정 기능은 제공하지 않는다.
========================================================= */
export default function SurveyMyResponse() {
    const navigate = useNavigate();
    const { no } = useParams<{ no: string }>();
    const memberNo = GlobalStoreSession((state) => state.no);

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [response, setResponse] = useState<SurveyResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{
        message: string;
        variant?: 'success' | 'error';
        onConfirm?: () => void;
    } | null>(null);

    /* 설문 정보와 로그인 회원이 제출한 응답을 함께 조회한다. */
    useEffect(() => {
        const loadData = async () => {
            if (!no) {
                setAlert({
                    message: '설문번호가 없습니다.',
                    variant: 'error',
                    onConfirm: () => navigate('/user/survey'),
                });
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const [surveyData, responseData] = await Promise.all([
                    getSurvey(no),
                    getMemberSurveyResponse(no, memberNo),
                ]);

                setSurvey(surveyData);
                setResponse(responseData);
            } catch (error: any) {
                console.error(error);

                setAlert({
                    message:
                        error.response?.data?.message ??
                        '설문 응답 정보를 불러오지 못했습니다.',
                    variant: 'error',
                    onConfirm: () => navigate('/user/survey'),
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [no, memberNo, navigate]);

    /* 응답에 저장된 질문번호를 이용해 원래 설문의 질문 순서대로 정렬한다. */
    const sortedAnswers = survey && response
        ? survey.questions
            .map((question) =>
                response.answers.find((answer) => answer.questionNo === question.no)
            )
            .filter(
                (answer): answer is SurveyResponse['answers'][number] =>
                    answer !== undefined
            )
        : [];

    /* 설문 목록으로 이동한다. */
    const goList = () => {
        navigate('/user/survey');
    };

    /* 데이터를 불러오는 동안 로딩 화면을 표시한다. */
    if (loading) {
        return (
            <section className="view active">
                <PageHeader
                    title="내 설문 응답"
                    description="제출한 설문 응답을 불러오고 있습니다."
                />

                <div className="card card_pad_lg">
                    설문 응답을 불러오는 중입니다.
                </div>
            </section>
        );
    }

    /*
     * 조회 실패 시 AlertModal에서 목록으로 이동한다.
     * 데이터가 없는 상태에서는 빈 상세화면을 표시하지 않는다.
     */
    if (!survey || !response) {
        return (
            <section className="view active">
                <PageHeader
                    title="내 설문 응답"
                    description="제출한 설문 응답을 확인합니다."
                />

                <AlertModal
                    open={alert !== null}
                    onClose={() => {
                        const onConfirm = alert?.onConfirm;
                        setAlert(null);
                        onConfirm?.();
                    }}
                    onConfirm={alert?.onConfirm}
                    message={alert?.message ?? ''}
                    variant={alert?.variant}
                />
            </section>
        );
    }

    return (
        <section className="view active">
            <PageHeader
                title="내 설문 응답"
                description="내가 제출한 설문 답변을 확인할 수 있습니다."
                actions={
                    <button
                        type="button"
                        className="btn btn_md btn_ghost"
                        onClick={goList}
                    >
                        ← 설문 목록
                    </button>
                }
            />

            {/* 설문 기본정보 */}
            <div className="card card_pad_lg">
                <div style={{ marginBottom: 6, fontSize: 20, fontWeight: 700 }}>
                    {survey.title}
                </div>

                {survey.detail && (
                    <div
                        style={{
                            marginBottom: 14,
                            lineHeight: 1.7,
                            color: 'var(--text-dim)',
                        }}
                    >
                        {survey.detail}
                    </div>
                )}

                <div
                    style={{
                        display: 'flex',
                        gap: 18,
                        flexWrap: 'wrap',
                        fontSize: 13,
                        color: 'var(--text-dim)',
                    }}
                >
                    <span>
                        설문 기간&nbsp;
                        {formatDate(survey.startDate)}
                        &nbsp;~&nbsp;
                        {formatDate(survey.endDate)}
                    </span>

                    <span>
                        제출일&nbsp;
                        {formatDateTime(response.cdate)}
                    </span>
                </div>
            </div>

            {/* 내가 제출한 질문별 답변 */}
            <div
                className="card card_pad_lg"
                style={{ marginTop: 18 }}
            >
                <div style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        내 답변
                    </div>

                    <div className="field_hint">
                        설문 기간이 종료되어 제출한 답변을 조회만 할 수 있습니다.
                    </div>
                </div>

                {sortedAnswers.length === 0 ? (
                    <div
                        className="field_hint"
                        style={{
                            padding: '34px 0',
                            textAlign: 'center',
                        }}
                    >
                        저장된 설문 답변이 없습니다.
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                        }}
                    >
                        {sortedAnswers.map((answer, index) => (
                            <div
                                key={answer.no}
                                style={{
                                    padding: 16,
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    background: 'var(--bg-elevated)',
                                }}
                            >
                                {/* 질문 내용과 질문 유형 */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 10,
                                    }}
                                >
                                    <span style={{ fontWeight: 700 }}>
                                        Q{index + 1}.
                                    </span>

                                    <span style={{ fontWeight: 600 }}>
                                        {answer.qtext}
                                    </span>

                                    <span className="badge">
                                        {getQuestionTypeLabel(answer.qtype)}
                                    </span>
                                </div>

                                {/* 사용자가 제출한 실제 답변 */}
                                <div style={{ paddingLeft: 24 }}>
                                    <span
                                        style={{
                                            marginRight: 8,
                                            color: 'var(--text-dim)',
                                        }}
                                    >
                                        내 답변
                                    </span>

                                    <strong>
                                        {getAnswerText(answer)}
                                    </strong>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 조회 전용이므로 수정 버튼 없이 목록 버튼만 제공한다. */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 24,
                    }}
                >
                    <button
                        type="button"
                        className="btn btn_md btn_primary"
                        onClick={goList}
                    >
                        목록으로
                    </button>
                </div>
            </div>

            {/* 조회 중 발생한 오류를 공통 알림으로 표시한다. */}
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