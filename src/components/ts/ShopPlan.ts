// NO          NUMBER(7)                   NOT NULL, -- 구독권번호 (PK)
// PNAME       VARCHAR2(100)               NOT NULL, -- 구독권명
// PMONTH      NUMBER(2)                   NOT NULL, -- 이용기간 (6, 12)
// BPRICE      NUMBER(12, 2)               NOT NULL, -- CCTV 1대당 기본단가(개월수)
// DESCRIPTION VARCHAR2(500)                   NULL, -- 구독권설명
// ISSELL      CHAR(1)         DEFAULT 'N' NOT NULL, -- 결제한 구독권 (구독권 변경시 화면표시용)
// CDATE       VARCHAR2(30)                NOT NULL, -- 등록일

export interface ShopPlanTypes {
  no: number;
  pname: string;
  pmonth: number;
  bprice: number;
  description: string;
  issell: string;
  cdate: string;
}