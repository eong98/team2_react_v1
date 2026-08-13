import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, UserPagination, ConfirmDeleteModal } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
  PAGE_SIZE,
  EMPTY_FILTERS,
  type ShopType,
  type ShopSearchResult,
  type Filters,
} from '../../../components/ts/ShopUser.ts';
import { GlobalStoreSession } from '../../../store/LoginStore.ts'; 
import { GlobalCurrentShop } from '../../../store/UserStore.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   매장 목록(/user/shop) - 로그인한 회원(mno) 소유 매장만 카드 그리드로 노출.

   SHOP 컬럼: no/mno/title/zip/address/address2/tel/coment/phone/snum/udate/cdate
   ※ 2026-08-11 PAYSTATE/QRIMG 컬럼은 테이블에서 제거되어 더 이상 쓰지 않습니다.

   API (ShopCont, /shop)
   GET /shop/search?mno=&keyword=&page=&size=
     → { content, totalElements, totalPages, page(0-base), size }
   DELETE /shop/{pk}

   상수/타입(PAGE_SIZE, Filters, EMPTY_FILTERS, ShopType, ShopSearchResult)은
   전부 ./Shop.ts 로 옮겨뒀습니다.
--------------------------------------------------------------------- */

export default function ShopListView() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession(); 
  const { setShop } = GlobalCurrentShop();

  // draft: 입력 중인 값(타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<ShopType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<ShopType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<ShopSearchResult>('/shop/search', {
        params: {
          mno,
          page: page - 1,
          size: PAGE_SIZE,
          keyword: applied.keyword.trim() || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages } = res.data;

      setRows(content);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error(err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page]);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };

  const from = totalElements === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalElements);

  // 2026-08-11: 매장 전환 상태를 GlobalCurrentShop(store/UserStore.ts)에 저장해서
  // Topbar 등 /user 하위 모든 화면이 같이 보도록 옮겼습니다(기존 TODO 처리).
  const enterStore = (shop: ShopType) => {
    if (!shop.no) return;
    setShop({ no: shop.no, title: shop.title ?? '' });
    navigate('/user/dashboard/test1');
  };

  // 매장번호(sno)를 GlobalCurrentShop에 물린 뒤 CCTV 목록(/user/cctv)으로 바로 이동합니다.
  // "입장하기"와 동일하게 setShop()으로 매장번호를 먼저 심어야, CCTV 화면이 그 번호로
  // /cctv/search?sno=를 호출해서 이 매장 소유 CCTV만 보여줍니다.
  const viewCctv = (shop: ShopType) => {
    if (!shop.no) return;
    setShop({ no: shop.no, title: shop.title ?? '' });
    navigate('/user/cctv');
  };

  // 매장 주소(zip/address/address2) 기준으로 카카오맵 길찾기(장소 검색)를 새 탭으로 엽니다.
  // 좌표(위도/경도)를 따로 저장해두지 않아서, 정확한 도착지 좌표 대신 주소 텍스트로
  // 검색하는 방식(map.kakao.com/link/search)을 사용합니다.
  const moveToAddress = (shop: ShopType) => {
    const query = `${shop.address ?? ''} ${shop.address2 ?? ''}`.trim();
    if (!query) {
      alert('등록된 주소가 없어 길찾기를 열 수 없습니다.');
      return;
    }
    window.open(`https://map.kakao.com/link/search/${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async () => {
    if (!deleteTarget?.no) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/shop/${deleteTarget.no}`);
      setDeleteTarget(null);
      // 마지막 페이지의 마지막 1건을 지운 경우 빈 페이지가 보이지 않도록 보정
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadList();
      }
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="view active">
      <PageHeader
        title="매장 목록"
        description="운영 중인 매장을 선택해 관제 화면으로 전환합니다."
        createLabel="+ 매장생성"
        onCreate={() => navigate('new')}
      />

      <Filterbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="매장명·주소로 검색"
        onSearchEnter={onSearch}
        left={
          <span className="pagination_info">
            전체 {totalElements}건 중 {from}–{to}건 표시
          </span>
        }
        extra={
          <>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
            <button type="button" className="btn btn_outline_primary" onClick={onReset}>
              초기화
            </button>
          </>
        }
      />

      <div className="store_grid">
        {loading ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>불러오는 중...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>조건에 맞는 매장이 없습니다.</p>
        ) : (
          rows.map((s) => (
            <div className="card store_card" key={s.no}>
              <div className="store_thumb">
                <div className="noise" />
              </div>
              <div className="store_body">
                <div className="sname">{s.title}</div>
                <div className="saddr">
                  {s.address}
                  {s.address2 ? ` ${s.address2}` : ''}
                </div>
                <div className="store_meta">
                  <div>
                    매장연락처<b>{s.tel || '-'}</b>
                  </div>
                  <div>
                    사업자번호<b>{s.snum || '-'}</b>
                  </div>
                  <div>
                    등록 CCTV<b>{s.cctvCount ?? 0}대</b>
                  </div>
                </div>
                <button type="button" className="btn btn_primary" onClick={() => enterStore(s)}>
                  입장하기
                </button>
                <div className="store_card_actions">
                  <button type="button" className="btn btn_sm btn_ghost" onClick={() => navigate(`${s.no}/edit`)}>
                    관리
                  </button>
                  <button type="button" className="btn btn_sm btn_ghost" onClick={() => viewCctv(s)}>
                    CCTV 보기
                  </button>
                  <button type="button" className="btn btn_sm btn_ghost" onClick={() => moveToAddress(s)}>
                    이동하기
                  </button>
                  {/* <button type="button" className="btn btn_sm btn_danger" onClick={() => setDeleteTarget(s)}>
                    삭제
                  </button> */}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget?.title}
        loading={deleting}
      />
    </section>
  );
}
