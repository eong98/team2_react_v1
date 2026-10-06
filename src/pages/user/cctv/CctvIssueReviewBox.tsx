import { useEffect, useRef, useState } from 'react';
import {
  VERDICT_BADGE,
  requestIssueReview,
  reviewErrorMessage,
  type CctvIssueReview,
} from '../../../components/ts/CctvIssueReview.ts';
import './CctvIssueReviewBox.css';

/* ---------------------------------------------------------------------
   CCTV 이슈 상세 패널의 "AI 검토" 영역.

   버튼을 누르면 FastAPI의 검토 에이전트가 관련 기록(같은 CCTV의 최근 이슈, 과거 오탐률,
   발생 시각 방문객, 매장 일정, CCTV 상태)을 골라 조회한 뒤 의견을 돌려줍니다.
   의견만 보여주고 상태는 바꾸지 않습니다 - 정탐/오탐 확정은 아래 버튼이 그대로 합니다.

   [사용] CctvIssueList.tsx 에서
     <CctvIssueReviewBox key={renderDetail.no} issueNo={renderDetail.no} sno={shopNo} onError={...} />
   key에 이슈 번호를 주면 다른 이슈를 열 때 컴포넌트가 새로 만들어져 이전 검토 결과가 남지 않습니다.

   [오류 표시] 팀 규칙대로 API 실패는 AlertModal로 띄웁니다 → 부모의 setAlert를 onError로 받습니다.
--------------------------------------------------------------------- */

interface Props {
  issueNo: number;
  sno: number | null;
  onError: (message: string) => void;
}

export default function CctvIssueReviewBox({ issueNo, sno, onError }: Props) {
  const [review, setReview] = useState<CctvIssueReview | null>(null);
  const [loading, setLoading] = useState(false);

  // 응답을 기다리는 동안 패널을 닫거나 다른 이슈로 넘어가면(언마운트) 늦게 온 응답을 버립니다.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const handleReview = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await requestIssueReview(issueNo, sno);
      if (alive.current) setReview(data);
    } catch (err) {
      console.error('CCTV 이슈 AI 검토 실패:', err);
      if (alive.current) onError(reviewErrorMessage(err));
    } finally {
      if (alive.current) setLoading(false);
    }
  };

  return (
    <div className="issue_review">
      <div className="issue_review_head">
        <div>
          <div className="issue_review_title">AI 검토</div>
          <div className="issue_review_desc">관련 기록을 조회해 정탐·오탐 가능성을 알려드립니다.</div>
        </div>
        <button type="button" className="btn btn_sm btn_outline_primary" disabled={loading} onClick={handleReview}>
          {loading ? '검토 중...' : review ? '다시 검토' : 'AI 검토 요청'}
        </button>
      </div>

      {/* 결과가 바뀌면 화면낭독기가 읽어주도록 aria-live */}
      <div aria-live="polite">
        {loading && <p className="issue_review_loading">AI가 관련 기록을 조회하고 있습니다. 최대 1~2분 걸릴 수 있습니다.</p>}

        {!loading && review && (
          <div className="issue_review_result">
            <span className={`badge ${VERDICT_BADGE[review.verdict] ?? 'badge_neutral'}`}>{review.verdictLabel}</span>

            <ul className="issue_review_reasons">
              {review.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>

            <div className="issue_review_action">
              <span className="k">권장 조치</span>
              {review.recommendation}
            </div>

            {review.steps.length > 0 && (
              <details className="issue_review_steps">
                <summary>AI가 조회한 기록 {review.steps.length}건</summary>
                <ul>
                  {review.steps.map((step, idx) => (
                    <li key={`${step.tool}-${idx}`}>
                      <span className="k">{step.label}</span>
                      {step.summary}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <p className="issue_review_note">AI 의견은 참고용입니다. 영상과 현장을 확인한 뒤 아래에서 직접 처리해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
