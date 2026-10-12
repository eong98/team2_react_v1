import { useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance, set_focus } from '../../../../utils/Tool';
import { PMETHOD_MAP, PMETHOD_ICON } from '../../../../components/ts/ShopPayment';
import type { ShopOrderTypes } from '../../../../components/ts/ShopOrder';
import type { ChangePreview, ChangeRequest, ChangeResult } from '../../../../components/ts/ShopOrderPending';
import './changeModal.css';

interface ChangeConfirmModalProps {
  open: boolean;
  target: ShopOrderTypes;
  pmonth: number;
  ccnt: number;
  preview: ChangePreview;
  requiresApproval: boolean;
  onBack: () => void; // 이전 모달로 돌아가기
  onClose: () => void; // 전체 닫기
  onSuccess: (message: string) => void;
}

type BankField = 'bankName' | 'accountNo' | 'accountHolder';
type BankErrors = Partial<Record<BankField, string>>;

// 필수 항목 — 다른 폼(QaForm 등)과 같은 방식: 전부 검사해서 항목마다 오류를 표시하고, 첫 오류 항목으로 포커스
const BANK_REQUIRED_FIELDS: { field: BankField; label: string; id: string }[] = [
  { field: 'bankName', label: '은행명', id: 'confirmBankName' },
  { field: 'accountHolder', label: '예금주명', id: 'confirmAccountHolder' },
  { field: 'accountNo', label: '계좌번호', id: 'confirmAccountNo' },
];

