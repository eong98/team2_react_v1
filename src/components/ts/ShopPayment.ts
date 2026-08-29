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

export interface ShopRefundTypes {
  no: number;
  ono: string;
  pno: number;
  mno: number;
  bankName: string;
  accountNo: string;
  accountHolder: string;
  amount: number;
  status: number;
  cdate: string;
  udate?: string;
}

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

export const REFUND_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '환불요청', className: 'wait' },
  1: { label: '환불완료', className: 'success' },
  2: { label: '환불반려', className: 'danger' },
};



export type RowType = ShopPaymentTypes & { cnt: number };

export const PAGE_SIZE = 6;

export interface PayFilters {
  pmethod?: string;
  pstatus?: string; /* 결제 상태 */
  status?: string; /* 환불 상태 */
  sno?: string;
  action?: string; /* 기록 형태 */
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_PAY_FILTERS: PayFilters = {
  pmethod: '',
  pstatus: '',
  status: '',
  sno: '',
  action: '',
  dateFrom: '',
  dateTo: '',
};



/** GET /shop_payment/mno/{mno}/search, /shop_payment/list/admin 응답 형태 (PageResponse) */
export interface SearchResult {
  content: ShopPaymentTypes[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

