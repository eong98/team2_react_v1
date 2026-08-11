export interface CctvIssueType {
  no: number;
  cno: number;
  mno: number | null;
  code: string;
  state: number;
  comnet: string | null;
  reliability: string | null;
  pdate: string | null;
  noticeyn: 'Y' | 'N';
  cdate: string;
}

/** GET /cctv_issue/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvIssueSearchResult {
  content: CctvIssueType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

/* ---------------------------------------------------------------------
   CctvIssueList.tsx에서 쓰는 상수/타입.

   ⚠️ CODE(문제유형코드)/STATE(오탐여부) 값 체계는 참조 테이블이 없어서
     SentinelEye 5대 이상행동(폭행/기물파손/쓰러짐·응급/무단침입/장시간체류) 기준으로
     임시 매핑해뒀습니다. 실제 코드값이 다르면 아래 CODE_LABELS/STATE_LABELS만
     고치면 됩니다 (매핑에 없는 값은 원본 코드/숫자를 그대로 보여주므로 깨지지 않음).
--------------------------------------------------------------------- */

export const PAGE_SIZE = 10;

// 문제유형코드(CODE) - VARCHAR2(2) 라서 2자리 코드로 가정
export const CODE_LABELS: Record<string, string> = {
  '01': '폭행',
  '02': '기물파손',
  '03': '쓰러짐/응급',
  '04': '무단침입',
  '05': '장시간체류',
};

// 오탐여부(STATE) - NUMBER(3,0), 처리 상태 워크플로우로 가정
export const STATE_LABELS: Record<number, string> = {
  0: '미확인',
  1: '정탐',
  2: '오탐',
};
export const STATE_BADGE: Record<number, string> = {
  0: 'badge_warning',
  1: 'badge_danger',
  2: 'badge_neutral',
};

export type RowType = CctvIssueType & { cnt: number };

export interface Filters {
  cno: string;
  code: string;
  state: string; // '' | '0' | '1' | '2' ...
  noticeyn: string; // '' | 'Y' | 'N'
  keyword: string; // comnet(상황설명) 포함 검색
  dateFrom: string; // yyyy-MM-dd
  dateTo: string; // yyyy-MM-dd
}

export const EMPTY_FILTERS: Filters = {
  cno: '',
  code: '',
  state: '',
  noticeyn: '',
  keyword: '',
  dateFrom: '',
  dateTo: '',
};