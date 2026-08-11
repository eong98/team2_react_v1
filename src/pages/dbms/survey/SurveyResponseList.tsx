import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DataTable, DbmsPagination, PageHeader } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { SurveyInfo, SurveyResponse } from '../../../components/ts/survey';
import {
  SURVEY_RESPONSE_PAGE_SIZE,
  formatDate,
  formatDateTime,
  getAnswerText,
  getQuestionTypeLabel,
} from '../../../components/ts/survey';
import {
  checkSurveyResponse,
  getSurvey,
  getSurveyResponse,
  getSurveyResponses,
} from '../../../components/ts/surveyApi';

export default function SurveyResponseList() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();

  const [survey, setSurvey] = useState<SurveyInfo | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  /* 설문 정보 + 응답 목록 조회 */
  const loadData = async () => {
    if (!no) return;

    try {
      setLoading(true);

      const [surveyData, list] = await Promise.all([
        getSurvey(no),
        getSurveyResponses(no),
      ]);

      setSurvey(surveyData);

      setResponses([...list].sort((a, b) => b.no - a.no));
      setPage(1);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message ?? '설문 응답 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [no]);

  /* 응답 상세 조회 */
  const loadResponseDetail = async (responseNo: number) => {
    try {
      setDetailLoading(true);
      const response = await getSurveyResponse(responseNo);
      setSelectedResponse(response);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message ?? '응답 상세정보를 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  /* 관리자 확인 처리 */
  const handleCheck = async () => {
    if (!selectedResponse) return;

    if (selectedResponse.checkYn === 'Y') {
      alert('이미 확인 처리된 응답입니다.');
      return;
    }

    try {
      setChecking(true);

      const updated = await checkSurveyResponse(selectedResponse.no);
      setSelectedResponse(updated);

      setResponses((prev) =>
        prev.map((item) =>
          item.no === updated.no
            ? { ...item, checkYn: updated.checkYn, checkDate: updated.checkDate }
            : item
        )
      );

      alert('응답을 확인 처리했습니다.');
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message ?? '응답 확인 처리 중 오류가 발생했습니다.');
    } finally {
      setChecking(false);
    }
  };

  /* 전체 기준 가상번호 */
  const virtualNoMap = useMemo(() => {
    const map = new Map<number, number>();
    responses.forEach((response, index) => map.set(response.no, responses.length - index));
    return map;
  }, [responses]);

  /* 페이징 */
  const totalPages = Math.max(1, Math.ceil(responses.length / SURVEY_RESPONSE_PAGE_SIZE));
  const pagedResponses = responses.slice((page - 1) * SURVEY_RESPONSE_PAGE_SIZE, page * SURVEY_RESPONSE_PAGE_SIZE);

  const columns: DataTableColumn<SurveyResponse>[] = [
    {
      header: '번호',
      render: (response) => <span className="mono">{virtualNoMap.get(response.no)}</span>,
    },
    {
      header: '회원번호',
      render: (response) => <span className="mono">{response.memberNo}</span>,
    },
    {
      header: '제출일',
      render: (response) => <span className="mono">{formatDateTime(response.cdate)}</span>,
    },
    {
      header: '확인 상태',
      render: (response) => {
        const checked = response.checkYn === 'Y';
        return <span className={checked ? 'badge badge_success' : 'badge'}>{checked ? '확인' : '미확인'}</span>;
      },
    },
    {
      header: '확인일',
      render: (response) => <span className="mono">{formatDateTime(response.checkDate)}</span>,
    },
    {
      header: '응답',
      render: (response) => (
        <button type="button" className="btn btn_sm btn_ghost" onClick={() => loadResponseDetail(response.no)}>
          상세보기
        </button>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title={survey ? `${survey.title} 응답 관리` : '설문 응답 관리'}
        description={
          survey
            ? `${formatDate(survey.startDate)} ~ ${formatDate(survey.endDate)} · 총 ${responses.length}건의 응답`
            : '점주가 제출한 설문 응답을 확인합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => navigate('/dbms/survey')}>
            ← 설문 목록
          </button>
        }
      />

      {/* 응답 목록 */}
      <div className="card card_pad_lg">
        <div style={{ marginBottom: 14, fontWeight: 700 }}>응답 목록</div>

        <DataTable
          columns={columns}
          data={pagedResponses}
          rowKey={(response) => response.no}
          loading={loading}
          emptyMessage="제출된 설문 응답이 없습니다."
        />

        <DbmsPagination
          page={page}
          totalPages={totalPages}
          totalCount={responses.length}
          pageSize={SURVEY_RESPONSE_PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {/* 응답 상세 */}
      <div className="card card_pad_lg" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>응답 상세</div>
            {selectedResponse && (
              <div className="field_hint">
                회원번호 {selectedResponse.memberNo} · 제출 {formatDateTime(selectedResponse.cdate)}
              </div>
            )}
          </div>

          {selectedResponse && (
            <button
              type="button"
              className="btn btn_md btn_primary"
              onClick={handleCheck}
              disabled={checking || selectedResponse.checkYn === 'Y'}
            >
              {selectedResponse.checkYn === 'Y' ? '확인 완료' : checking ? '처리 중...' : '확인 처리'}
            </button>
          )}
        </div>

        {detailLoading && <div className="field_hint">응답 상세정보를 불러오는 중입니다.</div>}

        {!detailLoading && !selectedResponse && (
          <div style={{ padding: '34px 0', textAlign: 'center' }} className="field_hint">
            위 응답 목록에서 상세보기를 선택해주세요.
          </div>
        )}

        {!detailLoading && selectedResponse && (
          <div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <span className={selectedResponse.checkYn === 'Y' ? 'badge badge_success' : 'badge'}>
                {selectedResponse.checkYn === 'Y' ? '확인' : '미확인'}
              </span>

              {selectedResponse.checkDate && (
                <span className="field_hint">확인일: {formatDateTime(selectedResponse.checkDate)}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedResponse.answers.map((answer, index) => (
                <div
                  key={answer.no}
                  style={{
                    padding: 16,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--bg-elevated)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700 }}>Q{index + 1}.</span>
                    <span style={{ fontWeight: 600 }}>{answer.qtext}</span>
                    <span className="badge">{getQuestionTypeLabel(answer.qtype)}</span>
                  </div>

                  <div style={{ paddingLeft: 24, marginBottom: answer.evalScore !== null ? 12 : 0 }}>
                    <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>답변</span>
                    <strong>{getAnswerText(answer)}</strong>
                  </div>

                  {answer.evalScore !== null && (
                    <div style={{ paddingLeft: 24 }}>
                      <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>AI 평가점수</span>
                      <span className="badge badge_success">{answer.evalScore}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}