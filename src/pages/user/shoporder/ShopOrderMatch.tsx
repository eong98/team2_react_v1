import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, AlertModal } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { PAGE_SIZE, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { usePaging } from '../../../hooks/usePaging';
import { GlobalCurrentShop } from '../../../store/UserStore';

/* ---------------------------------------------------------------------
   매장에 연결할 구독권 선택 (/user/shop/:sno/link) — 이미 결제해뒀지만
   아직 매장에 안 붙인 구독권 중, 이 매장의 실제 CCTV 등록 대수와 일치하는
   것만 골라서 보여줍니다. ShopMatch.tsx(구독권 기준으로 매장 고르는 화면)와
   반대 방향입니다.

   API
   GET /shop_order/mno/{mno}/sno/{sno}/linkable → ShopOrderTypes[]
   PUT /shop_order/{no}/link-shop                → 연결 확정
--------------------------------------------------------------------- */

export default function ShopOrderMatch() {
  const { sno } = useParams<{ sno: string }>();
  const navigate = useNavigate();
  const shopTitle = GlobalCurrentShop((state) => state.title);
  const { no: mno } = GlobalStoreSession();
  const { navigateWithQuery } = usePaging({ basePath: '/user/order' });

  const [orders, setOrders] = useState<ShopOrderTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const [draft, setDraft] = useState({ keyword: '' });
  const [applied, setApplied] = useState({ keyword: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!mno || !sno) return;
    axiosInstance
      .get<ShopOrderTypes[]>(`/shop_order/linkable-plans/${mno}/${sno}`)
      .then((res) => setOrders(res.data))
      .catch((err) => console.error('연결 가능한 구독권 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [mno, sno]);

  console.log(orders)

  
  const filtered = useMemo(() => {
    const word = applied.keyword.trim();
    if (!word) return orders;
    return orders.filter(
      (s) => s.pname?.includes(word)
    );
  }, [orders, applied.keyword]);

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    const empty = { keyword: '' };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };


  const handleLink = async (orderNo: string) => {
    setLinking(orderNo);
    try {
      await axiosInstance.put(`/shop_order/${orderNo}/link-shop`, { sno: Number(sno) });
      setAlert({ message: '구독권이 매장에 연결되었습니다.', variant: 'success' });
    } catch (err) {
      console.error('매장 연결 실패:', err);
      setAlert({ message: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.', variant: 'error' });
    } finally {
      setLinking(null);
    }
  };

  
  if (loading) {
    return <p className="b_title">연결 가능한 구독권을 확인하는 중...</p>;
  }

  return (
    <section className="view active">
      <PageHeader
        title="연결할 구독권을 선택하세요"
        description={`${shopTitle} 매장에 등록된 CCTV 대수()와 일치하는, 아직 매장이 연결되지 않은 구독권만 표시됩니다.`}
        actions={
          <div className='actions'>
            <button type="button" className="btn btn_md btn_ghost" onClick={() => navigateWithQuery('../order')}>
              ← 목록으로
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/shopplan')}>
              + 새 구독
            </button>
          </div>
          
        }
      />

      {orders.length === 0 ? (
        <div className="card card_pad_lg" style={{ textAlign: 'center' }}>
          <p className="cell_sub" style={{ marginBottom: 16 }}>
            이 매장의 CCTV 대수와 일치하는, 연결 가능한 구독권이 없습니다.
          </p>
          <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/shopplan')}>
            + 새 구독
          </button>
        </div>
      ) : (
        <div className="plan_grid">
          {orders.map((order) => (
            <div key={order.no} className="card plan_card">
              <h3>{order.pname}</h3>
              <div className="cell_sub" style={{ marginBottom: 10 }}>{order.pmonth}개월 · {order.ccnt}대</div>
              <div className="plan_unit mono" style={{ marginBottom: 16 }}>
                결제금액 <span className="unit_price">{order.totalprice.toLocaleString('ko-KR')}</span>원
              </div>
              <button
                type="button"
                className="btn btn_md btn_primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={linking === order.no}
                onClick={() => handleLink(order.no)}
              >
                {linking === order.no ? '연결 중...' : '이 구독권 연결'}
              </button>
            </div>
          ))}
        </div>
      )}

      <AlertModal
        open={alert !== null}
        onClose={() => {
          const success = alert?.variant === 'success';
          setAlert(null);
          if (success) navigate(-1); // 매장별 구독내역 화면으로 복귀
        }}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}