/* ---------------------------------------------------------------------
   API 오류를 콘솔에 남길지 판단

   서버가 "없는 글", "권한 없음", "비밀번호 불일치"처럼 예상된 사유로 거절한 요청은
   화면에 안내 문구가 나가므로 콘솔에 다시 찍지 않습니다.
   서버 내부 오류(500번대)나 응답 자체가 없는 경우(서버 꺼짐·네트워크)처럼
   화면 안내만으로는 원인을 알 수 없는 것만 콘솔에 남깁니다.

   ※ 브라우저가 자동으로 찍는 "Failed to load resource: 404" 줄은 코드로 끌 수 없습니다.
--------------------------------------------------------------------- */

/** 화면에서 안내하는 예상된 거절 상태 코드 */
const EXPECTED_STATUS = [400, 403, 404, 409, 429];

/** 서버가 예상된 사유로 거절한 오류인지 */
export const isExpectedError = (err: unknown): boolean => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status !== undefined && EXPECTED_STATUS.includes(status);
};

/** 예상하지 못한 오류일 때만 콘솔에 남김 — 화면에 안내를 띄우는 catch에서 console.error 대신 사용 */
export const logUnexpected = (label: string, err: unknown): void => {
  if (!isExpectedError(err)) console.error(label, err);
};
