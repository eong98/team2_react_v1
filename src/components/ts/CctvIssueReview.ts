import axios from 'axios';

/* ---------------------------------------------------------------------
   CCTV 이슈 AI 검토(에이전트) 타입/API.
   src/pages/user/cctv/CctvIssueReviewBox.tsx 에서만 참조합니다.

   백엔드: FastAPI cctv/router.py  POST /api/cctv/issue/{no}/review
           (cctv/schema.py CctvIssueReviewResponse와 1:1)

   - Spring(9102)이 아니라 FastAPI(11200)를 직접 호출합니다(챗봇 ChatApi.ts, 설문 surveyApi.ts와 같은 방식).
     그래서 쿠키를 싣는 axiosInstance가 아니라 기본 axios를 씁니다.
   - 에이전트가 LLM을 여러 번 호출하므로 응답까지 수 초~수십 초가 걸립니다 → timeout을 넉넉히 둡니다.
   - 조회 전용입니다. 정탐/오탐 확정은 기존 PUT /cctv_issue/update(버튼)가 그대로 담당합니다.
--------------------------------------------------------------------- */

export const FASTAPI_BASE_URL = 'http://139.150.91.194:11200';
// export const FASTAPI_BASE_URL = 'http://localhost:11200';

/** 요청 제한 시간(ms) - LLM 호출 최대 7회 + DB 조회를 감안 */
export const REVIEW_TIMEOUT_MS = 120_000;

export type ReviewVerdict = 'LIKELY_TRUE' | 'LIKELY_FALSE' | 'UNCERTAIN';

/** 에이전트가 조회한 기록 1건 */
export interface CctvIssueReviewStep {
  tool: string; // 도구 이름 (recent_issues 등) - key 용도
  label: string; // 화면 표시용 이름
  summary: string; // 조회 결과 한 줄 요약 (서버 코드가 만든 문장)
}

export interface CctvIssueReview {
  no: number;
  code: string;
  codeName: string;
  verdict: ReviewVerdict;
  verdictLabel: string; // 정탐 가능성 높음 | 오탐 가능성 높음 | 판단 보류
  reasons: string[];
  recommendation: string;
  steps: CctvIssueReviewStep[];
  fallback: boolean; // true: AI가 판단을 끝내지 못해 조회 기록만 제공
  elapsedMs: number;
}

/**
 * 판정별 배지 색.
 * 정탐 가능성 높음 = 실제 상황일 수 있으니 위험색, 오탐 가능성 = 중립, 보류 = 주의.
 * (CctvIssue.ts STATE_BADGE의 정탐=danger / 오탐=neutral 규칙과 맞춤)
 */
export const VERDICT_BADGE: Record<ReviewVerdict, string> = {
  LIKELY_TRUE: 'badge_danger',
  LIKELY_FALSE: 'badge_neutral',
  UNCERTAIN: 'badge_warning',
};

/** 이슈 1건 AI 검토 요청. sno(현재 매장)를 같이 보내 다른 매장 이슈 조회를 막습니다. */
export async function requestIssueReview(no: number, sno: number | null): Promise<CctvIssueReview> {
  const res = await axios.post<CctvIssueReview>(
    `${FASTAPI_BASE_URL}/api/cctv/issue/${no}/review`,
    { sno },
    { timeout: REVIEW_TIMEOUT_MS }
  );
  return res.data;
}

/** 실패 사유를 사용자에게 보여줄 문장으로 바꿉니다. */
export function reviewErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') {
      return 'AI 검토 시간이 초과되었습니다.\n잠시 후 다시 시도해주세요.';
    }
    if (!err.response) {
      return 'AI 서버에 연결할 수 없습니다.\n잠시 후 다시 시도해주세요.';
    }
    if (err.response.status === 404) return '이슈를 찾을 수 없습니다.';
    if (err.response.status === 403) return '선택한 매장의 이슈가 아닙니다.';
  }
  return 'AI 검토에 실패했습니다.\n다시 시도해주세요.';
}
