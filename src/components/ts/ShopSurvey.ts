/* ---------------------------------------------------------------------
   매장 설문조사(SHOP_SURVEY) 타입 / 상수

   백엔드 dev.jpa.allimio.shopsurvey 패키지의 DTO와 1:1로 맞춥니다.
   기존 설문(survey.ts, /user/survey)과는 별개 기능입니다.

   ShopSurveyForm은 아래 세 곳에서 같은 형식으로 씁니다.
   1. 설문 생성/수정 폼 state
   2. 임시저장(SHOP_SURVEY.DRAFT) JSON
   3. AI 자동작성(FastAPI) 결과
--------------------------------------------------------------------- */

/** 상태 */
export type ShopSurveyStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'DELETE';

/** 답변타입 */
export type ShopSurveyAtype = 'SHORT' | 'LONG' | 'SINGLE' | 'MULTI' | 'SCALE';

/** 객관식 보기 */
export interface ShopSurveyOption {
  no?: number | null;
  label: string;
  sort?: number;
}

/** 문항 */
export interface ShopSurveyQuestion {
  no?: number | null;
  title: string;
  atype: ShopSurveyAtype;
  /** 0:필수아님 / 1:필수 */
  requiredyn: 0 | 1;
  /** 0:첨부불가 / 1:첨부가능 (최대 10장) */
  fileyn: 0 | 1;
  sort?: number;
  options: ShopSurveyOption[];
}

/** 설문 폼 (GET /shop_survey/{svno}, 임시저장/게시 요청 body) */
export interface ShopSurveyForm {
  no?: number | null;
  sno?: number | null;
  /** 매장명 (고객 화면 조회 시에만) */
  shopTitle?: string | null;
  title: string;
  description?: string | null;
  status?: ShopSurveyStatus;
  qrid?: string;
  udate?: string | null;
  cdate?: string;
  /** 응답 수 (1건 이상이면 수정 잠금) */
  responseCount?: number | null;
  questions: ShopSurveyQuestion[];
}

/** 목록 항목 (GET /shop_survey/list/{sno}) */
export interface ShopSurveyListItem {
  no: number;
  title: string;
  description: string | null;
  status: ShopSurveyStatus;
  qrid: string;
  cdate: string;
  udate: string | null;
  /** DRAFT는 문항이 임시저장 JSON에만 있어서 0 */
  questionCount: number;
  responseCount: number;
}

/** 목록 행 (화면 번호 포함) */
export interface ShopSurveyRow extends ShopSurveyListItem {
  cnt: number;
}

/** 공통 페이징 응답 (tool/PageResponse) */
export interface ShopSurveyPage<T> {
  content: T[];
  page: number; // 0부터 시작
  size: number;
  totalElements: number;
  totalPages: number;
}

/** 응답 첨부 사진 (AttachDTO) */
export interface ShopSurveyAttach {
  no: number;
  name: string;
  sname: string;
  thumb: string;
  purl: string;
  type: 0 | 1;
  fsize: number;
}

/** 응답 안의 문항별 답 */
export interface ShopSurveyAnswer {
  no: number;
  sqno: number;
  questionTitle: string;
  atype: ShopSurveyAtype;
  content: string | null;
  scale: number | null;
  /** 선택한 보기 내용 */
  options: string[];
  files: ShopSurveyAttach[];
}

/** 응답 1건 (GET /shop_survey/{svno}/responses) */
export interface ShopSurveyResponse {
  no: number;
  cdate: string;
  answers: ShopSurveyAnswer[];
}

/** 보기별 선택 수 */
export interface ShopSurveyOptionStat {
  sono: number;
  label: string;
  count: number;
}

/** 문항별 집계 */
export interface ShopSurveyQuestionStat {
  sqno: number;
  title: string;
  atype: ShopSurveyAtype;
  answerCount: number;
  /** SCALE일 때만 */
  scaleAvg: number | null;
  options: ShopSurveyOptionStat[];
}

