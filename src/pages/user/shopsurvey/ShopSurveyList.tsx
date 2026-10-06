import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  DataTable,
  UserPagination,
  Filterbar,
  AlertModal,
  type DataTableColumn,
} from '../../../components/ui/index.ts';
import { axiosInstance } from '../../../utils/Tool.ts';
import { GlobalCurrentShop } from '../../../store/UserStore.ts';
import {
  SHOP_SURVEY_BASE,
  SHOP_SURVEY_PAGE_SIZE,
  SHOP_SURVEY_STATUS_BADGE,
  SHOP_SURVEY_STATUS_FILTERS,
  SHOP_SURVEY_STATUS_LABEL,
  getShopSurveyErrorMessage,
  type ShopSurveyListItem,
  type ShopSurveyPage,
  type ShopSurveyRow,
  type ShopSurveyStatus,
} from '../../../components/ts/ShopSurvey.ts';
import ShopSurveyQrModal from './ShopSurveyQrModal.tsx';
import './shopSurvey.css';

/* ---------------------------------------------------------------------
   매장 설문 목록 (/user/shopsurvey)

   Topbar에서 입장한 매장(GlobalCurrentShop().no)의 설문만 보여줍니다.
   - 상태 필터: 칩(전체/진행중/작성중/종료). 칩 클릭 시 바로 조회
   - QR: 고객 응답 URL을 QR코드로 보여주고 PNG로 저장
   - 보기: 설문 상세(/user/shopsurvey/{svno}) - 집계 / 응답 목록 / 문항
            작성중(DRAFT)은 바로 작성 화면(/user/shopsurvey/{svno}/edit)으로 이동
   - + 설문 만들기: /user/shopsurvey/new

   API (ShopSurveyCont, /shop_survey)
   GET /shop_survey/list/{sno}?status=&page=&size=
     → { content, page(0-base), size, totalElements, totalPages }
--------------------------------------------------------------------- */

export default function ShopSurveyList() {
  const navigate = useNavigate();
  const shopNo = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);

  const [status, setStatus] = useState<'' | ShopSurveyStatus>('');
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<ShopSurveyRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [qrTarget, setQrTarget] = useState<ShopSurveyRow | null>(null);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

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
      const res = await axiosInstance.get<ShopSurveyPage<ShopSurveyListItem>>(`/shop_survey/list/${shopNo}`, {
        params: {
          status: status || undefined,
          page: page - 1,
          size: SHOP_SURVEY_PAGE_SIZE,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;
      setRows(content.map((item, idx) => ({ ...item, cnt: total - (serverPage * size + idx) })));
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error('매장 설문 목록 조회 실패:', err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      setAlert({ message: getShopSurveyErrorMessage(err, '설문 목록을 불러오지 못했습니다.'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopNo, status, page]);

  const onStatusChange = (value: '' | ShopSurveyStatus) => {
    if (value === status) return;
    setPage(1);
    setStatus(value);
  };

  /* ---- 매장 미선택 시 안내 ---- */
  if (!shopNo) {
    return (
      <section className="view active shop-survey-page">
        <PageHeader title="고객 설문" description="매장을 선택하면 해당 매장의 고객 설문을 확인할 수 있습니다." />
        <div className="card card_pad_lg shop_survey_empty">
          <p className="b_title">먼저 관리할 매장을 선택해주세요.</p>
          <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
            매장 선택하러 가기
          </button>
        </div>
      </section>
    );
  }

  const columns: DataTableColumn<ShopSurveyRow>[] = [
    { header: '번호', width: '64px', mono: true, render: (r) => r.cnt },
    {
      header: '설문제목',
      width: '34%',
      render: (r) => (
        <button
          type="button"
          className="shop_survey_link"
          onClick={() => navigate(r.status === 'DRAFT' ? `${SHOP_SURVEY_BASE}/${r.no}/edit` : `${SHOP_SURVEY_BASE}/${r.no}`)}
        >
          <span className="shop_survey_link_title">
            {r.title}
          </span>
          {r.description && <span className="cell_sub shop_survey_link_desc">{r.description}</span>}
        </button>
      ),
    },
    {
      header: '상태',
      width: '10%',
      render: (r) => (
        <span className="badge_area">
          <span className={`badge ${SHOP_SURVEY_STATUS_BADGE[r.status] ?? 'badge_neutral'}`}>
            {SHOP_SURVEY_STATUS_LABEL[r.status] ?? r.status}
          </span>
          {r.aiyn === 1 && <span className="badge badge_info">AI</span>}
        </span>
      ),
    },
    {
      header: '문항',
      width: '8%',
      mono: true,
      render: (r) => (r.status === 'DRAFT' ? <span className="cell_sub">-</span> : r.questionCount),
    },
    { header: '응답', width: '8%', mono: true, render: (r) => r.responseCount },
    { header: '등록일', width: '16%', mono: true, render: (r) => r.cdate?.slice(0, 10) },
    {
      header: 'QR코드',
      width: '10%',
      render: (r) =>
        r.status === 'DRAFT' ? (
          <span className="cell_sub">게시 후</span>
        ) : (
          <button type="button" className="btn btn_xsm btn_outline_primary" onClick={() => setQrTarget(r)}>
            QR 보기
          </button>
        ),
    },
  ];

  return (
    <section className="view active shop-survey-page">
      <PageHeader
        title="고객 설문"
        description={`${shopTitle || '선택한 매장'}에 방문한 고객 대상 설문입니다. QR코드를 매장에 붙여두면 고객이 휴대폰으로 바로 응답할 수 있어요.`}
        createLabel="+ 설문 만들기"
        onCreate={() => navigate(`${SHOP_SURVEY_BASE}/new`)}
      />

      <Filterbar
        page={page}
        pageSize={SHOP_SURVEY_PAGE_SIZE}
        totalCount={totalElements}
        filters={
          <div className="chip_select" role="group" aria-label="상태 필터">
            {SHOP_SURVEY_STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                className={`chip_opt${status === f.value ? ' on' : ''}`}
                aria-pressed={status === f.value}
                onClick={() => onStatusChange(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <DataTable<ShopSurveyRow>
        columns={columns}
        data={rows}
        rowKey={(r) => r.no}
        loading={loading}
        onEdit={(r) => navigate(r.status === 'DRAFT' ? `${SHOP_SURVEY_BASE}/${r.no}/edit` : `${SHOP_SURVEY_BASE}/${r.no}`)}
        editLabel="보기"
        emptyMessage={status ? '조건에 맞는 설문이 없습니다.' : '등록된 설문이 없습니다.'}
      />

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={SHOP_SURVEY_PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />

      {qrTarget && (
        <ShopSurveyQrModal
          open={qrTarget !== null}
          onClose={() => setQrTarget(null)}
          qrid={qrTarget.qrid}
          title={qrTarget.title}
          isOpen={qrTarget.status === 'OPEN'}
        />
      )}

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}
