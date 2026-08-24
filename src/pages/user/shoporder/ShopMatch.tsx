import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Filterbar, UserPagination, AlertModal } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import type { LinkShopRequest } from '../../../components/ts/ShopOrder';
import { PAGE_SIZE, type ShopType } from '../../../components/ts/ShopUser';

/* ---------------------------------------------------------------------
   구독 결제 완료 후 매장 연결 (/user/subscribe/:orderno/shop-select)

   규칙 4, 5 반영:
   - 연결 가능한 매장(무구독 매장 + 만료/취소된 구독이 걸린 매장)이 하나도 없으면 새 매장 등록 화면
   - 하나라도 있으면 목록 + PageHeader의 "새 매장 등록" 버튼을 같이 보여줍니다.

   검색/페이징은 서버 API 변경 없이 프론트에서만 처리합니다 — 한 회원이 가진
   "연결 가능한 매장" 모수가 원래 크지 않은 화면이라, 클라이언트 필터링으로 충분합니다.
   UI는 다른 목록 화면과 동일하게 Filterbar(draft → applied 검색 확정) + UserPagination을 씁니다.

   API
   GET /shop_order/linkable-shops/{mno}     → ShopType[] (ShopWithCctvCount)
   PUT /shop_order/{orderno}/link-shop       → LinkShopRequest → 연결 확정
--------------------------------------------------------------------- */


export default function ShopMatch() {
  const { orderno } = useParams<{ orderno: string }>();
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();

  const [shops, setShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<number | null>(null);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const [draft, setDraft] = useState({ keyword: '' });
  const [applied, setApplied] = useState({ keyword: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!mno) {
      setLoading(false);
      return;
    }
    axiosInstance
      .get<ShopType[]>(`/shop_order/linkable-shops/${mno}`)
      .then((res) => {
        setShops(res.data);
      })
      .catch((err) => console.error('연결 가능 매장 조회 실패:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno]);

  const filtered = useMemo(() => {
    const word = applied.keyword.trim();
    if (!word) return shops;
    return shops.filter(
      (s) => s.title?.includes(word) || s.address?.includes(word) || s.address2?.includes(word)
    );
  }, [shops, applied.keyword]);

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

  const handleSelect = async (sno?: number) => {
    if (!orderno || !sno) return;
    setLinking(sno);
    try {
      const payload: LinkShopRequest = { sno };
      await axiosInstance.put(`/shop_order/${orderno}/link-shop`, payload);
      setAlert({ message: '매장에 구독권이 연결되었습니다.', variant: 'success' });
    } catch (err) {
      console.error('매장 연결 실패:', err);
      setAlert({
        message: '매장 연결에 실패했습니다. 등록된 CCTV 대수가 결제하신 대수와 다를 수 있습니다.',
        variant: 'error',
      });
    } finally {
      setLinking(null);
    }
  };

  if (loading) {
    return <p className="b_title">연결 가능한 매장을 확인하는 중...</p>;
  }

  return (
    <section className="view active">
      <PageHeader
        title="구독권을 연결할 매장을 선택하세요"
        description="구독 시 지정한 CCTV 대수와 매장에 등록된 CCTV 대수가 일치해야 연결할 수 있습니다."
        createLabel={shops.length > 0 ? '+ 새 매장 등록' : undefined}
        onCreate={shops.length > 0 ? () => navigate(`/user/shop/new?orderno=${orderno}`, {replace: true}) : undefined}
      />

      {shops.length > PAGE_SIZE && (
        <Filterbar
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalElements}
          searchValue={draft.keyword}
          onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
          searchPlaceholder="매장명·주소로 검색"
          onSearchEnter={onSearch}
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
      )}

      {filtered.length === 0 ? (
        <div className="card card_pad_lg cal_empty">
          <p className="b_title">먼저 관리할 매장을 선택해주세요.</p>
          <button type="button" className="btn btn_md btn_primary">매장 선택하러 가기</button>
        </div>

      ) : (
        <div className="store_grid" style={{ marginBottom: 20 }}>
          {paged.map((shop) => (
            <div key={shop.no} className="card plan_card" style={{ cursor: 'default' }}>
              <h3>{shop.title}</h3>
              <div className="cell_sub" style={{ marginBottom: 10 }}>{shop.address} {shop.address2}</div>
              <div className="plan_unit mono" style={{ marginBottom: 16 }}>
                등록 CCTV <span className="unit_price">{shop.cctvCount ?? 0}</span>대
              </div>
              <button
                type="button"
                className="btn btn_md btn_primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={linking === shop.no}
                onClick={() => handleSelect(shop.no)}
              >
                {linking === shop.no ? '연결 중...' : '이 매장에 연결'}
              </button>
            </div>
          ))}
        </div>
      )}

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

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
    </section>
  );
}