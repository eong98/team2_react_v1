import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable, UserPagination, type DataTableColumn } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
  PAGE_SIZE,
  STATE_LABELS,
  STATE_BADGE,
  EMPTY_FILTERS,
  type CctvSearchResult,
  type CctvType,
  type Filters,
} from '../../../components/ts/CctvUser.ts';
import { GlobalCurrentShop } from '../../../store/UserStore.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 목록(/user/shop/cctv) - 조회 전용. Topbar에서 입장한 매장(GlobalCurrentShop().no)
   소유 CCTV만 노출합니다.

   ⚠️ CCTV 등록/수정/삭제는 관리자(dbms/cctv/CctvList.tsx, CctvForm.tsx) 전용입니다.
     이 화면은 회원번호(로그인 세션)로 진입해서 매장번호(sno)로 걸러진 CCTV 목록을
     "보기"만 할 수 있고, CCTV를 클릭하면 그 CCTV에서 발생한 이슈가 어떻게 처리됐는지
     (/user/shop/cctv-issue?cno=, CctvIssueList.tsx) 확인하는 화면으로 넘어갑니다.

   CCTV 컬럼: no/sno/mac/represent/cname/ckdate/state/cdate

   API (CctvCont, /cctv)
   GET /cctv/search?sno=&keyword=&page=&size=  (조회 전용)
     → { content, totalElements, totalPages, page(0-base), size }

   ⚠️ 아직 CCTV 등록 기능이 방금 만들어져서(관리자 dbms/cctv) 데이터가 없는 동안은
     항상 빈 목록으로 보이는 게 정상입니다. 관리자가 CCTV를 등록하면 그대로 노출됩니다.

   상수/타입(PAGE_SIZE, STATE_LABELS, STATE_BADGE, Filters, EMPTY_FILTERS, CctvType,
   CctvSearchResult)은 전부 ./components/ts/CctvUser.ts 로 옮겨뒀습니다.
--------------------------------------------------------------------- */

export default function CctvListView() {
  const navigate = useNavigate();
  const shopNo = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);

  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<CctvType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadList = async () => {
    if (!shopNo) {
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.get<CctvSearchResult>('/cctv/search', {
        params: {
          sno: shopNo,
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
      console.error('CCTV 목록 조회 실패:', err);
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
  }, [shopNo, applied, page]);

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

  const viewIssues = (cctv: CctvType) => {
    navigate(`/user/cctvissue?cno=${cctv.no}`);
  };

  /* ---- 매장 미선택 시 안내 ---- */
  if (!shopNo) {
    return (
      <section className="view active">
        <PageHeader title="CCTV 목록" description="매장을 선택하면 해당 매장의 CCTV 목록을 확인할 수 있습니다." />
        <div
          className="card card_pad_lg"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-faint)',
          }}
        >
          <p className="b_title">먼저 관리할 매장을 선택해주세요.</p>
          <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
            매장 선택하러 가기
          </button>
        </div>
      </section>
    );
  }

  const columns: DataTableColumn<CctvType>[] = [
    {
      header: 'CCTV명',
      width: '22%',
      render: (r) => (
        <div>
          <div className="cell_title">{r.cname || '(이름 없음)'}</div>
          <div className="cell_sub">No.{r.no}</div>
        </div>
      ),
    },
    { header: 'MAC 주소', width: '160px', mono: true, render: (r) => r.mac || '-' },
    {
      header: '대표',
      width: '70px',
      render: (r) => (
        <span className={`badge ${r.represent === 'Y' ? 'badge_info' : 'badge_neutral'}`}>
          {r.represent === 'Y' ? '대표' : '-'}
        </span>
      ),
    },
    {
      header: '상태',
      width: '90px',
      render: (r) => (
        <span className={`badge ${STATE_BADGE[r.state] ?? 'badge_neutral'}`}>{STATE_LABELS[r.state] ?? r.state}</span>
      ),
    },
    { header: '최근 점검일', width: '110px', mono: true, render: (r) => r.ckdate || '-' },
    { header: '등록일', width: '110px', mono: true, render: (r) => r.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="CCTV 목록"
        description={`${shopTitle || '선택한 매장'}에 설치된 CCTV 장비입니다. CCTV를 선택하면 해당 카메라에서 발생한 이슈가 어떻게 처리됐는지 확인할 수 있습니다.`}
      />

      <Filterbar
        left={
          <span className="pagination_info">
            전체 <em className="b_num">{totalElements}</em>건 중 {from}–{to}건 표시
          </span>
        }
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="CCTV명·MAC주소로 검색"
        onSearchEnter={onSearch}
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

      <DataTable<CctvType>
        columns={columns}
        data={rows}
        rowKey={(r) => r.no}
        loading={loading}
        onEdit={viewIssues}
        editLabel="이슈 보기"
        emptyMessage="등록된 CCTV가 없습니다. 관리자에게 CCTV 등록을 요청해주세요."
      />

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />
    </section>
  );
}
