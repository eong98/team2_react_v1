import { useEffect, useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance } from '../../../../utils/Tool';
import type { ShopOrderTypes } from '../../../../components/ts/ShopOrder';
import type { ChangePreview, ChangeRequest } from '../../../../components/ts/ShopOrderPending';
import ChangeConfirmModal from './ChangeConfirmModal';
import './changeModal.css';

interface ChangeModalProps {
  target: ShopOrderTypes | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ChangeModal({ target, onClose, onSuccess }: ChangeModalProps) {
  const [pmonth, setPmonth] = useState(6);
  const [ccnt, setCcnt] = useState(1);
  const [minCcnt, setMinCcnt] = useState(1);
  const [maxCcnt, setMaxCcnt] = useState(999);

  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');

  // 2단계(결제수단/계좌 입력) 모달 열림 여부
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!target) return;
    setPmonth(target.pmonth);
    setCcnt(target.ccnt);
    setPreview(null);
    setError('');
    setConfirmOpen(false);

    axiosInstance
      .get<ShopOrderTypes>(`/shop_order/set_cctv/${target.no}`)
      .then((res) => {
        setMinCcnt((res.data as any).minCcnt ?? 1);
        setMaxCcnt((res.data as any).maxCcnt ?? 999);
      })
      .catch((err) => console.error('대수 범위 조회 실패:', err));
  }, [target]);

  const close = () => {
    setPreview(null);
    setConfirmOpen(false);
    setError('');
    onClose();
  };

  const ccntChanged = target ? ccnt !== target.ccnt : false;
  const requiresApproval = ccntChanged; // 대수가 바뀌면 승인 필요
  // 기간·대수 중 하나라도 지금과 달라야 변경 신청 가능
  // (그대로인 채 예상액을 확인하면 서버가 "변경 사항이 없습니다"로 거절해 오류 문구가 떴음)
  const hasChange = target ? ccntChanged || pmonth !== target.pmonth : false;

  const onCcntChange = (v: number) => {
    setCcnt(Math.min(maxCcnt, Math.max(minCcnt, v)));
    setPreview(null);
  };

  const onPmonthChange = (v: number) => {
    setPmonth(v);
    setPreview(null);
  };

  const checkPreview = async () => {
    if (!target || !hasChange) return;
    setPreviewLoading(true);
    setError('');
    try {
      const request: ChangeRequest = {
        ono: target.no,
        pmonth,
        ccnt,
        pmethod: null,
        bankName: null,
        accountNo: null,
        accountHolder: null,
      };
      const res = await axiosInstance.post<ChangePreview>('/shop_order_pending/preview', request);
      setPreview(res.data);
    } catch (err) {
      console.error('변경 미리보기 실패:', err);
      setError('해당 조건에 맞는 구독권을 찾을 수 없거나, 변경 가능 조건을 만족하지 않습니다.');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <>
      <Modal
        open={target !== null && !confirmOpen}
        onClose={close}
        titleId="changeModalTitle"
        title="구독권 변경"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={close}>
              취소
            </button>
            <button
              type="button"
              className="btn btn_md btn_primary"
              disabled={!preview}
              onClick={() => setConfirmOpen(true)}
            >
              다음
            </button>
          </>
        }
      >
        {target && (
          <div>
            {/* 현재 구독 요약 */}
            <div className="chg_current" aria-label="현재 구독">
              <div className="chg_current_cell">
                <span className="chg_current_label">현재 구독권</span>
                <span className="chg_current_value" title={target.pname}>{target.pname}</span>
              </div>
              <div className="chg_current_cell">
                <span className="chg_current_label">이용 기간</span>
                <span className="chg_current_value">{target.pmonth}개월</span>
              </div>
              <div className="chg_current_cell">
                <span className="chg_current_label">CCTV 대수</span>
                <span className="chg_current_value">{target.ccnt}대</span>
              </div>
            </div>

            {/* 이용 기간 */}
            <div className="chg_field">
              <div className="chg_field_head">
                <span className="chg_label" id="changePmonthLabel">
                  이용 기간
                  {pmonth !== target.pmonth && <span className="chg_changed">변경됨</span>}
                </span>
              </div>
              <div className="chg_seg" role="radiogroup" aria-labelledby="changePmonthLabel">
                {[6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={pmonth === m}
                    className={`chg_seg_btn${pmonth === m ? ' active' : ''}`}
                    onClick={() => onPmonthChange(m)}
                  >
                    {m}개월
                  </button>
                ))}
              </div>
            </div>

            {/* CCTV 대수 */}
            <div className="chg_field">
              <div className="chg_field_head">
                <label className="chg_label" htmlFor="changeCcnt">
                  CCTV 대수
                  {ccntChanged && <span className="chg_changed">변경됨</span>}
                </label>
                <span className="chg_hint">{minCcnt}대 ~ {maxCcnt}대</span>
              </div>
              <div className="chg_stepper">
                <button type="button" className="chg_stepper_btn" aria-label="1대 줄이기" disabled={ccnt <= minCcnt} onClick={() => onCcntChange(ccnt - 1)}>–</button>
                <input
                  id="changeCcnt"
                  type="number"
                  className="chg_stepper_input"
                  value={ccnt}
                  onChange={(e) => onCcntChange(Number(e.target.value) || minCcnt)}
                />
                <button type="button" className="chg_stepper_btn" aria-label="1대 늘리기" disabled={ccnt >= maxCcnt} onClick={() => onCcntChange(ccnt + 1)}>+</button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn_md btn_outline_primary chg_preview_btn"
              disabled={previewLoading || !hasChange}
              onClick={checkPreview}
            >
              {previewLoading ? '계산 중...' : preview ? '예상액 다시 확인' : '예상액 확인'}
            </button>
            {!hasChange && (
              <p className="form_hint" style={{ textAlign: 'center' }}>
                이용 기간이나 CCTV 대수를 지금과 다르게 선택하면 예상액을 확인할 수 있습니다.
              </p>
            )}

            {/* 예상 결과 */}
            {preview && (
              <div className="chg_result" aria-live="polite">
                <div className="chg_result_row"><span>적용될 구독권</span><strong>{preview.pname}</strong></div>
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
                {preview.extraCharge <= 0 && preview.refundAmount <= 0 && (
                  <div className="chg_result_row chg_result_total">
                    <span>추가 결제 금액</span>
                    <strong>0<small>원</small></strong>
                  </div>
                )}
              </div>
            )}

            {preview && requiresApproval && (
              <div className="chg_notice">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16.5v.5" />
                </svg>
                <span>
                  CCTV 대수가 바뀌는 변경은 관리자가 매장 설치 상태를 확인하고 승인해야 반영됩니다.
                  승인 전까지는 기존 조건으로 계속 이용하실 수 있습니다.
                </span>
              </div>
            )}

            {error && <div className="form_hint error" style={{ marginTop: 10 }}>{error}</div>}
          </div>
        )}
      </Modal>

      {target && preview && (
        <ChangeConfirmModal
          open={confirmOpen}
          target={target}
          pmonth={pmonth}
          ccnt={ccnt}
          preview={preview}
          requiresApproval={requiresApproval}
          onBack={() => setConfirmOpen(false)}
          onClose={close}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}