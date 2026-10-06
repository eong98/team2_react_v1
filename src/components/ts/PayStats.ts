/* ---------------------------------------------------------------------
   /dbms/paystats(구독권 결제 통계) 타입/상수.
   백엔드 dev.jpa.allimio.paystats.PayStatsDTO(record)와 1:1로 맞춰져 있습니다.

   API (PayStatsCont, /pay_stats) - 관리자(ROLE_MANAGER) 쿠키 로그인 필요
   GET /pay_stats/stats?days=   → PayStats
--------------------------------------------------------------------- */

export interface PayDailyPoint {
  label: string; // yyyy-MM-dd
  amount: number; // 결제완료 금액(원)
  count: number; // 결제완료 건수
}

export interface PayGroupAmount {
  key: string; // 구독권번호 / 결제수단 코드 / 구독기간(개월)
  label: string; // 화면 표시 이름
  amount: number;
  count: number;
}

export interface PayRecent {
  no: number;
  cdate: string;
  price: number;
  pmethod: number;
  pstatus: number; // 0 결제완료 / 1 결제실패 / 2 결제취소
  pname: string | null;
  pmonth: number | null;
  ccnt: number | null;
  mname: string | null;
}

export interface PaySummary {
  payAmount: number;
  payAmountPrev: number;
  payCount: number;
  payCountPrev: number;
  failCount: number;
  cancelCount: number;
  refundAmount: number;
  refundCount: number;
  refundPending: number;
  activeOrders: number;
  waitingOrders: number;
}

export interface PayStats {
  days: number;
  from: string;
  to: string;
  summary: PaySummary;
  daily: PayDailyPoint[];
  byPlan: PayGroupAmount[];
  byMethod: PayGroupAmount[];
  byMonth: PayGroupAmount[];
  recent: PayRecent[];
}

/** 결제 상태 배지 (SHOP_PAYMENT.PSTATUS) */
export const PAY_STATUS_LABELS: Record<number, string> = { 0: '결제완료', 1: '결제실패', 2: '결제취소' };
export const PAY_STATUS_BADGE: Record<number, string> = { 0: 'badge_success', 1: 'badge_danger', 2: 'badge_warning' };

/** 차트 색상 - 매출은 green(primary) 한 가지 */
export const PAY_COLOR = '#33D68A'; // --green-500 (--primary)

/** 금액 표시 - 1,320,000원 */
export const won = (v: number) => `${v.toLocaleString()}원`;

/** 차트 축용 짧은 금액 - 1,320,000 → 132만 / 9,000 → 9천 */
export const shortWon = (v: number) => {
  if (v >= 100_000_000) return `${Math.round(v / 10_000_000) / 10}억`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}천`;
  return String(v);
};
