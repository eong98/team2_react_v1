import { useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance } from '../../../../utils/Tool';
import { PMETHOD_MAP, PMETHOD_ICON } from '../../../../components/ts/ShopPayment';
import type { ShopOrderTypes } from '../../../../components/ts/ShopOrder';
import './changeModal.css';

interface RenewModalProps {
  target: ShopOrderTypes | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

/** 연장할 수 있는 기간(개월) */
const RENEW_MONTHS = [6, 12];

export default function RenewModal({ target, onClose, onSuccess }: RenewModalProps) {
  const [newPmonth, setNewPmonth] = useState<number | undefined>(undefined); // undefined면 동일조건
  const [pmethod, setPmethod] = useState<0 | 1 | 2>(0);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setNewPmonth(undefined);
    setPmethod(0);
    setError('');
    onClose();
  };

  const submit = async () => {
    if (!target || renewing) return;
    setRenewing(true);
    setError('');
    try {
      const res = await axiosInstance.put(`/shop_order/${target.no}/renew`, null, {
        params: {
          newPmonth: newPmonth ?? undefined,
          pmethod,
        },
      });
      onSuccess(
        `구독이 갱신되었습니다.\n새 구독 종료일: ${res.data.edate}\n총 결제 금액(누적): ${res.data.totalprice.toLocaleString('ko-KR')}원`,
      );
      close();
    } catch (err) {
      console.error('갱신 실패:', err);
      setError('갱신 처리 중 오류가 발생했습니다.');
    } finally {
      setRenewing(false);
    }
  };

  const months = target ? (newPmonth ?? target.pmonth) : 0;

  return (
    <Modal
      open={target !== null}
      onClose={close}
      titleId="renewModalTitle"
      title="구독 갱신"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={close}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_primary" disabled={renewing} onClick={submit}>
            {renewing ? '처리 중...' : '갱신하기'}
          </button>
        </>
      }
    >
      {target && (
        <div>
          {/* 갱신할 구독 */}
          <div className="chg_current">
            <div className="chg_current_cell">
              <span className="chg_current_label">구독권</span>
              <span className="chg_current_value">{target.pname}</span>
            </div>
            <div className="chg_current_cell">
              <span className="chg_current_label">현재 종료일</span>
              <span className="chg_current_value">{target.edate}</span>
            </div>
            <div className="chg_current_cell">
              <span className="chg_current_label">CCTV</span>
              <span className="chg_current_value">{target.ccnt}대</span>
            </div>
          </div>

          {/* 연장 기간 */}
          <div className="chg_field">
            <div className="chg_field_head">
              <span className="chg_label" id="renewPmonthLabel">
                연장 기간
                {months !== target.pmonth && <span className="chg_changed">변경됨</span>}
              </span>
              <span className="chg_hint">지금 조건은 {target.pmonth}개월 · CCTV 대수는 그대로 갱신됩니다</span>
            </div>
            <div className="chg_seg" role="radiogroup" aria-labelledby="renewPmonthLabel">
              {RENEW_MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={months === m}
                  className={`chg_seg_btn${months === m ? ' active' : ''}`}
                  onClick={() => setNewPmonth(m === target.pmonth ? undefined : m)}
                >
                  {m}개월
                </button>
              ))}
            </div>
          </div>

          {/* 결제 수단 */}
          <div className="chg_field">
            <div className="chg_field_head">
              <span className="chg_label" id="renewPmethodLabel">결제 수단</span>
            </div>
            <div className="chg_pay" role="radiogroup" aria-labelledby="renewPmethodLabel">
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

          <p className="form_hint">갱신하면 현재 종료일 다음 날부터 선택한 기간만큼 이어서 이용합니다.</p>

          {error && <div className="form_hint error" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      )}
    </Modal>
  );
}
