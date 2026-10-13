import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Filterbar, UserPagination, DataTable, type DataTableColumn, Modal, AlertModal } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { canCancel, canChange, canRenew, daysUntilExpire, EMPTY_FILTERS, estimateCancelRefund, getDaysFromStart, isExpired, ORDER_STATUS_MAP, PAGE_SIZE, type CancelResult, type Filters, type OrderSearchResult, type RenewRequest, type RenewResult, type RowType, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { GlobalCurrentShop } from '../../../store/UserStore';
import { usePaging } from '../../../hooks/usePaging';
import { EMPTY_ACCOUNT, PMETHOD_ICON, PMETHOD_MAP, type RefundAccount } from '../../../components/ts/ShopPayment';
import type { OrderPendingTypes } from '../../../components/ts/ShopOrderPending';
import RenewModal from '../shoporder/modal/RenewModal';
import CancelModal from '../shoporder/modal/CancelModal';
import ChangeModal from '../shoporder/modal/ChangeModal';
import './shopOrderList.css';

/* ---------------------------------------------------------------------
   매장별 구독 내역 (/user/shop/:sno/orders) — 회원+매장 기준 단일 검색 API를
   두 번 호출해서 상단(정상 구독 1건, status=1 고정)과 하단(검색+페이징,
   status 필터는 사용자가 선택)으로 나눠 보여줍니다.

   API
   GET /shop_order/mno/sno/&status=1&page=0&size=1        → 상단(정상 구독)
   GET /shop_order/mno/sno/&word=&status=&...&page=&size= → 하단(검색+페이징, 상태 필터는 만료/취소 위주로 쓰되 전체도 가능)
--------------------------------------------------------------------- */


export default function ShopOrderBySno() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();
  const sno = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/user/order' });

  
  // 상세로 이동할 때 현재 목록 page를 listPage로 실어 보냄
  const goToDetail = (ono: string) => {
    navigate(`/user/order/${ono}?listPage=${page}`);
  };

  const [active, setActive] = useState<ShopOrderTypes | null>(null);
  const [pending, setPending] = useState<OrderPendingTypes | null>(null);
  const [orders, setOrders] = useState<RowType[]>([]);

  const [activeLoading, setActiveLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  
  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadList = async () => {
    if (!sno || !mno) return; // 매장을 고르지 않았으면 조회하지 않음 (예전엔 sno=null로 요청이 나가 400이 났음)

    setLoading(true);

    try {
      const res = await axiosInstance.get<OrderSearchResult>(`/shop_order/my/shop/${sno}`, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.word.trim() || undefined,
          status: applied.status === '' ? undefined : Number(applied.status),
          pmonth: applied.pmonth === '' ? undefined : Number(applied.pmonth),
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setOrders(withCnt)
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));


    } catch (error) {
      console.error('구독 내역 조회 실패:', error);
      setOrders([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [sno, mno, applied, page]);
  
  useEffect(() => {
    loadActive();
  }, [sno, mno]);


  const loadActive = async () => {
    if (!sno || !mno) return; // 매장을 고르지 않았으면 조회하지 않음 (예전엔 sno=null로 요청이 나가 400이 났음)
    setActiveLoading(true);

    try {
      const res = await axiosInstance.get<ShopOrderTypes>(`/shop_order/top/${sno}`, {
        params: {status: 1}
      });

      setActive(res.data)

      if (res.data.pstatus === 0) {
        setPendingLoading(true);

        axiosInstance.get<OrderPendingTypes>(`/shop_order_pending/${res.data.no}`)
          .then(res => res.data)
          .then(data => {
            setPending(data);
            setPendingLoading(false);
          })
          .catch((err) => console.error('변경내역 조회실패', err))
      } else {
        setPending(null);
        setPendingLoading(false);
      }

    } catch (error) {
      console.error('구독 내역 조회 실패:', error);
      setActive(null);
    } finally {
      setActiveLoading(false);
    }
  };

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  

  /* 변경, 갱신, 취소 */
  const [renewTarget, setRenewTarget] = useState<ShopOrderTypes | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ShopOrderTypes | null>(null);
  const [changeTarget, setChangeTarget] = useState<ShopOrderTypes | null>(null);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const handleModalSuccess = (message: string) => {
    setAlert({ message, variant: 'success' });
    loadList();
  };

  const ordersColumns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    {
      header: '구독권',
      width: '100px',
      render: (o) => (
        <button type="button" className="btn_link" onClick={() => goToDetail(o.no)}>
          {o.pname}
        </button>
      ),
    },
    { header: '기간', width: '80px', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '대수', width: '60px', mono: true, render: (o) => `${o.ccnt}대` },
    { header: '결제금액', width: '110px', mono: true, render: (o) => 
        <span className={o.status === 2 ? 'text_line' : ''}>{o.totalprice.toLocaleString('ko-KR')}</span> },
    {
      header: '구독기간',
      width: '180px',
      mono: true,
      render: (o) => 
        o.sno && o.edate ? (
          <button type="button" className="btn_link" onClick={() => goToDetail(o.no)}>
            {o.sdate} ~ {o.edate}
          </button>
        ) : <span className="cell_sub">-</span>
    },
    {
      header: '상태',
      width: '90px',
      render: (o) => {
        const expired = isExpired(o.edate);
        return (
        <span className={`badge ${ORDER_STATUS_MAP[expired ? 3 : o.status].className}`}>
          {ORDER_STATUS_MAP[expired ? 3 : o.status].label}
        </span>
      )},
    },
  ];

  if (!sno) {
    return (
      <section className="view active">
        <PageHeader title="매장별 구독내역" description="매장을 선택하면 해당 매장에 연결된 현재 구독과 지난 이력을 확인할 수 있습니다." />
        <div
          className="card card_pad_sm"
        >
          <div className='no_data'>
            <p className="b_title">먼저 확인할 매장을 선택해주세요.</p>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
              매장 선택하러 가기
            </button>
          </div>
        </div>
      </section>
    );
  }
  

  return (
    <section className="view active">
      <PageHeader 
        title="매장별 구독내역" 
        description={`${shopTitle}에 연결된 현재 구독과 지난 이력을 확인합니다.`} 
        actions={
          <div className='actions'>
            {/* 변경 신청·구독 취소는 현재 구독 카드 아래쪽으로 옮김 — 그 구독에 대한 동작이라 카드 안에 둠 */}
            {active ? (
              isExpired(active.edate) && (<button type='button' className='btn btn_primary' onClick={() => navigate('/shopplan')}>+ 새 구독</button>)
            ):(
              <button type='button' className='btn btn_primary' onClick={() => navigate('/shopplan')}>+ 새 구독</button>
            )}
          </div>
        }
      />

      {activeLoading ? (
        <div className="card card_pad_lg" style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className='no_data' style={{padding: 0}}>
            <p className="b_title">불러오는 중...</p>
          </div>
        </div>
      ) : active ? (
        <>
        {isExpired(active.edate) ? (
          <div className='alert_mode'>
            <div className="alert_banner info">
              <div className="aicon">!</div>
              <div className="atext">
                <div className="t1">구독권이 만료되었습니다.</div>
                <div className="t2">서비스를 계속 사용하시려면 새로운 구독권을 구매하시거나 구매하신 구독권을 연결해주세요.</div>
              </div>
              <button type='button' className="abtn" onClick={() => navigateWithQuery(`${sno}/match`)}>
                구독권 연결
              </button>
            </div>
          </div>
          ): canRenew(active) && (
            <div className='alert_mode'>
              <div className="alert_banner">
                <div className="aicon">!</div>
                <div className="atext">
                  <div className="t1">구독권이 {daysUntilExpire(active.edate)}일 뒤 만료됩니다.</div>
                  <div className="t2">현재 구독권을 계속 이용하시려면 갱신버튼을 눌러 갱신해주세요.</div>
                  <div className="t2">갱신 가능 기간동안은 취소, 변경 신청을 할 수 없습니다.</div>
                </div>
                <button type='button' className="abtn" onClick={() => setRenewTarget(active)}>갱신하기</button>
              </div>
            </div>
        )}

        <div className={`sub_top${pending ? ' has_pending' : ''}`}>
          {/* 현재 구독 */}
          <div className="sub_card">
            <div className="sub_head">
              <div>
                <p className="sub_eyebrow">현재 이용중인 구독권</p>
                <div className="sub_name_row">
                  <h3 className="sub_name">{active.pname}</h3>
                  <span className={`badge ${ORDER_STATUS_MAP[isExpired(active.edate) ? 3 : active.status].className}`}>
                    {ORDER_STATUS_MAP[isExpired(active.edate) ? 3 : active.status].label}
                  </span>
                </div>
              </div>
              <div className="sub_order">
                <span className="sub_order_no mono">{active.no}</span>
                <button type="button" className="sub_detail_btn" onClick={() => goToDetail(active.no)}>
                  상세 내역 보기
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </div>
            </div>

            <div className="sub_stats">
              <div className="sub_stat">
                <div className="sub_stat_label">CCTV 대수</div>
                <div className="sub_stat_value">{active.ccnt}<small>대</small></div>
              </div>
              <div className="sub_stat">
                <div className="sub_stat_label">이용 기간</div>
                <div className="sub_stat_value">{active.pmonth}<small>개월</small></div>
              </div>
              <div className="sub_stat">
                <div className="sub_stat_label">{isExpired(active.edate) ? '구독 상태' : '이용한 날'}</div>
                <div className="sub_stat_value">
                  {isExpired(active.edate) ? '만료' : <>{getDaysFromStart(active.sdate || '-')}<small>일째</small></>}
                </div>
              </div>
            </div>

            {active.sdate && active.edate && (() => {
              // 구독 기간 중 얼마나 지났는지 — 시작일~종료일 사이의 오늘 위치
              const total = new Date(active.edate).getTime() - new Date(active.sdate).getTime();
              const used = Date.now() - new Date(active.sdate).getTime();
              const pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
              const left = daysUntilExpire(active.edate);
              const expired = isExpired(active.edate);
              return (
                <div className="sub_period">
                  <div className="sub_period_head">
                    <span className="sub_period_label">구독 기간</span>
                    <span className={`sub_period_left${!expired && canRenew(active) ? ' is_soon' : ''}`}>
                      {expired ? '기간이 끝났습니다' : `${left}일 남음`}
                    </span>
                  </div>
                  <div className="sub_track" role="img" aria-label={`구독 기간의 ${Math.round(pct)}%가 지났습니다`}>
                    <div className="sub_fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="sub_period_dates mono">
                    <span>{active.sdate}</span>
                    <span>{active.edate}</span>
                  </div>
                </div>
              );
            })()}

            {/* 이 구독에 대한 동작 — 변경 신청 / 구독 취소 */}
            {(canChange(active) || canCancel(active)) && (
              <div className="sub_actions">
                {canCancel(active) && (
                  <button type="button" className="sub_cancel_btn" onClick={() => setCancelTarget(active)}>
                    구독 취소
                  </button>
                )}
                {canChange(active) && (
                  <button type="button" className="btn btn_md btn_outline_primary" onClick={() => setChangeTarget(active)}>
                    변경 신청
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 변경 신청 — 관리자 승인 대기 */}
          {pendingLoading ? (
            <div className="sub_card is_pending"><p className="b_title" style={{ margin: 0 }}>불러오는 중...</p></div>
          ) : pending && (
            <div className="sub_card is_pending">
              <div className="sub_head">
                <div>
                  <p className="sub_eyebrow">변경 신청 · {pending.cdate}</p>
                  <h3 className="sub_pending_title">신청한 변경 내용</h3>
                </div>
                <span className="badge info">관리자 승인 대기 중</span>
              </div>

              <ul className="sub_change_list">
                <li className="sub_change">
                  <span className="sub_change_label">구독권</span>
                  <span className="sub_change_value">
                    {active.pno !== pending.pno ? (
                      <><span className="from">{active.pname}</span><span className="arrow" aria-hidden="true">→</span>{pending.pname}</>
                    ) : <span className="same">변경 없음</span>}
                  </span>
                </li>
                <li className="sub_change">
                  <span className="sub_change_label">CCTV 대수</span>
                  <span className="sub_change_value">
                    {active.ccnt !== pending.ccnt ? (
                      <><span className="from">{active.ccnt}대</span><span className="arrow" aria-hidden="true">→</span>{pending.ccnt}대</>
                    ) : <span className="same">변경 없음</span>}
                  </span>
                </li>
                <li className="sub_change">
                  <span className="sub_change_label">이용 기간</span>
                  <span className="sub_change_value">
                    {active.pmonth !== pending.pmonth ? (
                      <><span className="from">{active.pmonth}개월</span><span className="arrow" aria-hidden="true">→</span>{pending.pmonth}개월</>
                    ) : <span className="same">변경 없음</span>}
                  </span>
                </li>
              </ul>
              <p className="sub_pending_foot">승인 전까지는 지금 구독 조건으로 계속 이용하실 수 있습니다.</p>
            </div>
          )}
        </div>
        </>
      ) : (
        <div className="card card_pad_lg" style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className='no_data' style={{padding: 0}}>
            <p className="b_title">연결된 구독권이 없습니다.</p>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigateWithQuery(`${sno}/match`)}>
              구독권 연결
            </button>

          </div>
        </div>
      )}

      <h3 className="title md" style={{ marginBottom: 10 }}>지난 구독 이력</h3>

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        filters={
          <>
            <select
              className="form_select"
              value={draft.pmonth}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmonth: e.target.value }))}
              aria-label="구독기간 필터"
            >
              <option value="">구독기간 전체</option>
              <option value="6">6개월</option>
              <option value="12">12개월</option>
            </select>

            <select
              className="form_select"
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
              aria-label="구독 상태 필터"
            >
              <option value="">상태 전체</option>
              <option value="2">취소</option>
              <option value="3">만료</option>
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="구매일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="구매일 종료"
            />
          </>
        }
        extra={
          <>
            <button type="button" className="btn btn_ghost" onClick={onReset}>
              초기화
            </button>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
          </>
        }
      />

      <DataTable
        columns={ordersColumns}
        data={orders}
        rowKey={(o) => o.no}
        loading={loading}
        emptyMessage="지난 구독 이력이 없습니다."
      />
      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      
      <RenewModal target={renewTarget} onClose={() => setRenewTarget(null)} onSuccess={handleModalSuccess} />
      <CancelModal target={cancelTarget} onClose={() => setCancelTarget(null)} onSuccess={handleModalSuccess} />
      <ChangeModal target={changeTarget} onClose={() => setChangeTarget(null)} onSuccess={handleModalSuccess} />
      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />

    </section>
  );
}