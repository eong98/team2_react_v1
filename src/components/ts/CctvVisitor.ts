export interface CctvVisitorType {
  no: number;
  cno: number;
  trackId: string;
  intime: string;
  outtime: string | null;
  staytime: number | null;
  state: number;
  cdate: string;
}

/** GET /cctv_visitor/admin/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvVisitorSearchResult {
  content: CctvVisitorType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

/* ---------------------------------------------------------------------
   CctvVisitorList.tsx(관리자, /dbms/cctvvisitor)에서 쓰는 상수/타입.

   ⚠️ STATE(상태값)는 참조 테이블이 없어서, OUTTIME 유무 + STAYTIME(체류시간, 분)
     기준으로 임시 매핑해뒀습니다(0: 입장중, 1: 정상퇴장, 2: 장시간체류).
     실제 코드값이 다르면 아래 STATE_LABELS/STATE_BADGE만 고치면 됩니다
     (매핑에 없는 값은 원본 숫자를 그대로 보여주므로 깨지지 않음).
--------------------------------------------------------------------- */

export const PAGE_SIZE = 10;

// 상태값(STATE)
export const STATE_LABELS: Record<number, string> = {
  0: '입장중',
  1: '정상퇴장',
  2: '장시간체류',
};
export const STATE_BADGE: Record<number, string> = {
  0: 'badge_info',
  1: 'badge_success',
  2: 'badge_warning',
};

export type RowType = CctvVisitorType & { cnt: number };

export interface Filters {
  sno: string; // 매장번호(선택) - CCTV_VISITOR엔 SNO 컬럼이 없어서 CNO가 속한 CCTV의 SNO로 필터링
  cno: string; // CCTV번호(선택)
  state: string; // '' | '0' | '1' | '2'
  keyword: string; // TRACK_ID(AI추적ID) 포함 검색
  dateFrom: string; // yyyy-MM-dd (INTIME/입장시각 기준)
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  sno: '',
  cno: '',
  state: '',
  keyword: '',
  dateFrom: '',
  dateTo: '',
};
