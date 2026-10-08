/* ---------------------------------------------------------------------
   비회원 문의글 임시 토큰 (sessionStorage `qa_token_{no}`)

   비회원은 로그인 토큰이 없으므로, 게시글 비밀번호를 확인하면
   서버(POST /qa/guest/{no}/verify)가 그 글 하나에만 쓸 수 있는 10분짜리 토큰을 줍니다.
   상세 조회·수정·삭제 요청에 X-Qa-Token 헤더로 붙여 보냅니다.
   (비밀번호를 화면 이동 state로 넘기거나 매번 다시 보내지 않음)

   탭을 닫으면 sessionStorage와 함께 사라지고, 서버에서도 10분 뒤 만료됩니다.
--------------------------------------------------------------------- */
import { axiosInstance } from '../../utils/Tool';

const KEY_PREFIX = 'qa_token_';

/** 서버가 토큰 없음/만료로 거절했을 때의 오류 코드 */
export const QA_TOKEN_REQUIRED = 'TOKEN_REQUIRED';

type StoredToken = { token: string; expiresAt: number };

/** 저장된 토큰 (없거나 만료됐으면 null) */
export const getQaGuestToken = (no: number | string): string | null => {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + no);
    if (!raw) return null;
    const saved = JSON.parse(raw) as StoredToken;
    if (!saved.token || Date.now() >= saved.expiresAt) {
      sessionStorage.removeItem(KEY_PREFIX + no);
      return null;
    }
    return saved.token;
  } catch {
    return null;
  }
};

export const clearQaGuestToken = (no: number | string) => {
  try {
    sessionStorage.removeItem(KEY_PREFIX + no);
  } catch {
    // 저장소를 못 쓰는 환경이면 무시
  }
};

/** 비회원 요청 헤더 (토큰이 없으면 빈 객체) */
export const qaGuestHeaders = (no: number | string): Record<string, string> => {
  const token = getQaGuestToken(no);
  return token ? { 'X-Qa-Token': token } : {};
};

/**
 * 게시글 비밀번호 확인 → 토큰 저장
 * 실패하면 axios 오류를 그대로 던짐 (message는 qaErrorMessage로 꺼내 쓰기)
 */
export const verifyQaGuest = async (no: number | string, pw: string): Promise<void> => {
  const res = await axiosInstance.post<{ token: string; expiresIn: number }>(`/qa/guest/${no}/verify`, { pw });
  const { token, expiresIn } = res.data;
  try {
    // 서버 만료보다 10초 일찍 만료 처리 (경계에서 실패하지 않게)
    const stored: StoredToken = { token, expiresAt: Date.now() + Math.max(0, expiresIn - 10) * 1000 };
    sessionStorage.setItem(KEY_PREFIX + no, JSON.stringify(stored));
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 못 이어감 — 다시 확인하면 됨
  }
};

/** 서버 오류 응답 {code, message}에서 코드 꺼내기 */
export const qaErrorCode = (err: unknown): string | undefined =>
  (err as { response?: { data?: { code?: string } } })?.response?.data?.code;

/** 서버 오류 응답에서 안내 문구 꺼내기 (없으면 fallback) */
export const qaErrorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
