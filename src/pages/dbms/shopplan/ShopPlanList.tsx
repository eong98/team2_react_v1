import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AdminToolbar,
  DataTable,
  PageHeader,
  DbmsPagination,
  ConfirmDeleteModal,
  AlertModal,
  Modal,
  type DataTableColumn,
} from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import {
  PAGE_SIZE,
  EMPTY_FILTERS,
  type ShopPlanSearchResult,
  type Filters,
  type ShopPlanTypes,
  type RowType,
} from '../../../components/ts/ShopPlan';

/* ---------------------------------------------------------------------
   구독권 관리(/dbms/shop_plan) - 관리자 목록. 등급 x 기간별로 행이 나뉘어 있습니다
   (예: 프로-6개월, 프로-12개월이 별도 행).

   "미리보기"는 실제 사용자 결제 화면(/user/subscribe STEP2)의 plan_card와
   동일한 마크업/클래스를 재사용해서, 관리자가 저장하기 전/후 사용자 눈에 어떻게
   보일지 그 자리에서 바로 확인할 수 있게 합니다.

   API (ShopPlanCont, /shop_plan)
   GET    /shop_plan/list/admin?word=&pmonth=&issell=&page=&size=  - 검색 + 페이징
   DELETE /shop_plan/{no}

   상수/타입(PAGE_SIZE, Filters, EMPTY_FILTERS, RowType, ShopPlanSearchResult)은
   전부 ./components/ts/ShopPlanAdmin.ts 로 옮겨뒀습니다.
--------------------------------------------------------------------- */

export default function ShopPlanList() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<RowType  | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewTarget, setPreviewTarget] = useState<RowType  | null>(null);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<ShopPlanSearchResult>('/shop_plan/list/admin', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.word.trim() || undefined,
          pmonth: applied.pmonth === '' ? undefined : Number(applied.pmonth),
          issell: applied.issell === '' ? undefined : applied.issell,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      // 전체 건수 기준 내림차순 순번 (다른 admin 목록과 동일 패턴)
      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setRows(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error('구독권 목록 조회 실패:', err);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/shop_plan/${deleteTarget.no}`);
      setDeleteTarget(null);
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadList();
      }
    } catch (err) {
      console.error('삭제 실패:', err);
      setAlert({ message: '삭제 중 오류가 발생했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '100px', mono: true, render: (r) => r.cnt },
    {
      header: '구독권',
      render: (sp) => (
        <div>
          <div className="cell_sub">No.{sp.no}</div>
          <div className="cell_title">{sp.pname}</div>
        </div>
      ),
    },
    { header: '기간', mono: true, render: (sp) => `${sp.pmonth}개월` },
    { header: '대당 단가', mono: true, render: (sp) => `${sp.bprice.toLocaleString('ko-KR')}원` },
    { header: '대수 구간', mono: true, render: (sp) => `${sp.mincctv}~${sp.maxcctv}대` },
    {
      header: '판매 여부',
      width: '90px',
      render: (sp) => (
        <span className={`badge ${sp.issell === 'Y' ? 'badge_success' : 'badge_neutral'}`}>
          {sp.issell === 'Y' ? '판매중' : '판매중지'}
        </span>
      ),
    },
    { header: '등록일', width: '15%', mono: true, render: (sp) => sp.cdate },
    {
      header: '미리보기',
      width: '110px',
      render: (sp) => (
        <button type="button" className="btn btn_xsm btn_ghost" onClick={() => setPreviewTarget(sp)}>
          사용자화면
        </button>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="구독권 관리"
        description="등급·이용기간별 구독권 단가와 CCTV 대수 구간을 관리합니다."
        createLabel="+ 구독권 등록"
        onCreate={() => navigate('new')}
      />

      <AdminToolbar
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        searchPlaceholder="구독권 이름으로 검색"
        onSearchEnter={onSearch}
        filters={
          <>
            <select
              className="form_select"
              value={draft.pmonth}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmonth: e.target.value }))}
              aria-label="이용 기간 필터"
            >
              <option value="">기간 전체</option>
              <option value="6">6개월</option>
              <option value="12">12개월</option>
            </select>

            <select
              className="form_select"
              value={draft.issell}
              onChange={(e) => setDraft((prev) => ({ ...prev, issell: e.target.value }))}
              aria-label="판매 여부 필터"
            >
              <option value="">판매여부 전체</option>
              <option value="Y">판매중</option>
              <option value="N">판매중지</option>
            </select>
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
        columns={columns}
        data={rows}
        rowKey={(sp) => sp.no}
        loading={loading}
        onEdit={(sp) => navigate(`${sp.no}/edit`)}
        onDelete={(sp) => setDeleteTarget(sp)}
        emptyMessage="등록된 구독권이 없습니다."
      />

      <DbmsPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* 사용자 결제화면 카드 미리보기 — /user/subscribe STEP2의 plan_card와 동일 마크업 */}
      <Modal
        open={previewTarget !== null}
        onClose={() => setPreviewTarget(null)}
        titleId="planPreviewTitle"
        title="사용자 화면 미리보기"
        footer={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => setPreviewTarget(null)}>
            닫기
          </button>
        }
      >
        {previewTarget && (
          <div>
            <p className="b_title" style={{ marginBottom: 10 }}>
              사용자가 구독권을 선택하는 화면에 아래처럼 보여집니다.
            </p>
            <div className="plan_grid">
              <div className={`card plan_card${previewTarget.isreco === 'Y' ? ' plan_highlight' : ''}`}>
                {previewTarget.isreco === 'Y' && <span className="plan_tag reco">추천</span>}

                <h3>{previewTarget.pname}</h3>
                
                <div className="plan_range mono">
                  {previewTarget.mincctv} ~ {previewTarget.maxcctv}대
                </div>

                <div className="plan_unit mono">
                  대당 <span className="price">{previewTarget.bprice.toLocaleString('ko-KR')}</span>원 / {previewTarget.pmonth}개월
                </div>

                {previewTarget.description && (
                  <ul>
                    {previewTarget.description.split('|').map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {previewTarget.issell === 'N' && (
              <p className="form_hint error" style={{ marginTop: 10 }}>
                판매중지 상태입니다 — 사용자 화면에 노출되지 않습니다.
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `${deleteTarget.pname} · ${deleteTarget.pmonth}개월` : undefined}
        loading={deleting}
      />

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}