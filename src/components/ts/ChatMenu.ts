export interface ChatMenuTypes {
  no: number;
  pno: number | null;
  step: number;
  label: string;
  answer: string | null;
  userag: string; // Y/N
  vseq: number;
  useyn: string; // Y/N
  cdate: string;
  hasChildren?: boolean;
}

/** 메뉴 등록/수정 요청 (관리자용) */
export interface ChatMenuRequest {
  pno: number | null;
  step: number;
  label: string;
  answer: string | null;
  userag: string;
  vseq: number;
  useyn: string;
}