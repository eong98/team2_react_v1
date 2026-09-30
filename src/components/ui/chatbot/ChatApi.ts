import axios from 'axios';

export interface ChatSummaryResult {
  title: string;
  content: string;
  type: number;
}

/**
 * H200 FastAPI 주소.
 * 설문 AI 분석 실행은 Spring이 아니라 FastAPI가 직접 담당한다.
 */
export const FASTAPI_BASE_URL = 'http://139.150.91.194:11200';
// export const FASTAPI_BASE_URL = 'http://localhost:11200';


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