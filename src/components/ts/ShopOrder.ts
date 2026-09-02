export interface ShopOrderTypes {
  no: string;
  mno: number;
  pno: number;
  sno: number | null;
  sname?: string;
  pname?: string;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
  status: number;
  sdate: string | null;
  edate: string | null;
  cdate: string;
  udate?: string;


  minCcnt?: number | null;
  maxCcnt?: number | null;
  pendingPno?: number | null;
  pendingPmonth?: number | null;
  pendingCcnt?: number | null;
  pendingBprice?: number | null;
  pendingTotalprice?: number | null;
  pendingEdate?: string | null;
}

/* 구독 상태 */
export const ORDER_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '연결대기', className: 'wait' }, /* 매장 매칭 전 */
  1: { label: '정상', className: 'success' },
  2: { label: '만료됨', className: 'orange' },
  3: { label: '취소', className: 'danger' },
};

export type RowType = ShopOrderTypes & { cnt: number, activeCount?: number };

export const PAGE_SIZE = 6;

/* 검색필터 */
export interface Filters {
  word: string;
  status: string;
  pname: string;
  pmonth: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  word: '',
  status: '',
  pname: '',
  pmonth: '',
  dateFrom: '',
  dateTo: '',
};
/**
 * API 응답형태 타입 정의
 * 
 */

/* 검색필터 */
export interface OrderSearchResult {
  content: ShopOrderTypes[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/** 등록 (구독권 구매) */
export interface ORRequest {
  pno: number;
  mno: number;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
  pmethod: number; // 0 카드 / 1 계좌이체 / 2 토스페이 (ShopPayment.ts)
}

/* 매장연결 */
export interface LinkShopRequest {
  sno: number;
}

/** 갱신 */
export interface RenewResult {
  no: string;
  ccnt: number;
  totalprice: number;
  edate: string | null;
}

/* 취소 */
export interface CancelResult {
  no: string;
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



/**
 * 
 *  -------------------구독권 변경 로직 -------------------
 * 
 */

/** 구독권 변경 신청 요청 (기간/대수 중 바꿀 것만 채워서 보냄) */
export interface ChangeRequest {
  pmonth?: number;
  ccnt?: number;
}

/** 구독권 변경 예상 결과 미리보기 */
export interface ChangePreview {
  pname: string;
  bprice: number;
  extraCharge: number;
  refundAmount: number;
  totalprice: number;
  edate: string;
  requiresApproval: boolean;
}

/** 구독권 변경 신청 결과 */
export interface ChangeResult {
  no: string;
  pending: boolean;
  applied: ShopOrderTypes | null;
}

/** 관리자용 — 구독권 변경 승인/반려 요청 */
export interface ChangeApprovalRequest {
  approve: boolean;
}





/**
 * 시작일부터 오늘까지의 경과 일수를 계산합니다.
 * @param {string | Date} startDate - 시작일 (예: "2026-01-01" 또는 Date 객체)
 * @returns {number} 오늘까지의 일수 (당일 = 1일, 1일 경과 = 2일)
 */
export const getDaysFromStart = (startDate: string) => {
  if (!startDate) return 0;

  const start = new Date(startDate);
  const today = new Date();

  // 시간을 00:00:00으로 맞춰 순수 날짜(일수) 차이만 계산
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 당일을 1일로 취급하려면 + 1, 순수 경과 일수만 구하려면 diffDays 반환
  return diffDays + 1; 
};