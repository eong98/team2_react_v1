// 결제수단 (SHOP_PAYMENT.PMETHOD)
export const PMETHOD_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '카드', className: 'info' },
  1: { label: '계좌이체', className: 'success' },
  2: { label: '토스페이', className: 'info' },
};

export const PMETHOD_ICON: Record<number, string> = {
  0: '💳',
  1: '🏦',
  2: '📱',
};

// 결제 상태 (SHOP_PAYMENT.PSTATUS)
export const PSTATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '결제완료', className: 'success' },
  1: { label: '결제실패', className: 'danger' },
  2: { label: '결제취소', className: 'orange' },
};

export interface ShopPaymentTypes {
  no: number;
  ono: string;
  mno: number;
  price: number;
  pmethod: number | null;
  pstatus: number;
  cdate: string;
  udate?: string;
}

export type RowType = ShopPaymentTypes & { cnt: number };

export const PAGE_SIZE = 10;

export interface Filters {
  pmethod: string;
  pstatus: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  pmethod: '',
  pstatus: '',
  dateFrom: '',
  dateTo: '',
};

/** GET /shop_payment/mno/{mno}/search, /shop_payment/list/admin 응답 형태 (PageResponse) */
export interface PaymentSearchResult {
  content: ShopPaymentTypes[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}