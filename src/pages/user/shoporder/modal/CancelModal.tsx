import { useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance, set_focus } from '../../../../utils/Tool';
import { estimateCancelRefund, type CancelResult, type ShopOrderTypes } from '../../../../components/ts/ShopOrder';
import './changeModal.css';

interface CancelModalProps {
  target: ShopOrderTypes | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

type BankField = 'bankName' | 'accountHolder' | 'accountNo';

// 환불이 있을 때의 필수 항목 — 늘어나면 이 배열에 한 줄만 추가하면 됩니다.
const BANK_REQUIRED_FIELDS: { field: BankField; label: string; id: string }[] = [
  { field: 'bankName', label: '은행명', id: 'cancelBankName' },
  { field: 'accountHolder', label: '예금주명', id: 'cancelAccountHolder' },
  { field: 'accountNo', label: '계좌번호', id: 'cancelAccountNo' },
];

export default function CancelModal({ target, onClose, onSuccess }: CancelModalProps) {
  const [bank, setBank] = useState<Record<BankField, string>>({ bankName: '', accountHolder: '', accountNo: '' });
  const [errors, setErrors] = useState<Partial<Record<BankField, string>>>({});
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const estimate = target ? estimateCancelRefund(target) : null;
  const needsBank = !!estimate && estimate.refundAmount > 0;

  const close = () => {
    setBank({ bankName: '', accountHolder: '', accountNo: '' });
    setErrors({});
    setError('');
    onClose();
  };

  const change = (field: BankField, value: string) => {
    setBank((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    if (!needsBank) return true;
    const newErrors: Partial<Record<BankField, string>> = {};
    let firstErrorId: string | null = null;
    for (const { field, label, id } of BANK_REQUIRED_FIELDS) {
      if (!bank[field].trim()) {
        newErrors[field] = `${label}을(를) 입력해주세요.`;
        if (!firstErrorId) firstErrorId = id;
      }
    }
    setErrors(newErrors);
    if (firstErrorId) {
      set_focus(firstErrorId);
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!target || !estimate || cancelling || !validate()) return;

    setCancelling(true);
    setError('');
    try {
      const res = await axiosInstance.put<CancelResult>(`/shop_order/${target.no}/cancel`, {
        bankName: bank.bankName || undefined,
        accountNo: bank.accountNo || undefined,
        accountHolder: bank.accountHolder || undefined,
      });
      onSuccess(
        `구독이 취소되었습니다.\n사용 개월수 ${res.data.usedMonths.toFixed(2)}개월 · 환불 대상 ${res.data.refundMonths.toFixed(2)}개월\n환불 금액: ${res.data.refundAmount.toLocaleString('ko-KR')}원`,
      );
      close();
    } catch (err) {
      console.error('취소 실패:', err);
      setError('취소 처리 중 오류가 발생했습니다. 구독 종료까지 28일 미만이면 취소할 수 없습니다.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={close}
      titleId="cancelModalTitle"
      title="구독 취소"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={close}>
            닫기
          </button>
          <button type="button" className="btn btn_md btn_danger" disabled={cancelling} onClick={submit}>
            {cancelling ? '처리 중...' : '구독 취소'}
          </button>
        </>
      }
    >
      {target && estimate && (
        <div>
          {/* 취소할 구독 */}
          <div className="chg_current">
            <div className="chg_current_cell">
              <span className="chg_current_label">구독권</span>
              <span className="chg_current_value">{target.pname}</span>
            </div>
            <div className="chg_current_cell">
              <span className="chg_current_label">이용 기간</span>
              <span className="chg_current_value">{target.pmonth}개월</span>
            </div>
            <div className="chg_current_cell">
              <span className="chg_current_label">CCTV</span>
              <span className="chg_current_value">{target.ccnt}대</span>
            </div>
          </div>

          {/* 예상 환불 */}
          <div className="chg_result" style={{ marginTop: 0 }}>
            <div className="chg_result_row">
              <span>사용한 기간</span>
              <strong>{estimate.usedMonths.toFixed(2)}개월</strong>
            </div>
            <div className="chg_result_row">
              <span>환불 대상 기간</span>
              <strong>{estimate.refundMonths.toFixed(2)}개월</strong>
            </div>
            <div className="chg_result_row chg_result_total is_refund">
              <span>예상 환불액</span>
              <strong>{estimate.refundAmount.toLocaleString('ko-KR')}<small>원</small></strong>
            </div>
          </div>

          {/* 환불 계좌 — 환불액이 있을 때만 */}
          {needsBank && (
            <div className="chg_bank" style={{ marginTop: 18 }}>
              <div className="chg_field_head">
                <span className="chg_label">환불 계좌</span>
                <span className="chg_hint">환불액을 받을 계좌</span>
              </div>
              <div className="chg_bank_grid">
                <div className="chg_bank_cell">
                  <label className="chg_bank_label" htmlFor="cancelBankName">은행명</label>
                  <input
                    id="cancelBankName"
                    type="text"
                    className={`form_input ${errors.bankName ? 'is_error' : ''}`}
                    placeholder="예: 국민은행"
                    value={bank.bankName}
                    onChange={(e) => change('bankName', e.target.value)}
                  />
                  {errors.bankName && <div className="form_hint error">{errors.bankName}</div>}
                </div>
                <div className="chg_bank_cell">
                  <label className="chg_bank_label" htmlFor="cancelAccountHolder">예금주명</label>
                  <input
                    id="cancelAccountHolder"
                    type="text"
                    className={`form_input ${errors.accountHolder ? 'is_error' : ''}`}
                    value={bank.accountHolder}
                    onChange={(e) => change('accountHolder', e.target.value)}
                  />
                  {errors.accountHolder && <div className="form_hint error">{errors.accountHolder}</div>}
                </div>
                <div className="chg_bank_cell is_wide">
                  <label className="chg_bank_label" htmlFor="cancelAccountNo">계좌번호</label>
                  <input
                    id="cancelAccountNo"
                    type="text"
                    inputMode="numeric"
                    className={`form_input mono ${errors.accountNo ? 'is_error' : ''}`}
                    placeholder="숫자만 입력"
                    value={bank.accountNo}
                    onChange={(e) => change('accountNo', e.target.value)}
                  />
                  {errors.accountNo && <div className="form_hint error">{errors.accountNo}</div>}
                </div>
              </div>
            </div>
          )}

          <div className="chg_notice">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16.5v.5" />
            </svg>
            <span>취소한 구독권은 다시 사용할 수 없습니다. 환불액은 실제 처리 시점 기준으로 계산되어 예상액과 조금 다를 수 있습니다.</span>
          </div>

          {error && <div className="form_hint error" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      )}
    </Modal>
  );
}