/** 집계 (GET /shop_survey/{svno}/stats) */
export interface ShopSurveyStats {
  svno: number;
  totalResponses: number;
  questions: ShopSurveyQuestionStat[];
}

/** AI 요약 결과 (POST /shop_survey/{svno}/summary) */
export interface ShopSurveySummary {
  /** 전체 응답 요약 */
  summary: string;
  /** 긍정/부정 점수: 0 = 매우 부정, 5 = 중립, 10 = 매우 긍정 */
  score: number;
  /** 점수 판단 근거 */
  reason: string;
  /** 분석에 사용한 응답 수 */
  responseCount: number;
}

/** 응답일 기간 필터 (yyyy-MM-dd, '' = 제한 없음) */
export interface ShopSurveyDateRange {
  from: string;
  to: string;
}

export const EMPTY_SHOP_SURVEY_RANGE: ShopSurveyDateRange = { from: '', to: '' };

/** 기간 필터 → API 쿼리 파라미터 (빈 값은 보내지 않음) */
export const toShopSurveyRangeParams = (range: ShopSurveyDateRange) => ({
  from: range.from || undefined,
  to: range.to || undefined,
});

/** 감정 점수 → 라벨/배지 (텍스트와 함께 표시) */
export const getShopSurveySentiment = (score: number) => {
  if (score >= 7) return { label: '긍정', badge: 'badge_success' };
  if (score > 4) return { label: '중립', badge: 'badge_neutral' };
  return { label: '부정', badge: 'badge_danger' };
};


/** 백엔드 오류 응답 (ShopSurveyExceptionHandler) */
export interface ShopSurveyError {
  success: false;
  message: string;
}

/* ---------------------------------------------------------------------
   상수
--------------------------------------------------------------------- */

export const SHOP_SURVEY_PAGE_SIZE = 10;
export const SHOP_SURVEY_RESPONSE_PAGE_SIZE = 5;

/** 점수 최대값 (고정) */
export const SHOP_SURVEY_SCALE_MAX = 10;

/** 목록 상태 필터 칩 ('' = 전체) */
export const SHOP_SURVEY_STATUS_FILTERS: { value: '' | ShopSurveyStatus; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'OPEN', label: '진행중' },
  { value: 'DRAFT', label: '작성중' },
  { value: 'CLOSED', label: '종료' },
];

export const SHOP_SURVEY_STATUS_LABEL: Record<ShopSurveyStatus, string> = {
  DRAFT: '작성중',
  OPEN: '진행중',
  CLOSED: '종료',
  DELETE: '삭제',
};

export const SHOP_SURVEY_STATUS_BADGE: Record<ShopSurveyStatus, string> = {
  DRAFT: 'badge_neutral',
  OPEN: 'badge_success',
  CLOSED: 'badge_warning',
  DELETE: 'badge_danger',
};

export const SHOP_SURVEY_ATYPE_LABEL: Record<ShopSurveyAtype, string> = {
  SHORT: '단답형',
  LONG: '장문형',
  SINGLE: '객관식(단일)',
  MULTI: '객관식(복수)',
  SCALE: `점수(0~${SHOP_SURVEY_SCALE_MAX})`,
};

/* ---------------------------------------------------------------------
   URL
--------------------------------------------------------------------- */

/** 점주 화면 경로 (조회/생성) */
export const SHOP_SURVEY_BASE = '/user/shopsurvey';

/** 손님 응답 화면 경로 (비로그인, QR로 접속, /user·/dbms와 분리) */
export const SHOP_SURVEY_PUBLIC_BASE = '/s';

/** QR코드에 들어갈 고객 응답 URL */
export const getShopSurveyPublicUrl = (qrid: string) =>
  `${window.location.origin}${SHOP_SURVEY_PUBLIC_BASE}/${qrid}`;

/** axios 오류에서 백엔드 메시지 꺼내기 */
export const getShopSurveyErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: Partial<ShopSurveyError> } })?.response?.data;
  return data?.message || fallback;
};
