export interface UpdateHistory {
  /** 업데이트 로그 번호 */
  no: number;

  mno: number | null;

  mnno: number | null;

  /** 변경한 항목 */
  changedColumn: string;

  /** 변경 전 값 */
  oldValue: string;

  /** 변경 후 값 */
  newValue: string;

  /** 변경 일시 */
  changeDate: string;

  /** 변경한 관리자 번호 */
  updtMnno: number| null;
}