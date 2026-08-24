// ORDERNO     VARCHAR2(30)                NOT NULL, -- 구독 내역 랜덤번호 (PK)
// MNO         NUMBER(10)                  NOT NULL, -- 회원번호 (FK)
// PNO         NUMBER(7)                   NOT NULL, -- 구독권(상품) 번호 (FK)
// SNO         NUMBER(7)                       NULL, -- 매장번호 (FK), 결제 후 매장 등록시 저장
// PMONTH      NUMBER(2)                   NOT NULL, -- 선택기간 (6, 12)
// CCNT        NUMBER(2)                   NOT NULL, -- CCTV 갯수
// BPRICE      NUMBER(12,2)                NOT NULL, -- CCTV 1대당 기본단가 (결제시점 스냅샷)
// TOTALPRICE  NUMBER(12)                  NOT NULL, -- 결제 금액(원)
// STATUS      NUMBER(1)       DEFAULT 0   NOT NULL, -- 구독상태 (0: 정상, 1: 만료됨, 2: 취소)
// SDATE       VARCHAR2(30)                    NULL, -- 구독 시작일, 매장 연결 확정 시점에 채워짐
// EDATE       VARCHAR2(30)                    NULL, -- 구독 종료일, 매장 연결 확정 시점에 채워짐
// CDATE       VARCHAR2(30)                NOT NULL, -- 구매일시
// UDATE       VARCHAR2(30)                    NULL, -- 구매변경일

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
  sdate: string | null;
  edate: string | null;
  cdate: string;
  udate?: string;
}

/** 목록에 표시할 때 전체 건수 기준 순번(cnt)을 붙인 행 타입 (ShopPlanList.tsx와 동일 패턴) */
export type RowType = ShopOrderTypes & { cnt: number };

// STATUS (구독 상태)
export const ORDER_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '정상', className: 'success' },
  1: { label: '만료됨', className: 'info' },
  2: { label: '취소', className: 'danger' },
};

export const PAGE_SIZE = 10;

// 목록 검색 필터
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

/** GET /shop_order/mno/{mno}/search, /shop_order/list/admin 응답 형태 (PageResponse<ShopOrderTypes>) */
export interface OrderSearchResult {
  content: ShopOrderTypes[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

/** 신규 구독 결제 요청 — sdate/edate 없음 (매장 연결 시점에 서버가 확정) */
export interface ORRequest {
  pno: number;
  mno: number;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
}

/** 매장 선택 확정 요청 */
export interface LinkShopRequest {
  sno: number;
}

/** 환불계좌 정보 — 구독 취소, CCTV 대수 감소 환불 시 공통 사용 */
export interface RefundAccount {
  bankName: string;
  accountNo: string;
  accountHolder: string;
}

export const EMPTY_ACCOUNT: RefundAccount = {
  bankName: '', 
  accountNo: '', 
  accountHolder: '' 
};


/** 구독 취소 요청 — 환불 대상(환불금액>0)일 때 계좌 정보 필수 */
export interface CancelRequest {
  refundAccount?: RefundAccount;
}

/**
 * 구독 갱신/변경 요청.
 * extendPeriod=true → "갱신"(기간 연장, 대수 변경 시 전체 이용기간 기준 계산).
 * false/생략 → "변경"(기간 그대로, 대수 변경 시 남은 기간만 일할 계산).
 * refundAccount는 대수를 줄여서 환불이 발생할 때만 필요.
 */
export interface RenewRequest {
  newCcnt?: number;
  extendPeriod?: boolean;
  refundAccount?: RefundAccount;
}

/** 구독 갱신/변경 결과 */
export interface RenewResult {
  orderno: string;
  ccnt: number;
  totalprice: number;
  edate: string | null;
  extraCharge: number;
  refundAmount: number;
}

/** 구독 취소 결과 — 환불 계산 포함 */
export interface CancelResult {
  orderno: string;
  usedMonths: number;
  refundMonths: number;
  refundAmount: number;
}


/** 취소 시 예상 환불액 계산 (프론트 대략치, 최종 확정은 서버 응답 기준) */
export function estimateCancelRefund(order: ShopOrderTypes) {
  if (!order.sdate) return { usedMonths: 0, refundMonths: 0, refundAmount: 0 };

  const usedDays = Math.floor((Date.now() - new Date(order.sdate).getTime()) / 86400000);
  const usedMonths = Math.max(1, Math.ceil(usedDays / 30));
  const refundMonths = Math.max(0, order.pmonth - usedMonths);
  const refundAmount = order.bprice * order.ccnt * refundMonths;

  return { usedMonths, refundMonths, refundAmount };
}

/** 대수 변경 시 예상 추가결제/환불액 계산 (프론트 대략치, 최종 확정은 서버 응답 기준) */
export function estimateRenewAmount(order: ShopOrderTypes, newCcnt: number, extendPeriod: boolean) {
  const diff = newCcnt - order.ccnt;
  if (diff === 0) return { extraCharge: 0, refundAmount: 0 };

  let months = order.pmonth;
  if (!extendPeriod && order.edate) {
    const daysLeft = Math.floor((new Date(order.edate).getTime() - Date.now()) / 86400000);
    months = daysLeft <= 0 ? 1 : Math.max(1, Math.ceil(daysLeft / 30));
  }

  const amount = order.bprice * Math.abs(diff) * months;
  return diff > 0 ? { extraCharge: amount, refundAmount: 0 } : { extraCharge: 0, refundAmount: amount };
}