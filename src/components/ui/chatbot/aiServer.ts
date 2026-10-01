import axios from 'axios';
import { FASTAPI_BASE_URL } from './ChatApi';

/* ---------------------------------------------------------------------
   AI 서버(FastAPI) 연결 공통 처리
   - 서버가 꺼져 있을 때 재시도 간격을 점점 늘려 오류가 쌓이지 않게 함
   - "서버에 연결할 수 없음"과 "서버가 보낸 오류"를 구분해서 안내
   챗봇 위젯(WebSocket·폴링), 채팅방, 관리자 옵션메뉴 화면이 함께 씁니다.
--------------------------------------------------------------------- */

const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 30000;

/** 재시도 대기 시간 — 1초, 2초, 4초 … 최대 30초 */
export const backoffDelay = (retry: number): number => Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** retry);

/** 서버까지 요청이 닿지 못한 경우(서버 꺼짐, 네트워크 끊김) — 응답 자체가 없음 */
export const isNetworkError = (err: unknown): boolean => axios.isAxiosError(err) && !err.response;

export const AI_SERVER_DOWN_MESSAGE = 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';

/** 오류를 사용자 안내 문구로 — 서버 꺼짐 / 서버가 보낸 사유(detail) / 기본 문구 */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  if (isNetworkError(err)) return AI_SERVER_DOWN_MESSAGE;
  const data = (err as { response?: { data?: { detail?: unknown; message?: string } } })?.response?.data;
  const detail = data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : String(d))).join(', ');
  }
  return data?.message || fallback;
};

/** AI 서버 상태 확인 (FastAPI GET /api/chatbot/health, 3초 안에 응답 없으면 꺼진 것으로 판단) */
export const checkAiServer = async (): Promise<boolean> => {
  try {
    await axios.get(`${FASTAPI_BASE_URL}/api/chatbot/health`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};
