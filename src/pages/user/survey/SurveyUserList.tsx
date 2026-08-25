import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AlertModal, PageHeader } from '../../../components/ui';
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
   - 진행 중 + 미참여: 참여하기
   - 진행 중 + 참여완료: 응답 수정
   - 종료 + 참여완료: 내 응답 보기
   - 설문 응답/수정은 점주(grade 10)만 가능
========================================================= */
export default function SurveyUserList() {
  const navigate = useNavigate();

  const memberNo = GlobalStoreSession((state) => state.no);
  const grade = GlobalStoreSession((state) => state.grade);

  // 10등급만 점주
  const isShopOwner = grade === 10;

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [participatedSurveyNos, setParticipatedSurveyNos] =
    useState<Set<number>>(new Set());

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState<{
    message: string;
    variant?: 'success' | 'error';
  } | null>(null);

  /* 전체 설문을 조회한 뒤 로그인 회원의 참여 여부를 확인한다. */
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setLoading(true);

        // 최신 설문이 위로 오도록 정렬
        const list = await getSurveys();
        const sorted = [...list].sort((a, b) => b.no - a.no);
        setSurveys(sorted);

        // 진행 중이거나 종료된 설문의 본인 응답 존재 여부 확인
        const checkList = sorted.filter((survey) => {
          const status = getSurveyStatus(survey);
          return status === 'ACTIVE' || status === 'END';
        });

        const participated = await Promise.all(
          checkList.map(async (survey) => {
            try {
              await getMemberSurveyResponse(survey.no, memberNo);
              return survey.no;
            } catch {
              return null;
            }
          })
        );

        const completedNos = participated.filter(
          (surveyNo): surveyNo is number => surveyNo !== null
        );

        setParticipatedSurveyNos(new Set(completedNos));
      } catch (error: any) {
        console.error(error);

        setAlert({
          message:
            error.response?.data?.message ??
            '설문 목록을 불러오지 못했습니다.',
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSurveys();
  }, [memberNo]);

  /*
   * 사용자 목록에 표시할 설문
   * 진행 중 설문은 모두 표시하고,
   * 종료된 설문은 본인이 참여한 경우에만 표시한다.
   */
  const visibleSurveys = useMemo(() => {
    return surveys.filter((survey) => {
      const status = getSurveyStatus(survey);

      if (status === 'ACTIVE') return true;

      if (status === 'END') {
        return participatedSurveyNos.has(survey.no);
      }

      return false;
    });
  }, [surveys, participatedSurveyNos]);

  // 페이징
  const totalPages = Math.max(
    1,
    Math.ceil(visibleSurveys.length / SURVEY_LIST_PAGE_SIZE)
  );

  const paged = visibleSurveys.slice(
    (page - 1) * SURVEY_LIST_PAGE_SIZE,
    page * SURVEY_LIST_PAGE_SIZE
  );

  /* 참여하기 / 응답 수정 화면으로 이동한다. */
  const handleAnswer = (surveyNo: number) => {
    if (!isShopOwner) {
      setAlert({
        message: '설문조사 응답은 점주만 가능합니다.',
        variant: 'error',
      });
      return;
    }

    navigate(`/user/survey/${surveyNo}`);
  };

  /* 종료된 설문의 내 응답 상세 화면으로 이동한다. */
  const handleResponseDetail = (surveyNo: number) => {
    navigate(`/user/survey/${surveyNo}/response`);
  };

  return (
    <section className="view active">
      <PageHeader
        title="설문조사"
        description="참여 가능한 설문과 내가 참여한 설문을 확인할 수 있습니다."
      />

      <div className="card card_pad_lg">
        {loading && <div>설문 목록을 불러오는 중입니다.</div>}

        {!loading && visibleSurveys.length === 0 && (
          <div>현재 참여 가능한 설문이 없습니다.</div>
        )}

        {!loading &&
          paged.map((survey) => {
            const status = getSurveyStatus(survey);
            const participated = participatedSurveyNos.has(survey.no);
            const isActive = status === 'ACTIVE';

            return (
              <div
                key={survey.no}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  padding: '18px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {/* 설문 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 8px' }}>
                    {survey.title}
                  </h3>

                  {survey.detail && (
                    <div
                      style={{
                        marginBottom: '8px',
                        color: 'var(--text-dim)',
                      }}
                    >
                      {survey.detail}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-dim)',
                    }}
                  >
                    설문 기간&nbsp;
                    {formatDate(survey.startDate)}
                    &nbsp;~&nbsp;
                    {formatDate(survey.endDate)}
                  </div>
                </div>

                {/* 오른쪽 버튼 영역 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexShrink: 0,
                  }}
                >
                  {/* 진행 중 + 미참여 + 점주 */}
                  {isShopOwner && isActive && !participated && (
                    <button
                      type="button"
                      className="btn btn_md btn_primary"
                      onClick={() => handleAnswer(survey.no)}
                    >
                      참여하기
                    </button>
                  )}

                  {/* 진행 중 + 참여완료 + 점주 */}
                  {isShopOwner && isActive && participated && (
                    <button
                      type="button"
                      className="btn btn_md btn_primary"
                      onClick={() => handleAnswer(survey.no)}
                    >
                      응답 수정
                    </button>
                  )}

                  {/* 설문 종료 + 참여완료 */}
                  {!isActive && participated && (
                    <button
                      type="button"
                      className="btn btn_md btn_ghost"
                      onClick={() => handleResponseDetail(survey.no)}
                    >
                      내 응답 보기
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        {/* 페이징 */}
        {!loading && visibleSurveys.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            <button
              type="button"
              className="btn btn_sm"
              disabled={page === 1}
              onClick={() =>
                setPage((prev) => Math.max(1, prev - 1))
              }
            >
              이전
            </button>

            <span>
              {page} / {totalPages}
            </span>

            <button
              type="button"
              className="btn btn_sm"
              disabled={page === totalPages}
              onClick={() =>
                setPage((prev) =>
                  Math.min(totalPages, prev + 1)
                )
              }
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 목록 조회 실패 시 공통 알림 모달 */}
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}