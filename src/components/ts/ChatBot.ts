import type { ChatMenuTypes } from './ChatMenu';

export interface ChatBubble {
  id: string;
  sender: 0 | 1 | 2; // 0 사용자 / 1 AI / 2 시스템
  content: string;
  mtype?: number,
  needsAdmin?: boolean; // AI가 확신 없어서 관리자 연결 버튼을 붙여야 하는 응답인지
  createdAt: string; // ISO 문자열, 메시지 생성 시각
}

export type ChatStage = 'INTRO' | 'OPTION' | 'AI';

// export type EndFlowStep = null | 'ASK_SATISFY' | 'ASK_ESCALATE_CONFIRM' | 'ASK_UNSATISFY_REASON' | 'ASK_UNSATISFY_MEMO';

/** 서버가 내려주는 숫자(ENDFLOW)를 프론트 문자열 상태로 변환 */
export const numberToEndFlow = (n: number | null | undefined) => {
  switch (n) {
    case 0: return 'ASK_SATISFY';
    case 1: return 'ASK_UNSATISFY_REASON';
    case 2: return 'ASK_UNSATISFY_MEMO';
    case 3: return 'ASK_ESCALATE_CONFIRM';
    case 4: return 'FAIL_AI_ANSWER';
    case 5: return 'SUMMARIZING';
    case 6: return 'AI_RESPONDING';
    default: return null;
  }
};

export const UNSATISFY_REASONS: { code: number; label: string }[] = [
  { code: 0, label: '답변이 부정확했어요' },
  { code: 1, label: '응답이 느렸어요' },
  { code: 2, label: '원하는 답을 못 찾았어요' },
  { code: 9, label: '기타' },
];

/**
 * 상담 진행 중 나오는 시스템 안내 문구. UNSATISFY_REASONS와 동일한
 * { code, label } 형태로, 프론트가 code로 찾은 label(텍스트)을
 * 서버에 그대로 실어 보냅니다. 백엔드는 별도 매핑 클래스 없이
 * 받은 텍스트를 그대로 CHAT_LOG에 저장합니다.
 */
export const SYSTEM_MESSAGES: { code: number; label: string }[] = [
  { code: 0, label: '상담이 만족스러우셨나요?' },
  { code: 1, label: '어떤 점이 아쉬우셨나요?' },
  { code: 2, label: '소중한 의견 감사합니다. 상담을 종료합니다.' },
  { code: 3, label: '관리자에게 문의를 남기시겠어요? 문의를 남기면 현재 상담이 종료되며, 답변은 등록하신 이메일로 안내드립니다.' },
  { code: 4, label: '어떤 점이 아쉬우셨는지 채팅창에 입력해주세요.' },
  { code: 5, label: '안녕하세요! 무엇을 도와드릴까요?' },
  { code: 6, label: '질문 옵션을 선택해주세요.' },
  { code: 7, label: '여기부터 AI 상담입니다.' },
  { code: 8, label: '여기까지가 AI 상담입니다.' },
  { code: 9, label: '안녕하세요! AI 입니다!\n무엇을 도와드릴까요?' },
];

/** code로 문구 텍스트를 바로 찾는 헬퍼 */

// 최소한 code와 label을 가지고 있는 객체 타입 정의
export interface BaseMessage {
  code: number;
  label: string;
  [key: string]: any; // 그 외에 어떤 속성이 추가로 있어도 모두 허용
}
export const getMessage = (select: BaseMessage[], code: number): string =>
  select.find((m) => m.code === code)?.label ?? '';


export interface ChatLogEntry {
  no: number;
  sender: 0 | 1 | 2;
  mtype: number;
  content: string;
  cno: number | null;
  cdate: string;
}

export interface ChatSessionResponse {
  no: string;
  mno: number | null;
  gno: string | null;
  cno: number | null;
  cmode: 0 | 1 | 2;
  channel: number;
  qno: number | null;
  cdate: string;
  udate: string;
  closedat: string | null;
  creason: number | null;
  satisfy: number | null;
  sreason: number | null;
  smemo: string | null;
  cnoLabel?: string;
  stitle?: string;
  readat: string | null;
  endflow: number | null;
}

export interface ChatSessionSummary {
  no: string;
  stitle: string;
  cmode: 0 | 1 | 2;
  udate: string;
  readat: string | null;
}

export interface ChatActionResult {
  no?: string; // 새로 생성된 세션 번호 (create 액션에서만 채워짐)
  cmode?: number;
  logs: ChatLogEntry[];
  nextOptions?: ChatMenuTypes[];
  hasChildren?: boolean;
  sessionEnded?: boolean;
  needsAdmin?: boolean;
}

export interface ChatStepRequest {
  /* 0 'END' | 1 'SATISFY' | 2 'UNSATISFY_REASON' | 3 'UNSATISFY_MEMO' | 4 'ESCALATE' | 5 'ESCALATE_CONFIRM' */
  action: number;
  satisfy?: number;
  sreason?: number;
  label?: string;
  smemo?: string;
  goQa?: boolean;
  systemMessage?: string;
}

/** 메시지 시간을 "오후 3:24" 형태로 표시 */
export const formatMessageTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/** 날짜를 "2026년 9월 14일" 형태로 표시 */
export const formatMessageDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** 같은 날짜인지 비교 (연/월/일만) */
export const isSameDate = (isoA: string, isoB: string): boolean => {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

/** 30분 미만이면 "N분 전", 그 이상이면 기존 절대시각(udate) 그대로 반환 */
export const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  
  const d = new Date(iso);
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  if (diffMin < 1) return `방금 전`;
  if (diffMin < 30) return `${diffMin}분 전`;

  return `${time}`;
};
