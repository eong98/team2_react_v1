// NO          NUMBER(10)                  NOT NULL, -- 문의사항 번호
// MNO         NUMBER(5,0)                   NOT NULL, -- 문의하는 회원번호(FK)
// TYPE        NUMBER(7)                   NOT NULL, -- 0: 기타, 1: 관제신청, 2: 영상요청, 3: 장비장애
// TITLE       VARCHAR2(200)               NOT NULL, -- 문의제목
// CONTENT     CLOB                        NOT NULL, -- 문의내용
// CDATE       VARCHAR2(30)                NOT NULL, -- 등록일
// PW          VARCHAR2(300)               NOT NULL, -- 문의글 비밀번호
// STATUS      NUMBER(1)   DEFAULT 0       NOT NULL, -- 문의답변 상태 (0: 답변대기, 1: 확인중, 2:답변완료)
// VMODE       CHAR(1)     DEFAULT 'N'     NOT NULL, -- 비밀글 여부(Y/N)
// VSEQ        NUMBER(5)                       NULL, -- 자주묻는 질문용 정렬순서
// ANO         NUMBER(10)                       NULL, -- 답변자 고유번호
// ANSWER      CLOB                            NULL, -- 답변 내용
// ADATE       VARCHAR2(30)                    NULL, -- 답변 등록일
// ISDEL       CHAR(1)     DEFAULT 'N'         NULL, -- 삭제여부(Y/N)
// DDATE       VARCHAR2(30)                    NULL, -- 삭제일시

export interface QaTypes {
  no: number;
  mno: number;
  type: number;
  
  title: string;
  content: string;
  cdate: string;
  pw: string;
  status: number;
  vmode: string;
  
  ano?: number;
  answer?: string;
  adate?: string;
  vseq?: string;

  isdel?: string;
  ddate?: string;

  isfaq: string;
}

// 2. TYPE (접수 유형) 매핑 상수 & 드롭다운 옵션
export const QA_TYPE_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '기타', className: 'neutral_30' },
  1: { label: '관제신청',   className: 'badge_success' },
  2: { label: '영상요청', className: 'badge_info' },
  3: { label: '장비장애', className: 'badge_warning' },
  
};

export const QA_TYPE_OPTIONS = [
  { value: 0, label: '기타' },
  { value: 1, label: '관제신청' },
  { value: 2, label: '영상요청' },
  { value: 3, label: '장비장애' },
];

// 3. STATUS (답변 상태) 매핑 상수 & 배지 스타일
export const QA_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '답변대기', className: 'neutral_30' },
  1: { label: '확인중',   className: 'check' },
  2: { label: '답변완료', className: 'badge_success' },
};


export type TabKey = 'my' | 'faq' | 'qa';

export interface FaqCRequest {
  ano: number;
  type: number;
  title: string;
  content: string;
  answer?: string;
  cdate: string;
  pw: string;
  vseq?: number;
}

export interface QCRequest {
  mno: number;
  type: number;
  title: string;
  content: string;
  cdate: string;
  pw: string;
  vmode: string;
}

export interface QARequest {
  ano: number;
  answer?: string;
  // adate: string;
}
