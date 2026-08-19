/** 백엔드 AttachDTO와 1:1로 매칭되는 응답 타입 */
export interface AttachType {
  /* 첨부파일 고유번호 */
  no: number;

  /* 게시판번호를 조회할 테이블 이름(해당 이름으로 폴더명 생성됨) */
  tname: string;
  /* 게시판 번호 */
  tno?: number;
  
  /* 게시글 번호 : 게시글 등록시 전달 */
  bno: number;
  /** 0: 이미지, 1: 일반 파일 */
  type: 0 | 1;
  /** 원본 파일명 */
  name: string;
  /** 파일 크기 (byte) */
  fsize: number;
  /** 서버 저장 파일명 */
  sname: string;
  /** 이미지 썸네일 파일명 (일반 파일이면 빈 문자열) */
  thumb: string;
  /** 상대 저장 경로 — /attach/storage/{tname}/images 또는 /attach/storage/{tname}/files */
  purl: string;
  cdate: string;
}

/** GET /attach/list/admin 응답 */
export interface AttachSearchResult {
  content: AttachType[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/** 관리자 첨부파일 검색 필터 (searchAllAttach 쿼리 파라미터와 매칭) */
export interface Filters {
  word: string;
  tno?: string;
  type: string;
  cdate: string;
}

export const EMPTY_FILTERS: Filters = {
  word: '',
  tno: '',
  type: '',
  cdate: '',
};

export const ATTACH_TYPE_LABEL: Record<0 | 1, string> = {
  0: '이미지',
  1: '파일',
};

/** 
 * 첨부파일을 등록하려는 테이블을 아래 구조에 맞게 추가해주세요.
 * 
 * name : 메뉴명 
 * table: SQL/메뉴관리에 등록한 실제 테이블명
 * 
*/
export const ATTACH_BOARD_LABEL: Record<number, { name: string; table: string }> = {
  0: { name: '문의사항', table: 'QA'},
  1: { name: '공지사항', table: 'NOTICE'},
  2: { name: 'CCTV 이슈', table: 'CCTV_ISSUE'},
};

/** 파일 크기(byte)를 KB/MB 단위 문자열로 변환 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 페이지네이션
export const PAGE_SIZE = 6;