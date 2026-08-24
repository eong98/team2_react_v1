// ORDERNO     VARCHAR2(30)                NOT NULL, -- 구독 내역 랜덤번호 (PK)
// MNO         NUMBER(10)                  NOT NULL, -- 회원번호 (FK)
// PNO         NUMBER(7)                   NOT NULL, -- 구독권(상품) 번호 (FK -> SHOP_PLAN.NO)
// SNO         NUMBER(7)                       NULL, -- 매장 번호 (FK -> SHOP.NO), 결제 후 매장 등록시 저장
// PMONTH      NUMBER(2)                   NOT NULL, -- 선택 기간 (6, 12)
// CCNT        NUMBER(2)                   NOT NULL, -- 구독시 지정한 CCTV 개수
// BPRICE      NUMBER(12,2)                NOT NULL, -- CCTV 1대당 기본단가 (결제시점 스냅샷)
// TOTALPRICE  NUMBER(12)                  NOT NULL, -- 총 결제 금액 (원)
// STATUS      NUMBER(1)       DEFAULT 0   NOT NULL, -- 구독 상태 (0: 정상, 1: 만료됨, 2: 취소)
// SDATE       VARCHAR2(30)                NOT NULL, -- 구독 시작일
// EDATE       VARCHAR2(30)                NOT NULL, -- 구독 종료일
// CDATE       VARCHAR2(30)                NOT NULL, -- 구매일시
// UDATE       VARCHAR2(30)                    NULL, -- 구매 변경일시

export interface ShopOrderTypes {
  orderno: string;
  mno: number;
  pno: number;
  sno: number | null;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
  status: number;
  sdate: string;
  edate: string;
  cdate: string;
  udate?: string;
}

// STATUS (구독 상태)
export const ORDER_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '정상', className: 'success' },
  1: { label: '만료됨', className: 'info' },
  2: { label: '취소', className: 'danger' },
};

export const PAGE_SIZE = 10;

export type RowType = ShopOrderTypes & { cnt: number };

export interface Filters {
  word: string;
  status: string;
  pname: string;
  pmonth: string;
  sno: string;
  dateType: string; // '' | 'sdate' | 'edate' | 'cdate'
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  word: '',
  status: '',
  pname: '',
  pmonth: '',
  sno: '',
  dateType: '',
  dateFrom: '',
  dateTo: '',
};

export interface OrderSearchResult {
  content: ShopOrderTypes[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}


// 신규 구독 결제 요청
export interface ORRequest {
  pno: number;
  mno: number;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
  sdate: string;
  edate: string;
}

// 매장 선택 확정 요청
export interface LinkShopRequest {
  sno: number;
}

// 구독 갱신 요청 (newCcnt 생략 시 동일조건 연장)
export interface RenewRequest {
  newCcnt?: number;
}

export interface RenewResult {
  orderno: string;
  ccnt: number;
  totalprice: number;
  edate: string;
  extraCharge: number;
  refundAmount: number;
}

// 구독 취소 응답 — 환불 계산 결과
export interface CancelResult {
  orderno: string;
  usedMonths: number;
  refundMonths: number;
  refundAmount: number;
}
