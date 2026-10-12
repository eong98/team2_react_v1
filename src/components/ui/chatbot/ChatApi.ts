import axios from 'axios';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { chatMemberNo, getOrCreateGno } from '../../ts/ChatGuest';

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


/* ---------------------------------------------------------------------
   챗봇 연결용 티켓

   FastAPI(AI 서버)는 Spring의 로그인 쿠키를 볼 수 없어서, 예전에는 화면이 보낸
   회원번호를 그대로 믿었습니다. 이제 Spring이 요청자를 확인하고 발급한 티켓을
   FastAPI 호출(X-Chat-Ticket 헤더)과 웹소켓(?ticket=)에 붙입니다.
   - 서버에 비밀키(CHAT_TICKET_SECRET)가 없으면 Spring이 ticket: null을 주고,
     그때는 티켓 없이 예전처럼 호출합니다.
   - 티켓은 10분짜리 — 만료 1분 전까지 재사용하고, 로그인·로그아웃으로 사용자가 바뀌면 새로 받습니다.
--------------------------------------------------------------------- */
let ticketCache: { key: string; ticket: string | null; expiresAt: number } | null = null;

/** 지금 사용자 — 회원이면 mno(로그인 알림용, 서버는 토큰으로 확인), 아니면 브라우저 식별값 */
const chatIdentity = (): { key: string; params: Record<string, string | number> } => {
  const { no, grade } = GlobalStoreSession.getState();
  const mno = chatMemberNo(no, grade);
  if (mno) return { key: `m:${mno}`, params: { mno } };
  const gno = getOrCreateGno();
  return { key: `g:${gno}`, params: { gno } };
};

/** 챗봇 연결용 티켓 (없으면 null — 서버에 티켓 기능이 꺼져 있거나 Spring에 연결할 수 없는 경우) */
export const getChatTicket = async (force = false): Promise<string | null> => {
  const { key, params } = chatIdentity();
  if (!force && ticketCache && ticketCache.key === key && Date.now() < ticketCache.expiresAt) {
    return ticketCache.ticket;
  }
  try {
    const res = await axiosInstance.get<{ ticket: string | null; expiresIn: number }>('/chat_session/ticket', { params });
    const seconds = Math.max(30, (res.data.expiresIn ?? 600) - 60); // 만료 1분 전까지만 재사용
    ticketCache = { key, ticket: res.data.ticket ?? null, expiresAt: Date.now() + seconds * 1000 };
  } catch {
    ticketCache = { key, ticket: null, expiresAt: Date.now() + 30_000 }; // 30초 뒤 다시 시도
  }
  return ticketCache.ticket;
};

/* 관리자 화면용 티켓 — 챗봇 매뉴얼·옵션메뉴 관리 API(/api/chatbot/manual-doc/*) 전용.
   Spring이 관리자 로그인을 확인하고 발급 (GET /chat_session/ticket/admin) */
let adminTicketCache: { ticket: string | null; expiresAt: number } | null = null;

export const getAdminChatTicket = async (force = false): Promise<string | null> => {
  if (!force && adminTicketCache && Date.now() < adminTicketCache.expiresAt) return adminTicketCache.ticket;
  try {
    const res = await axiosInstance.get<{ ticket: string | null; expiresIn: number }>('/chat_session/ticket/admin');
    const seconds = Math.max(30, (res.data.expiresIn ?? 600) - 60);
    adminTicketCache = { ticket: res.data.ticket ?? null, expiresAt: Date.now() + seconds * 1000 };
  } catch {
    adminTicketCache = { ticket: null, expiresAt: Date.now() + 30_000 };
  }
  return adminTicketCache.ticket;
};

/**
 * 관리자 매뉴얼 API용 axios — 요청마다 관리자 티켓(X-Chat-Ticket)을 붙이고,
 * 티켓 만료(401)면 새로 받아 한 번 더 시도 (서버에 티켓 기능이 꺼져 있으면 티켓 없이 그대로 호출)
 */
export const adminFastapi = axios.create();
adminFastapi.interceptors.request.use(async (config) => {
  const ticket = await getAdminChatTicket((config as { _retryTicket?: boolean })._retryTicket === true);
  if (ticket) config.headers.set('X-Chat-Ticket', ticket);
  return config;
});
adminFastapi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (typeof error.config & { _retryTicket?: boolean }) | undefined;
    if (config && error.response?.status === 401 && !config._retryTicket) {
      config._retryTicket = true;
      return adminFastapi(config);
    }
    return Promise.reject(error);
  },
);

/** FastAPI 챗봇 API 호출 — 티켓을 붙이고, 티켓 만료(401)면 새로 받아 한 번 더 시도 */
const callChatApi = async <T>(method: 'post' | 'put', path: string, body?: unknown): Promise<T> => {
  const request = async (force: boolean) => {
    const ticket = await getChatTicket(force);
    return axios.request<T>({
      method,
      url: `${FASTAPI_BASE_URL}${path}`,
      data: body,
      headers: ticket ? { 'X-Chat-Ticket': ticket } : undefined,
    });
  };
  try {
    return (await request(false)).data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return (await request(true)).data;
    }
    throw err;
  }
};


/** H200 FastAPI 챗봇 대화 요약 실행. Spring을 거치지 않고 FastAPI를 직접 호출한다. */
export const summarizeChat = async (sno: string): Promise<ChatSummaryResult> => {
  return callChatApi<ChatSummaryResult>('post', `/api/chatbot/${sno}/summarize`);
};


/**
 * 상담 종료 후 채팅 목록 제목만 AI 요약으로 변경 (백그라운드 — 결과를 기다리지 않음).
 * 완료되면 WebSocket 'session_updated' 알림으로 목록이 새로고침된다.
 */
export const summarizeTitle = async (sno: string): Promise<void> => {
  await callChatApi<unknown>('post', `/api/chatbot/${sno}/summarize-title`);
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
  return callChatApi<AiChatResult>('post', `/api/chatbot/${sno}/ai-chat`, { message });
};

export interface AiStartResult {
  logs: AiChatResult['logs'];
}

export const startAiConsult = async (sno: string): Promise<AiStartResult> => {
  return callChatApi<AiStartResult>('put', `/api/chatbot/${sno}/ai-start`);
};

export const endAiConsultDivider = async (sno: string): Promise<AiStartResult> => {
  return callChatApi<AiStartResult>('put', `/api/chatbot/${sno}/ai-end`);
};