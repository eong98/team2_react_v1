export interface ChatBubble {
  id: string;
  kind?: 'message' | 'divider';
  sender: 0 | 1 | 2;
  content: string;
  needsAdmin?: boolean;
  createdAt: string; // ISO 문자열, 메시지 생성 시각
}

export type ChatStage = 'INTRO' | 'OPTION' | 'AI';

export type EndFlowStep = null | 'ASK_SATISFY' | 'ASK_ESCALATE_CONFIRM' | 'ASK_UNSATISFY_REASON' | 'ASK_UNSATISFY_MEMO';
export const UNSATISFY_REASONS: { code: number; label: string }[] = [
  { code: 0, label: '답변이 부정확했어요' },
  { code: 1, label: '응답이 느렸어요' },
  { code: 2, label: '원하는 답을 못 찾았어요' },
  { code: 9, label: '기타' },
];

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