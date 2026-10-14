import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertModal, Modal } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { GlobalCurrentShop } from '../../../store/UserStore';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';
import './shoPlan.css'
import type { ORRequest, ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { PMETHOD_MAP, PMETHOD_ICON } from '../../../components/ts/ShopPayment';
import '../../user/shoporder/subLines.css';
import '../../user/shoporder/modal/changeModal.css';


/* ---------------------------------------------------------------------
   구독권 안내 · 결제 (/user/subscribe) — 3단계 위저드
   1. 기간 토글(슬라이딩) + 요금제 카드 선택
   2. CCTV 대수 선택 (결제수단과 분리)
   3. 결제하기 — 최종 확인 + 결제수단(필터칩) 선택 + 결제

   ShopPlanTypes의 pmonth/bprice/mincctv/maxcctv가 폼(ShopPlanForm.tsx) 쪽 입력
   상태 타입 때문에 number | '' 로 잡혀있어서, 이 화면에서 산술 비교/계산할 때는
   전부 Number()로 감싸서 씁니다.

   API
   GET  /shop_plan/list  → ShopPlanTypes[] (issell='Y'만 내려옴)
   POST /shop_order        → ORRequest → 주문 생성
   POST /shop_payment       → PRequest → 결제 등록
--------------------------------------------------------------------- */


export default function ShopPlan() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();
  const shopNo = GlobalCurrentShop((state) => state.no);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState<number | null>(null);
  const [plan, setPlan] = useState<ShopPlanTypes | null>(null);
  const [qty, setQty] = useState(1);
  const [pmethod, setPmethod] = useState<0 | 1 | 2>(0);

  const [paying, setPaying] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error', onConfirm?: () => void } | null>(null);
  const [loginConfirmOpen, setLoginConfirmOpen] = useState(false); // 비로그인 결제 시도 시 로그인 안내 모달

  useEffect(() => {
    axiosInstance
      .get<ShopPlanTypes[]>('/shop_plan/list')
      .then((res) => {
        setPlans(res.data);
        const months = Array.from(new Set(res.data.map((p) => Number(p.pmonth)))).sort((a, b) => a - b);
        if (months.length > 0) setMonth(months[0]);
      })
      .catch((err) => console.error('구독권 목록 조회 실패:', err))
      .finally(() => setLoading(false));

  }, [mno]);

  const months = Array.from(new Set(plans.map((p) => Number(p.pmonth)))).sort((a, b) => a - b);
  const plansForMonth = plans.filter((p) => Number(p.pmonth) === month);
  const monthIndex = month !== null ? months.indexOf(month) : 0;
  const longestMonth = months.length > 0 ? Math.max(...months) : null;

  const totalPrice = plan && month ? Number(plan.bprice) * qty * month : 0;

  const selectPlan = (p: ShopPlanTypes) => {
    setPlan(p);
    setQty(Number(p.mincctv));
    setStep(2);
  };

  const changeQty = (delta: number) => {
    if (!plan) return;
    const min = Number(plan.mincctv);
    const max = Number(plan.maxcctv);
    setQty((prev) => Math.min(max, Math.max(min, prev + delta)));
  };

  const goBack = (n: 1 | 2) => setStep(n);



  const handlePay = async () => {
    if (!mno) {
      setLoginConfirmOpen(true);
      return;
    }
    if (!plan || !month) return;

    const orderPayload: ORRequest = {
      pno: plan.no,
      mno,
      pmonth: month,
      ccnt: qty,
      bprice: Number(plan.bprice),
      totalprice: totalPrice,
      pmethod
    };

    setPaying(true);
    try {
      const orderRes = await axiosInstance.post<ShopOrderTypes>('/shop_order', orderPayload);
      navigate(`/user/shoporder/${orderRes.data.no}/match`);

      const getGrade = await axiosInstance.get('/shop_order/grade')
      GlobalStoreSession.getState().setGrade(getGrade.data);
      
    } catch (err) {
      console.error('결제 실패:', err);
      setAlert({ message: '결제 처리 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <p className="b_title">구독권 정보를 불러오는 중...</p>;
  }

  return (
    <>
      {/* 프로그레스 스테퍼 */}
      {(() => {
        const STEPS = ['요금제 선택', 'CCTV 대수 선택', '결제하기'];
        return (
          <div className="progress_stepper" role="list" aria-label="구독 결제 진행 단계">
            {STEPS.map((label, idx) => {
              const n = idx + 1;
              const state = step === n ? 'on' : step > n ? 'done' : '';
              return (
                <div className={`progress_step ${state}`} key={n} role="listitem">
                  <div className="progress_step_row">
                    <span className="progress_step_circle">
                      {step > n ? 
                        (<span className='check'>
                          <span className='hidden'>{n} 단계 완료</span>
                        </span> )
                        : n
                      }
                    </span>

                    {idx < STEPS.length - 1 && <span className="progress_step_line" />}
                  </div>
                  <span className="progress_step_label">{label}</span>
                </div>
              );
            })}
          </div>
        );
      })()}


      {/* STEP 1 : 기간 슬라이딩 토글 + 요금제 카드 */}
      {step === 1 && (
        <section className="view active">
          <div className="ott_hero">
            <h2 className="title xlg">매장 한 곳에 맞는 요금제를 선택하세요</h2>
            <p className="b_title lg">매장에 있는 CCTV 대수만큼만 결제하세요. <br />이상행동 6가지 감지는 모든 요금제에 들어 있습니다.</p>
          </div>
          
          <div className="ott_toggle_wrap">
            {longestMonth !== null && (
              <span
                className="ott_free_badge"
                style={{
                  left: `${(100 / Math.max(months.length, 1)) * (months.indexOf(longestMonth) + 0.5)}%`,
                }}
              >
                🎁 {longestMonth}개월로 이용하면 대당 월 요금이 더 저렴해요
              </span>
            )}

            <div className="ott_toggle" role="radiogroup" aria-label="이용 기간 선택">
              <span
                className="ott_toggle_slider"
                style={{
                  width: `calc(${100 / Math.max(months.length, 1)}% - 10px)`,
                  left: `calc(${(100 / Math.max(months.length, 1)) * monthIndex}% + 5px)`,
                }}
              />
              {months.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`ott_toggle_btn${month === m ? ' on' : ''}`}
                  onClick={() => setMonth(m)}
                >
                  {m}개월
                </button>
              ))}
            </div>
          </div>
            
          <div className="panel">
            <p className="b_caption">* 이용 중에도 변경 신청으로 CCTV 대수와 이용 기간을 바꿀 수 있습니다. (담당자 확인 후 반영)</p>
            <div className='plan_grid'>
              {plansForMonth.map((p) => {
                const highlighted = p.isreco === 'Y' || p.popular;
                return (
                  <button
                    key={p.no}
                    type="button"
                    className={`card plan_card${highlighted ? ' plan_highlight' : ''}`}
                    onClick={() => selectPlan(p)}
                  >
                    {/* 관리자 추천(isreco)과 인기(결제 건수 1위)는 둘 다 붙을 수 있음 */}
                    {highlighted && (
                      <div className="plan_tags">
                        {p.isreco === 'Y' && (
                          <span className="plan_tag reco">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L2.9 9.4l6.3-.9z" /></svg>
                            추천
                          </span>
                        )}
                        {p.popular && (
                          <span className="plan_tag popular">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22a7 7 0 0 1-7-7c0-3.4 2.2-5.5 3.5-7.4.4 1.7 1.3 2.8 2.4 3.3C10.6 7.2 12.3 3.9 15 1.5c-.2 3.4 1 5.5 2.2 7.3 1 1.6 1.8 3.3 1.8 5.2a7 7 0 0 1-7 8z" /></svg>
                            인기
                          </span>
                        )}
                      </div>
                    )}
                    

                    <h3>{p.pname}</h3>
                    <div className="plan_range mono">{Number(p.mincctv)} ~ {Number(p.maxcctv)}대</div>
                    <div className="plan_unit mono">
                      대당 월 <span className='price'>{Number(p.bprice).toLocaleString('ko-KR')}</span>원 · {month}개월 결제
                    </div>
                    {p.description && (
                      <ul>
                        {p.description.split('|').filter(Boolean).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}


      {/* STEP 2 : CCTV 대수 선택 */}
      {step === 2 && (
        <section className="view active">
          <div className="ott_hero">
            <h2 className="title xlg">CCTV 대수 선택</h2>
            <p className="b_title lg">AI가 지켜볼 CCTV 대수를 선택해 주세요. 매장에 있는 대수와 같게 고르시면 됩니다.</p>
          </div>
          
          {step === 2 && plan && month !== null && (
            <div className="panel flex">
              <div className="order_summary">
                <div className="cctv_stepper">
                  <label htmlFor="cctvQty">CCTV 대수</label>

                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper_btn"
                      disabled={qty <= Number(plan.mincctv)}
                      onClick={() => changeQty(-1)}
                      aria-label="대수 1대 줄이기"
                    >
                      –
                    </button>
                    <input
                      id="cctvQty"
                      type="number"
                      className="stepper_input"
                      value={qty}
                      onChange={(e) => {
                        const min = Number(plan.mincctv);
                        const max = Number(plan.maxcctv);
                        const v = Number(e.target.value) || min;
                        setQty(Math.min(max, Math.max(min, v)));
                      }}
                    />
                    <button
                      type="button"
                      className="stepper_btn"
                      disabled={qty >= Number(plan.maxcctv)}
                      onClick={() => changeQty(1)}
                      aria-label="대수 1대 늘리기"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="gd_label">
                  <p className='b_title sm'>
                    {plan.pname} 요금제는 CCTV {Number(plan.mincctv)}~{Number(plan.maxcctv)}대까지 선택할 수 있습니다.
                  </p>

                  <button type="button" className="wz_back" onClick={() => goBack(1)}>요금제 다시 선택</button>
                </div>

                <div className="order_lines sub_lines plan_lines">
                  <div className="order_line"><span>요금제</span><span>{plan.pname}</span></div>
                  <div className="order_line"><span>결제 주기</span><span>{month}개월</span></div>
                  <div className="order_line"><span>대당 월 단가</span><span>{Number(plan.bprice).toLocaleString('ko-KR')}원</span></div>
                  <div className="order_line"><span>선택 대수</span><span>{qty}대</span></div>
                </div>

                {/* 대수를 바꾸면 바로 바뀌는 금액 — 결제 단계로 넘어가기 전에 미리 확인 */}
                <div className="order_total">
                  <span>예상 결제 금액</span>
                  <div className="price mono">
                    {totalPrice.toLocaleString('ko-KR')}<span>원</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn_lg btn_primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setStep(3)}
                >
                  결제하기
                </button>
              </div>
            </div>
          )}

        </section>
      )}


      {/* STEP 3 : 결제하기 — 최종 확인 + 결제수단 필터칩 */}
      {step === 3 && (
        <section className="view active">
          <div className="ott_hero">
            <h2 className="title xlg">선택한 내용을 확인하고 결제하세요</h2>
            <p className="b_title lg">결제 후에도 변경 신청으로 CCTV 대수와 이용 기간을 바꿀 수 있습니다.</p>
          </div>

          {plan && month !== null && (
            <div className="panel flex">
              <div className="order_summary">
                <div className="gd_label">
                  결제하기
                  <button type="button" className="wz_back" onClick={() => goBack(2)}>대수 다시 선택</button>
                </div>
                
                <div className="order_lines sub_lines plan_lines">
                  <div className="order_line"><span>요금제</span><span>{plan.pname}</span></div>
                  <div className="order_line"><span>결제 주기</span><span>{month}개월</span></div>
                  <div className="order_line"><span>대당 월 단가</span><span>{Number(plan.bprice).toLocaleString('ko-KR')}원</span></div>
                  <div className="order_line"><span>CCTV 대수</span><span>{qty}대</span></div>
                </div>

                <div className="chg_field plan_pay">
                  <div className="chg_field_head">
                    <span className="chg_label" id="planPmethodLabel">결제 수단</span>
                  </div>
                  <div className="chg_pay" role="radiogroup" aria-labelledby="planPmethodLabel">
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

                <div className="order_total">
                  <span>총 결제 금액</span>
                  <div className="price mono">
                    {totalPrice.toLocaleString('ko-KR')}<span>원</span>
                  </div>
                </div>

                {!shopNo && (
                  <div className="form_hint" style={{ marginBottom: 16 }}>
                    결제 후 담당자가 연락드려 CCTV 설치 · 등록을 도와드립니다. 등록이 끝나면 구독권을 매장에 연결해 바로 이용하실 수 있습니다.
                  </div>
                )}
                
                <button
                  type="button"
                  className="btn btn_lg btn_primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={paying}
                  onClick={handlePay}
                >
                  {paying ? '결제 처리 중...' : '결제하기'}
                </button>

              </div>
            </div>
          )}
        </section>
      )}

      <AlertModal
        open={alert !== null}
        onClose={() => {
          const success = alert?.variant === 'success';
          setAlert(null);
          if (success) navigate('/');
        }}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />

      
      {/* 결제시도 로그인 확인 모달 */}
      <Modal
        open={loginConfirmOpen}
        onClose={() => setLoginConfirmOpen(false)}
        titleId="loginConfirmTitle"
        title="알림"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={() => setLoginConfirmOpen(false)}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/login')}>
              로그인
            </button>
          </>
        }
      >
        <div className="login_confirm">
          <span className="login_confirm_icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              <path d="M12 14.5v2.5" />
            </svg>
          </span>
          <p className="login_confirm_title">로그인이 필요합니다</p>
          <p className="login_confirm_desc">구독권을 구매하시려면 로그인 후 다시 시도해주세요.</p>

          <div className="login_confirm_join">
            <span>회원이 아니신가요?</span>
            <button type="button" className="login_confirm_join_btn" onClick={() => navigate('/signup')}>
              회원가입하러가기
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </Modal>
    </>

  );
}