export default function ChangeConfirmModal({
  open,
  target,
  pmonth,
  ccnt,
  preview,
  requiresApproval,
  onBack,
  onClose,
  onSuccess,
}: ChangeConfirmModalProps) {
  const [pmethod, setPmethod] = useState<0 | 1 | 2>(0);
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(''); // 서버 요청 실패 안내
  const [errors, setErrors] = useState<BankErrors>({}); // 입력 항목별 오류

  const needsPayment = preview.extraCharge > 0;
  const needsBank = requiresApproval || preview.refundAmount > 0;

  const bankValues: Record<BankField, string> = { bankName, accountNo, accountHolder };

  /** 환불 계좌 필수 항목 검사 — 전부 검사해 항목마다 오류 표시, 포커스는 첫 오류 항목으로 */
  const validate = () => {
    if (!needsBank) return true;

    const newErrors: BankErrors = {};
    let firstErrorId: string | null = null;
    for (const { field, label, id } of BANK_REQUIRED_FIELDS) {
      if (!bankValues[field].trim()) {
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

  /** 입력하면 그 항목의 오류 표시를 지움 */
  const clearError = (field: BankField) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setError('');
    try {
      const request: ChangeRequest = {
        ono: target.no,
        pmonth,
        ccnt,
        pmethod: needsPayment ? pmethod : null,
        bankName: needsBank ? bankName : null,
        accountNo: needsBank ? accountNo : null,
        accountHolder: needsBank ? accountHolder : null,
      };
      const res = await axiosInstance.post<ChangeResult>('/shop_order_pending', request);

      onSuccess(
        res.data.pending
          ? '구독권 변경이 신청되었습니다.\nCCTV 대수 변경은 관리자 확인 후 최종 반영됩니다.'
          : '구독권이 변경되었습니다.',
      );
      onClose();
    } catch (err) {
      console.error('변경 신청 실패:', err);
      setError('변경 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="changeConfirmModalTitle"
      title="결제 정보 입력"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={onBack}>
            이전
          </button>
          <button type="button" className="btn btn_md btn_primary" disabled={submitting} onClick={submit}>
            {submitting ? '처리 중...' : '변경 신청'}
          </button>
        </>
      }
    >
      <div>
        {/* 변경 내용 요약 — 1단계에서 고른 값 */}
        <div className="chg_current" aria-label="변경 내용">
          <div className="chg_current_cell">
            <span className="chg_current_label">적용될 구독권</span>
            <span className="chg_current_value" title={preview.pname}>{preview.pname}</span>
          </div>
          <div className="chg_current_cell">
            <span className="chg_current_label">이용 기간</span>
            <span className="chg_current_value">{pmonth}개월</span>
          </div>
          <div className="chg_current_cell">
            <span className="chg_current_label">CCTV 대수</span>
            <span className="chg_current_value">{ccnt}대</span>
          </div>
        </div>

        <div className="chg_result" style={{ marginTop: 0, marginBottom: 20 }}>
          <div className="chg_result_row"><span>구독 종료일</span><strong>{preview.edate}</strong></div>
          {preview.extraCharge > 0 && (
            <div className="chg_result_row chg_result_total">
              <span>추가 결제 금액</span>
              <strong>{preview.extraCharge.toLocaleString('ko-KR')}<small>원</small></strong>
            </div>
          )}
          {preview.refundAmount > 0 && (
            <div className="chg_result_row chg_result_total is_refund">
              <span>환불 금액</span>
              <strong>{preview.refundAmount.toLocaleString('ko-KR')}<small>원</small></strong>
            </div>
          )}
        </div>

        {/* 결제 수단 — 추가 결제가 있을 때만 */}
        {needsPayment && (
          <div className="chg_field">
            <div className="chg_field_head">
              <span className="chg_label" id="confirmPmethodLabel">결제 수단</span>
            </div>
            <div className="chg_pay" role="radiogroup" aria-labelledby="confirmPmethodLabel">
              {[0, 1, 2].map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={pmethod === m}
                  className={`chg_seg_btn chg_pay_btn${pmethod === m ? ' active' : ''}`}
                  onClick={() => setPmethod(m as 0 | 1 | 2)}
                >
                  <span className="chg_pay_icon" aria-hidden="true">{PMETHOD_ICON[m]}</span>
                  {PMETHOD_MAP[m].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 환불 계좌 — 승인이 필요한 변경이거나 환불이 있을 때 */}
        {needsBank && (
          <div className="chg_bank">
            <div className="chg_field_head">
              <span className="chg_label">환불 계좌</span>
              <span className="chg_hint">환불이 생길 수 있어 필요합니다</span>
            </div>
            <div className="chg_bank_grid">
              <div className="chg_bank_cell">
                <label className="chg_bank_label" htmlFor="confirmBankName">은행명</label>
                <input
                  id="confirmBankName"
                  type="text"
                  className={`form_input ${errors.bankName ? 'is_error' : ''}`}
                  placeholder="예: 국민은행"
                  value={bankName}
                  onChange={(e) => { setBankName(e.target.value); clearError('bankName'); }}
                />
                {errors.bankName && <div className="form_hint error">{errors.bankName}</div>}
              </div>
              <div className="chg_bank_cell">
                <label className="chg_bank_label" htmlFor="confirmAccountHolder">예금주명</label>
                <input
                  id="confirmAccountHolder"
                  type="text"
                  className={`form_input ${errors.accountHolder ? 'is_error' : ''}`}
                  value={accountHolder}
                  onChange={(e) => { setAccountHolder(e.target.value); clearError('accountHolder'); }}
                />
                {errors.accountHolder && <div className="form_hint error">{errors.accountHolder}</div>}
              </div>
              <div className="chg_bank_cell is_wide">
                <label className="chg_bank_label" htmlFor="confirmAccountNo">계좌번호</label>
                <input
                  id="confirmAccountNo"
                  type="text"
                  inputMode="numeric"
                  className={`form_input mono ${errors.accountNo ? 'is_error' : ''}`}
                  placeholder="숫자만 입력"
                  value={accountNo}
                  onChange={(e) => { setAccountNo(e.target.value); clearError('accountNo'); }}
                />
                {errors.accountNo && <div className="form_hint error">{errors.accountNo}</div>}
              </div>
            </div>
          </div>
        )}

        {requiresApproval && (
          <div className="chg_notice">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16.5v.5" />
            </svg>
            <span>CCTV 대수 변경은 관리자 승인 후 반영됩니다. 승인 전까지는 기존 조건으로 이용하실 수 있습니다.</span>
          </div>
        )}

        {!needsPayment && !needsBank && (
          <p className="form_hint">별도 결제나 환불 없이 즉시 반영됩니다. 아래 버튼으로 확정해주세요.</p>
        )}

        {error && <div className="form_hint error" style={{ marginTop: 10 }}>{error}</div>}
      </div>
    </Modal>
  );
}