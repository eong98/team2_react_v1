import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { daysUntilExpire, isExpired, ORDER_STATUS_MAP, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import '../shop/shopOrderList.css';
import { GlobalStoreSession } from '../../../store/LoginStore';

/* ---------------------------------------------------------------------
   구독 내역 상세 (/user/shoporder/:no) — 구독내용/결제내역/변경이력을
   탭으로 묶어서 보여주는 조회 전용 화면입니다.

   구독내용: SHOP_ORDER 단건 정보 요약
   결제내역: 이 주문에 딸린 SHOP_PAYMENT 전체 (결제/환불 포함)
   변경이력: 이 주문에 딸린 SHOP_ORDER_LOG 전체 (결제/매장연결/갱신/취소 이벤트)

   API
   GET /shop_order/{no}            → ShopOrderTypes
   GET /shop_payment/order/{ono}   → ShopPaymentTypes[]
   GET /shop_order_log/order/{no} → ShopOrderLogTypes[]
   GET /shop_plan/list, /shop/search   → 구독권 이름/매장 이름 매핑용
--------------------------------------------------------------------- */

type TabKey = 'info' | 'payment' | 'history';

export default function ShopOrderDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { no: mno } = GlobalStoreSession();
  const { ono } = useParams<{ ono: string }>();
  const [searchParams] = useSearchParams();
  const listPage = searchParams.get('listPage') ?? '1';
  
  const url = location.pathname.includes('/order') ? 'order' : 'shoporder';

  const goToTab = (tKey: TabKey) => {
    const path = tKey === 'info' ? `/user/${url}/${ono}` : `/user/${url}/${ono}/${tKey}`;
    navigate(`${path}?listPage=${listPage}`);
  };

  // "목록으로" 버튼 — listPage를 다시 page로 되돌려서 목록의 usePaging이 인식하게 함
  const backToList = () => navigate(`/user/${url}?page=${listPage}`);

  // 현재 URL 기준으로 활성 탭 판단
  const currentTab: TabKey = location.pathname.includes('/payment')
    ? 'payment'
    : location.pathname.includes('/history')
      ? 'history'
      : 'info';

  const [order, setOrder] = useState<ShopOrderTypes | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    if (!ono) return;
    setLoading(true);

    try {
      const res = await axiosInstance.get<ShopOrderTypes>(`/shop_order/${ono}`);
      setOrder(res.data);
    } catch (error) {
      console.error('구독 상세 조회 실패:', error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, ono]);

  if (loading) {
    return (
      <section className="view active">
        <PageHeader
          title="구독 내역 상세"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={backToList}>
              ← 목록으로
            </button>
          }
        />
        <p className="empty_row">로딩 중...</p>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="view active">
        <PageHeader
          title="구독 내역 상세"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={backToList}>
              ← 목록으로
            </button>
          }
        />
        <p className="empty_row">구독 내역을 찾을 수 없습니다.</p>
      </section>
    );
  }

  const expired = isExpired(order.edate);
  // 구독 기간 중 얼마나 지났는지 — 시작일~종료일 사이의 오늘 위치
  const periodTotal = order.sdate && order.edate ? new Date(order.edate).getTime() - new Date(order.sdate).getTime() : 0;
  const periodUsed = order.sdate ? Date.now() - new Date(order.sdate).getTime() : 0;
  const periodPct = periodTotal > 0 ? Math.min(100, Math.max(0, (periodUsed / periodTotal) * 100)) : 0;

  return (
    <section className="view active">
      <PageHeader
        title="구독 내역 상세"
        description={
          `${url === 'order' ? `${order.sname}에서 구독 중 인 ` : ''}주문번호 ${order.no}에 대한 상세 구독 내역을 확인할 수 있습니다.`
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={backToList}>
            ← 목록으로
          </button>
        }
      />

      <div className="tabs" role="tablist" aria-label="구독 내역 보기 전환">
        {(['info', 'payment', 'history'] as TabKey[]).map((tKey) => {
          const labels: Record<TabKey, string> = { info: '상세 내역', payment: '결제 내역', history: '전체 이력' };

          return (
            <button
              key={tKey}
              type="button"
              role="tab"
              className={`tab${currentTab === tKey ? ' on' : ''}`}
              aria-selected={currentTab === tKey}
              onClick={() => goToTab(tKey)}
            >
              {labels[tKey]}
            </button>
          );
        })}
      </div>

      {currentTab === 'info' ? (
        <>
          {/* 구독 요약 — 구독권 이름·상태 / 핵심 숫자 / 기간 진행 */}
          <div className="sub_card sub_detail_card">
            <div className="sub_head">
              <div>
                <p className="sub_eyebrow">주문번호 <span className="mono">{order.no}</span></p>
                <div className="sub_name_row">
                  <h3 className="sub_name">{order.pname}</h3>
                  <span className={`badge ${ORDER_STATUS_MAP[expired ? 3 : order.status].className}`}>
                    {ORDER_STATUS_MAP[expired ? 3 : order.status].label}
                  </span>
                </div>
              </div>
              <div className="sub_order">
                <span className="sub_order_no">결제일</span>
                <span className="sub_paid_date mono">{order.cdate}</span>
              </div>
            </div>

            <div className="sub_stats is_four">
              <div className="sub_stat">
                <div className="sub_stat_label">이용 기간</div>
                <div className="sub_stat_value">{order.pmonth}<small>개월</small></div>
              </div>
              <div className="sub_stat">
                <div className="sub_stat_label">CCTV 대수</div>
                <div className="sub_stat_value">{order.ccnt}<small>대</small></div>
              </div>
              <div className="sub_stat">
                <div className="sub_stat_label">대당 단가</div>
                <div className="sub_stat_value">{order.bprice.toLocaleString('ko-KR')}<small>원</small></div>
              </div>
              <div className="sub_stat">
                <div className="sub_stat_label">총 결제금액</div>
                <div className="sub_stat_value is_accent">{order.totalprice.toLocaleString('ko-KR')}<small>원</small></div>
              </div>
            </div>

            <div className="sub_period">
              <div className="sub_period_head">
                <span className="sub_period_label">구독 기간</span>
                {order.sdate && order.edate && (
                  <span className="sub_period_left">
                    {expired ? '기간이 끝났습니다' : `${daysUntilExpire(order.edate)}일 남음`}
                  </span>
                )}
              </div>
              {order.sdate && order.edate ? (
                <>
                  <div className="sub_track" role="img" aria-label={`구독 기간의 ${Math.round(periodPct)}%가 지났습니다`}>
                    <div className="sub_fill" style={{ width: `${periodPct}%` }} />
                  </div>
                  <div className="sub_period_dates mono">
                    <span>{order.sdate}</span>
                    <span>{order.edate}</span>
                  </div>
                </>
              ) : (
                <p className="sub_period_empty">매장을 연결하면 그날부터 구독 기간이 시작됩니다.</p>
              )}
            </div>
          </div>

          <div className="sub_detail_grid">
            {/* 연결된 매장 — 결제 요약과 같은 줄 목록으로 채움 */}
            <div className="sub_card">
              <p className="sub_eyebrow">연결된 매장</p>
              <div className="sub_rows">
                <div className="sub_row">
                  <span>매장</span>
                  <strong>{order.sno ? order.sname : order.status === 3 ? '취소된 구독입니다' : '연결된 매장 없음'}</strong>
                </div>
                <div className="sub_row">
                  <span>구독 시작일</span>
                  <strong className="mono">{order.sdate ?? '-'}</strong>
                </div>
                <div className="sub_row">
                  <span>구독 종료일</span>
                  <strong className="mono">{order.edate ?? '-'}</strong>
                </div>
                {/* 취소일 */}
                {order.udate && order.status === 3 && (
                  <div className="sub_row">
                    <span>취소일</span>
                    <strong className="mono">{order.udate}</strong>
                  </div>
                )}
              </div>
              {order.sno ? (
                <button type="button" className="sub_detail_btn sub_block_link" onClick={() => navigate('/user/shop')}>
                  매장 관리로 이동
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              ) : order.status !== 3 && (
                <>
                  <p className="sub_block_note">매장을 연결해야 구독이 시작됩니다.</p>
                  <button
                    type="button"
                    className="btn btn_md btn_outline_primary sub_block_btn"
                    onClick={() => navigate(`/user/${url}/${ono}/match`)}
                  >
                    + 매장 연결
                  </button>
                </>
              )}
            </div>

            {/* 결제 요약 */}
            <div className="sub_card">
              <p className="sub_eyebrow">결제 요약</p>
              <div className="sub_rows">
                <div className="sub_row">
                  <span>대당 단가 × 대수</span>
                  <strong>{order.bprice.toLocaleString('ko-KR')}원 × {order.ccnt}대</strong>
                </div>
                <div className="sub_row">
                  <span>이용 기간</span>
                  <strong>{order.pmonth}개월</strong>
                </div>
                <div className="sub_row is_total">
                  <span>총 결제금액</span>
                  <strong>{order.totalprice.toLocaleString('ko-KR')}<small>원</small></strong>
                </div>
              </div>
              <button type="button" className="sub_detail_btn sub_block_link" onClick={() => goToTab('payment')}>
                결제 내역 보기
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </section>
  );
}