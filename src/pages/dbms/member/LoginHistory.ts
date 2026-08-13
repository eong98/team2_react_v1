// src/pages/dbms/member/LoginHistory.ts
export interface LoginHistory {
  /** 로그인 기록 번호 */
  no: number;

  /** 로그인 시도 아이디 */
  loginId: string;

  /** 로그인 시도 일시 */
  loginDate: string;

  /** 로그인 시도 결과 (0: 실패, 1: 성공) */
  loginResult: number;

  /** 로그인 시도 유형 (0: 관리자, 1: 회원) */
  loginType: number;

  /** 회원 번호 (회원 로그인 시도인 경우에만 값 있음) */
  mno: number | null;

  /** 관리자 번호 (관리자 로그인 시도인 경우에만 값 있음) */
  mnno: number | null;

  /** 실패 코드 */
  failCode: string;

  /** 실패 사유 */
  failReason: string | null;

  /** 로그인 시도 IP주소 */
  ipAddr: string | null;
}