/* ---------------------------------------------------------------------
   /user/dashboard(매장 통계) 타입/상수.
   백엔드 dev.jpa.allimio.dashboard.DashboardDTO(record)와 1:1로 맞춰져 있습니다.

   API (DashboardCont, /dashboard) - 로그인 회원은 HttpOnly 쿠키(access_token)로 식별.
   mno를 파라미터로 보내지 않습니다(서버가 쿠키 JWT에서 꺼냄).
   GET /dashboard/shops              → DashboardShop[]
   GET /dashboard/stats?sno=&days=   → DashboardStats
--------------------------------------------------------------------- */

export interface DashboardShop {
  no: number;
  title: string;
  role: 'OWNER' | 'STAFF'; // OWNER: SHOP.MNO 소유 점주, STAFF: SHOP_MEMBER 배정 직원
}

export interface DashboardPoint {
  label: string; // 날짜 yyyy-MM-dd 또는 시간 HH
  value: number;
}

export interface DashboardCodeCount {
  code: string;
  codeName: string;
  severity: number; // 1 낮음 ~ 3 높음 (CCTV_ISSUE_CODE.SEVERITY)
  value: number;
}

export interface DashboardStateCount {
  state: number;
  value: number;
}

export interface DashboardRecentIssue {
  no: number;
  cno: number;
  code: string;
  codeName: string;
  state: number; // 0 미확인 / 1 정탐 / 2 오탐 (CctvIssue.ts STATE_LABELS)
  reliability: string | null;
  cdate: string;
}

export interface DashboardSummary {
  visitorCount: number;
  visitorCountPrev: number;
  avgStayMinutes: number | null;
  currentVisitors: number;
  longStayCount: number;
  issueCount: number;
  issueCountPrev: number;
  unconfirmedIssues: number;
  confirmedIssues: number;
  falseIssues: number;
  cctvTotal: number;
  cctvNormal: number;
}

export interface DashboardStats {
  sno: number;
  shopTitle: string;
  days: number;
  from: string;
  to: string;
  summary: DashboardSummary;
  visitorDaily: DashboardPoint[];
  visitorHourly: DashboardPoint[];
  issueDaily: DashboardPoint[];
  issueByCode: DashboardCodeCount[];
  cctvByState: DashboardStateCount[];
  recentIssues: DashboardRecentIssue[];
}

/** 조회기간 탭 */
export const PERIODS = [
  { days: 7, label: '최근 7일' },
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 90일' },
] as const;

export type PeriodDays = (typeof PERIODS)[number]['days'];

/** 자동 새로고침 주기(ms) - 관제 화면이라 1분마다 조용히 다시 불러옴 */
export const AUTO_REFRESH_MS = 60_000;

/* ---------------------------------------------------------------------
   차트 색상 (index.css 토큰 값을 그대로 가져옴).
   Recharts는 SVG 속성으로 색을 넣기 때문에 CSS 변수 대신 hex를 씁니다.

   - 방문객 = teal(secondary), 이슈 = violet : 두 지표 모두 "한 종류 값의 크기"라
     한 차트에 한 색(단일 hue)만 씁니다. 빨강/주황/노랑은 상태(경고/위험) 색이라
     일반 데이터 색으로 쓰지 않습니다.
   - 격자/축은 눈에 덜 띄게(border / text-faint).
--------------------------------------------------------------------- */
export const CHART_COLORS = {
  visitor: '#17A997', // --teal-600 (어두운 배경에서 violet과 밝기를 맞춘 단계)
  issue: '#8A66FF', // --violet-400
  grid: '#232C37', // --border
  axis: '#A4AEB7', // --text-faint
  surface: '#141B24', // --surface (마커 테두리 링)
  cursor: 'rgba(255,255,255,0.05)',
};

/** CCTV 상태 (CctvUser.ts STATE_LABELS와 동일) */
export const CCTV_STATE_LABELS: Record<number, string> = { 0: '정상', 1: '점검중', 2: '고장' };
export const CCTV_STATE_BADGE: Record<number, string> = { 0: 'badge_success', 1: 'badge_warning', 2: 'badge_danger' };

/** 이상행동 심각도 */
export const SEVERITY_LABELS: Record<number, string> = { 1: '낮음', 2: '보통', 3: '높음' };
export const SEVERITY_BADGE: Record<number, string> = { 1: 'badge_neutral', 2: 'badge_warning', 3: 'badge_danger' };

/** 증감률(%) - 직전 기간이 0이면 비교 불가(null) */
export function deltaPercent(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

/** 'yyyy-MM-dd' → 'MM-dd' (x축 라벨용) */
export const shortDate = (d: string) => d.slice(5);
