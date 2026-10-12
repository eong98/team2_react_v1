/* ---------------------------------------------------------------------
   /dbms/chatstats(챗봇 상담 만족도 통계) 타입/상수.
   백엔드 dev.jpa.allimio.chatstats.ChatStatsDTO(record)와 1:1로 맞춰져 있습니다.

   API (ChatStatsCont, /chat_stats) - 관리자(ROLE_MANAGER) 쿠키 로그인 필요
   GET  /chat_stats/stats?days=        → ChatStats
   POST /chat_stats/ai-summary?days=   → ChatAiSummary (AI 감정분석 + 요약, 버튼을 눌렀을 때만)

   기준: 종료된 상담(CHAT_SESSION.CMODE=2)을 종료 시각으로 집계
   만족도 SATISFY : 1 만족 / 0 불만족 / NULL 미응답
--------------------------------------------------------------------- */
import { CHART_COLORS } from './Dashboard';

export interface ChatDailyPoint {
  label: string; // yyyy-MM-dd
  closed: number; // 종료된 상담 수
  satisfied: number; // 만족 응답
  dissatisfied: number; // 불만족 응답
}

export interface ChatGroupCount {
  key: string; // 불만족 사유 코드 / 종료 사유 코드
  label: string; // 화면 표시 이름
  count: number;
}

export interface ChatGroupSatisfy {
  key: string; // member | guest
  label: string;
  closed: number;
  satisfied: number;
  dissatisfied: number;
}

export interface ChatRecentOpinion {
  no: string; // 상담방 번호
  closedat: string;
  stitle: string | null; // 상담 제목 (AI 요약, 없을 수 있음)
  sreason: number | null; // 불만족 사유 코드
  reasonLabel: string;
  smemo: string | null; // 기타 사유 직접 입력
  member: boolean; // 회원 상담 여부
}

export interface ChatSummary {
  closed: number;
  answered: number;
  satisfied: number;
  dissatisfied: number;
  answeredPrev: number;
  satisfiedPrev: number;
  userClosed: number;
  adminConnect: number;
  autoClosed: number;
  inProgress: number;
}

export interface ChatStats {
  days: number;
  from: string;
  to: string;
  summary: ChatSummary;
  daily: ChatDailyPoint[];
  byReason: ChatGroupCount[];
  byCloseReason: ChatGroupCount[];
  byUserType: ChatGroupSatisfy[];
  recent: ChatRecentOpinion[];
}

/** AI 감정분석 + 요약 결과 (매장 설문 AI 요약과 같은 형식) */
export interface ChatAiSummary {
  summary: string;
  score: number; // 0 = 매우 부정, 5 = 중립, 10 = 매우 긍정
  reason: string;
  weakPoints: string[]; // 개선할 점
  answered: number; // 분석에 쓴 만족도 응답 수
  from: string;
  to: string;
  analyzedAt: string;
}

/** 점수 구간 이름 — 매장 설문(getShopSurveySentiment)과 같은 기준 */
export const getChatSentiment = (score: number) => {
  if (score >= 7) return { label: '긍정', badge: 'badge_success' };
  if (score > 4) return { label: '중립', badge: 'badge_neutral' };
  return { label: '부정', badge: 'badge_danger' };
};

/**
 * 차트 색 — 대시보드와 같은 규칙(Dashboard.ts CHART_COLORS)
 * 빨강/주황은 경고·위험 상태색이라 데이터 색으로 쓰지 않고, 기존 데이터 색 두 가지를 씁니다.
 * 색만으로 구분하지 않도록 범례와 툴팁에 항상 이름을 같이 표시합니다.
 */
export const CHAT_SATISFIED_COLOR = CHART_COLORS.visitor; // teal — 만족
export const CHAT_DISSATISFIED_COLOR = CHART_COLORS.issue; // violet — 불만족

/** 비율(%) — 분모가 0이면 null (표시는 '-') */
export const percent = (part: number, total: number): number | null =>
  total > 0 ? Math.round((part / total) * 100) : null;

export const percentText = (part: number, total: number): string => {
  const p = percent(part, total);
  return p === null ? '-' : `${p}%`;
};
