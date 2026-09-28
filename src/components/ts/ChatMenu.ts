export interface ChatMenuTypes {
  no: number;
  pno: number | null;
  step: number;
  label: string;
  answer: string | null;
  vseq: number;
  useyn: string; // Y/N
  cdate: string;
  aiyn: string; // Y/N — AI관리대상 여부 (Y: AI생성, N: 관리자직접등록)
  hasChildren?: boolean;
}

/** 메뉴 등록/수정 요청 (관리자용) — aiyn은 서버가 알아서 처리하므로 요청에 없음 */
export interface ChatMenuRequest {
  pno: number | null;
  step: number;
  label: string;
  answer: string | null;
  vseq: number;
  useyn: string;
}