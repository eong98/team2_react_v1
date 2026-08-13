// NO       NUMBER(10)                  NOT NULL, -- 공지사항번호 (PK)
// ANO      NUMBER(10)                  NOT NULL, -- 공지사항 작성 회원번호(FK)
// TYPE     NUMBER(1)                   NOT NULL, -- 공지유형 (0: 긴급, 1: 중요, 2: 알림, 3: 신규)
// TITLE    VARCHAR2(200)               NOT NULL, -- 제목
// CONTENT  CLOB                        NOT NULL, -- 내용
// CDATE    VARCHAR2(30)                NOT NULL, -- 등록일
// PW       VARCHAR2(300)               NOT NULL, -- 게시글 비밀번호
// VCNT     NUMBER(10,0) DEFAULT 0          NULL, -- 조회수
// FIXYN    CHAR(1)      DEFAULT 'N'    NOT NULL, -- 상단 고정여부 (Y/N)
// FILEYN   CHAR(1)      DEFAULT 'N'        NULL, -- 첨부파일 존재여부 (Y/N)
// VMODE    CHAR(1)      DEFAULT 'Y'    NOT NULL, -- 출력모드 (Y/N)
// VSEQ     NUMBER(5)                   NOT NULL, -- 출력순서
// ISDEL    CHAR(1)      DEFAULT 'N'        NULL, -- 삭제여부(Y/N)
// DDATE    VARCHAR2(30)                    NULL, -- 삭제일시


export interface NoticeTypes {
  no: number;
  ano: number;
  type: number;
  
  title: string;
  content: string;
  cdate: string;
  pw: string;

  vcnt: number;
  fixyn: string;
  fileyn: string;
  vmode: string;
  vseq?: number;

  isdel?: string;
  ddate?: string;
}


// TYPE (공지 유형)
export const NOTICE_TYPE_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '긴급', className: 'danger' },
  1: { label: '중요',   className: 'orange' },
  2: { label: '신규', className: 'success' },
  3: { label: '알림', className: 'info' },
};


// 페이지네이션
export const PAGE_SIZE = 6;

// 검색필터 
export interface Filters {
  keyword: string; /* 검색어로 검색 (유형,제목,내용,답변내용) */
  type: string; /* 공지유형으로 검색 0,1,2... */
  fix?: string; /* 고정여부로 검색 */
  vmode?: string; /* 공개여부로 검색 */
}

export const EMPTY_FILTERS: Filters = {
  keyword: '',
  type: '',
  fix: '',
  vmode: '',
};


/**
 * API 응답형태 타입 정의
 * 
 */

/* 검색필터 */
export interface NoticeSearchResult {
  content: NoticeTypes[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

/* 등록 */
export interface NCRequest {  
  ano: number;
  type: number;
  title: string;
  content: string;
  cdate: string;
  pw: string;
  fixyn?: string;
  fileyn?: string;
  vmode: string;
  vseq?: number;
}
