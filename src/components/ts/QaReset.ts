/* ---------------------------------------------------------------------
   비회원 문의글 비밀번호 재설정 (이메일 인증번호)
   백엔드 dev.jpa.allimio.qa.reset.QaResetCont

   POST /qa/guest/{no}/reset/request            → { email(가려진 주소), expiresIn(초) }
   POST /qa/guest/{no}/reset/confirm {code, pw} → { message }
   오류는 400/404/429 + { code, message } — 문구는 qaErrorMessage(QaGuestToken.ts)로 꺼냄

   인증번호는 글을 쓸 때 입력한 이메일로 갑니다. 10분 동안 유효하고 5번 틀리면 다시 받아야 합니다.
   같은 글로는 1분에 한 번, 하루 5번까지 요청할 수 있습니다.
--------------------------------------------------------------------- */
import { axiosInstance } from '../../utils/Tool';

export interface QaResetRequested {
  /** 인증번호를 보낸 이메일 (te**@example.com 처럼 가려짐) */
  email: string;
  /** 인증번호 유효 시간(초) */
  expiresIn: number;
}

/** 인증번호 요청 */
export const requestQaReset = async (no: number | string): Promise<QaResetRequested> => {
  const res = await axiosInstance.post<QaResetRequested>(`/qa/guest/${no}/reset/request`);
  return res.data;
};

/** 인증번호 확인 + 새 비밀번호로 변경 */
export const confirmQaReset = async (no: number | string, code: string, pw: string): Promise<void> => {
  await axiosInstance.post(`/qa/guest/${no}/reset/confirm`, { code, pw });
};

/** 새 비밀번호 최소 길이 (서버 QaResetService.PW_MIN_LENGTH와 같게) */
export const QA_RESET_PW_MIN = 4;
