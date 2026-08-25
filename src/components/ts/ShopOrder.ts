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
//
// 정책: PNO(구독권)·CCNT(대수)·PMONTH(기간)는 결제(save) 시점에만 정해지고 이후
// 변경 불가합니다. 결제 후 가능한 액션은 renew(기간 연장)와 cancel(취소)뿐입니다.
// 대수/구독권을 바꾸고 싶으면 취소 후 재구독해야 합니다.

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

export type RowType = ShopOrderTypes & { cnt: number };

export const ORDER_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '정상', className: 'success' },
  1: { label: '만료됨', className: 'info' },
  2: { label: '취소', className: 'danger' },
};

export const PAGE_SIZE = 10;

export interface Filters {
  word: string;
  status: string;
  pname: string;
  pmonth: string;
  sno: string;
  dateType: string;
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
  page: number;
  size: number;
}

/** 신규 구독 결제 요청 — pno/ccnt/pmonth는 여기서만 정해지고 이후 변경 불가 */
export interface ORRequest {
  pno: number;
  mno: number;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
}

export interface LinkShopRequest {
  sno: number;
}

/** 구독 갱신 결과 — 기간 연장 전용(대수/구독권 변경 없음), 요청 시 body 없음 */
export interface RenewResult {
  orderno: string;
  ccnt: number;
  totalprice: number;
  edate: string | null;
}

export interface CancelResult {
  orderno: string;
  usedMonths: number;
  refundMonths: number;
  refundAmount: number;
}

/** 취소 시 예상 환불액 계산 (프론트 대략치, 최종 확정은 서버 응답 기준) */
export function estimateCancelRefund(order: ShopOrderTypes) {
  // 매장 미연결(SDATE 없음) — 아직 이용 시작 전이므로 전액 환불
  if (!order.sdate) {
    return {
      usedMonths: 0,
      refundMonths: order.pmonth,
      refundAmount: order.bprice * order.ccnt * order.pmonth,
    };
  }

  const usedDays = Math.floor((Date.now() - new Date(order.sdate).getTime()) / 86400000);
  const usedMonths = Math.max(1, Math.ceil(usedDays / 30));
  const refundMonths = Math.max(0, order.pmonth - usedMonths);
  const refundAmount = order.bprice * order.ccnt * refundMonths;

  return { usedMonths, refundMonths, refundAmount };
}