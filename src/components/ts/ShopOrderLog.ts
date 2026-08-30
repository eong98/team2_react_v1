// NO           NUMBER(10)                  NOT NULL, -- 로그 고유번호 (PK)
// ORDERNO      VARCHAR2(30)                NOT NULL, -- 구독 내역 번호 (FK)
// MNO          NUMBER(10)                  NOT NULL, -- 회원번호
// ACTION       NUMBER(1)                   NOT NULL, -- 이벤트 종류 (0 결제 / 1 매장연결 / 2 갱신 / 3 취소)
// SNO          NUMBER(7)                       NULL, -- 관련 매장번호 (매장연결일 때만)
// BEFORE_EDATE VARCHAR2(30)                    NULL, -- 변경 전 종료일 (갱신일 때)
// AFTER_EDATE  VARCHAR2(30)                    NULL, -- 변경 후 종료일
// AMOUNT       NUMBER(12)                      NULL, -- 관련 금액 (결제액/환불액)
// MEMO         VARCHAR2(500)                   NULL, -- 부가 설명
// CDATE        VARCHAR2(30)                NOT NULL, -- 발생일시

export interface ShopOrderLogTypes {
  no: number;
  ono: string;
  mno: number;
  action: number;
  sno: number | null;
  beforeEdate: string | null;
  afterEdate: string | null;
  amount: number | null;
  memo: string | null;
  cdate: string;
}

/** 목록에 표시할 때 전체 건수 기준 순번(cnt)을 붙인 행 타입 (ShopOrderList.tsx와 동일 패턴) */
export type RowType = ShopOrderLogTypes & { cnt: number };

// ACTION (이벤트 종류)
export const LOG_ACTION_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '신규결제', className: 'orange' },
  1: { label: '매장연결', className: 'info' },
  2: { label: '갱신', className: 'success' },
  3: { label: '취소', className: 'danger' },
  4: { label: '승인대기', className: 'danger' },
};

export interface Filters {
  sno: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  sno: '',
  action: '',
  dateFrom: '',
  dateTo: '',
};

export const PAGE_SIZE = 6;

/** GET /shop_order_log/mno/{mno}/search, /shop_order_log/list/admin 응답 형태 (PageResponse) */
export interface LogSearchResult {
  content: ShopOrderLogTypes[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}