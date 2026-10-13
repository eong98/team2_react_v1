// NO       NUMBER(10)                  NOT NULL, -- 공지사항번호 (PK)
// ANO      NUMBER(10)                  NOT NULL, -- 공지사항 작성 회원번호(FK)
// TYPE     NUMBER(1)                   NOT NULL, -- 공지유형 (0: 긴급, 1: 중요, 3: 알림 / 2: 예전 '신규', 지금은 알림으로 표시) — '신규'는 유형이 아니라 오늘 등록된 글 표시
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


// TYPE (공지 유형) — 긴급 · 중요 · 알림 세 가지
// 2번은 예전에 '신규'라는 유형이었습니다. '신규'는 유형이 아니라 "오늘 올라온 글" 표시이므로
// 등록일을 보고(isNoticeNew) 제목 옆에 NEW 표시를 붙이고, 2번으로 저장된 예전 글은 알림으로 보여 줍니다.
export const NOTICE_TYPE_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '긴급', className: 'danger' },
  1: { label: '중요',   className: 'orange' },
  2: { label: '알림', className: 'info' },
  3: { label: '알림', className: 'info' },
};

/** 작성 화면·검색 필터에서 고를 수 있는 유형 (예전 2번은 고르는 목록에 넣지 않음) */
export const NOTICE_TYPE_OPTIONS = Object.entries(NOTICE_TYPE_MAP).filter(([type]) => type !== '2');

/** 등록일(cdate: 'yyyy-MM-dd HH:mm:ss')이 오늘(이 기기 날짜)인지 */
export const isNoticeNew = (cdate?: string | null): boolean => {
  if (!cdate) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return cdate.slice(0, 10) === today;
};

/**
 * 공지 한 건에 보여 줄 유형 배지 목록 (긴급·중요·알림).
 * '신규'는 배지가 아니라 제목 옆 NEW 표시로 보여 줍니다 — isNoticeNew() 와 common.css 의 .new_mark 사용.
 */
export const getNoticeBadges = (notice: { type: number; cdate?: string | null }) => {
  const typeBadge = NOTICE_TYPE_MAP[notice.type];
  return typeBadge ? [typeBadge] : [];
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
  /** 보내지 않음 — 서버가 로그인 토큰에서 관리자번호를 찾음 */
  ano?: number;
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
