// NO             NUMBER(10)                  NOT NULL, -- 환불 고유번호 (PK)
// ONO            VARCHAR2(30)                NOT NULL, -- 구독 내역 번호 (FK)
// PAYMENTNO      NUMBER(10)                      NULL, -- 연결된 환불 결제기록 (FK)
// MNO            NUMBER(10)                  NOT NULL, -- 회원번호
// BANK_NAME      VARCHAR2(50)                NOT NULL, -- 은행명
// ACCOUNT_NO     VARCHAR2(50)                NOT NULL, -- 계좌번호
// ACCOUNT_HOLDER VARCHAR2(50)                NOT NULL, -- 예금주명
// AMOUNT         NUMBER(12)                  NOT NULL, -- 환불 금액
// STATUS         NUMBER(1)       DEFAULT 0   NOT NULL, -- 처리상태 (0 대기 / 1 완료 / 2 반려)
// CDATE          VARCHAR2(30)                NOT NULL, -- 등록일시
// UDATE          VARCHAR2(30)                    NULL, -- 처리 완료/변경일시

export interface RefundAccount {
  bankName: string;
  accountNo: string;
  accountHolder: string;
}

export const EMPTY_ACCOUNT: RefundAccount = { bankName: '', accountNo: '', accountHolder: '' };

export const REFUND_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '대기', className: 'info' },
  1: { label: '완료', className: 'success' },
  2: { label: '반려', className: 'danger' },
};

export interface ShopRefundTypes {
  no: number;
  ono: string;
  paymentno: number | null;
  mno: number;
  bankName: string;
  accountNo: string;
  accountHolder: string;
  amount: number;
  status: number;
  cdate: string;
  udate?: string;
}