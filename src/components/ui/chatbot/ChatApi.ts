import axios from 'axios';

export interface ChatSummaryResult {
  title: string;
  content: string;
  type: number;
}

/**
 * FastAPI 주소.
 * 설문 AI 분석 실행은 Spring이 아니라 FastAPI가 직접 담당한다.
 *
 * - 기본값: H200 FastAPI (개발 중엔 아무 설정 없이 이 주소로 감)
 * - 배포 시 빌드 환경변수 VITE_FASTAPI_BASE_URL로 바꿀 수 있음 (코드 수정 없이)
 *   · 가비아 웹서버(nginx)가 /api/chatbot 요청을 H200으로 대신 전달(프록시)하는 경우
 *       VITE_FASTAPI_BASE_URL=        ← 빈 값 = 지금 접속한 사이트 주소 기준 (http/https 모두 차단 없음)
 *   · 다른 FastAPI 서버를 직접 부르는 경우
 *       VITE_FASTAPI_BASE_URL=http://서버주소:11200
 *   · 로컬 FastAPI로 테스트할 때 (.env.local, git에 안 올라감)
 *       VITE_FASTAPI_BASE_URL=http://localhost:11200
 */
const DEFAULT_FASTAPI_BASE_URL = 'http://139.150.91.194:11200';
const envFastapiUrl: string | undefined = import.meta.env.VITE_FASTAPI_BASE_URL;
export const FASTAPI_BASE_URL = (envFastapiUrl ?? DEFAULT_FASTAPI_BASE_URL).replace(/\/+$/, '');

/**
 * FastAPI WebSocket 주소.
 * - FASTAPI_BASE_URL이 있으면 http→ws, https→wss로 바꿔서 사용
 * - 빈 값(프록시)이면 지금 페이지 주소 기준 — https 페이지면 wss (브라우저 mixed content 차단 방지)
 */
export const fastapiWsUrl = (path: string): string => {
  if (FASTAPI_BASE_URL) return `${FASTAPI_BASE_URL.replace(/^http/, 'ws')}${path}`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
};


/** H200 FastAPI 챗봇 대화 요약 실행. Spring을 거치지 않고 FastAPI를 직접 호출한다. */
export const summarizeChat = async (sno: string): Promise<ChatSummaryResult> => {
  const response = await axios.post<ChatSummaryResult>(`${FASTAPI_BASE_URL}/api/chatbot/${sno}/summarize`);
  return response.data;
};


/**
 * 상담 종료 후 채팅 목록 제목만 AI 요약으로 변경 (백그라운드 — 결과를 기다리지 않음).
 * 완료되면 WebSocket 'session_updated' 알림으로 목록이 새로고침된다.
 */
export const summarizeTitle = async (sno: string): Promise<void> => {
  await axios.post(`${FASTAPI_BASE_URL}/api/chatbot/${sno}/summarize-title`);
};


export interface AiChatResult {
  logs: {
    no: number;
    sender: 0 | 1 | 2;
    mtype: number;
    content: string;
    cno: number | null;
    cdate: string;
  }[];
  needsAdmin: boolean;
}

/** H200 FastAPI AI 자유상담 실행. Spring을 거치지 않고 FastAPI를 직접 호출한다. */
export const aiChat = async (sno: string, message: string): Promise<AiChatResult> => {
  const response = await axios.post<AiChatResult>(`${FASTAPI_BASE_URL}/api/chatbot/${sno}/ai-chat`, { message });
  return response.data;
};

export interface AiStartResult {
  logs: AiChatResult['logs'];
}

export const startAiConsult = async (sno: string): Promise<AiStartResult> => {
  const response = await axios.put<AiStartResult>(`${FASTAPI_BASE_URL}/api/chatbot/${sno}/ai-start`);
  return response.data;
};

export const endAiConsultDivider = async (sno: string): Promise<AiStartResult> => {
  const response = await axios.put<AiStartResult>(`${FASTAPI_BASE_URL}/api/chatbot/${sno}/ai-end`);
  return response.data;
};