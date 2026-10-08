import { useEffect, useState } from 'react';
import axios from 'axios';
import { axiosInstance } from '../../../utils/Tool';
import { usePaging } from '../../../hooks/usePaging';
import { AdminToolbar, AlertModal, ConfirmDeleteModal, DataCard, DbmsPagination, PageHeader, type DataCardColumn } from '../../../components/ui';
import { EMPTY_FILTERS, NOTICE_TYPE_MAP, PAGE_SIZE, type Filters, type NoticeSearchResult, type NoticeTypes } from '../../../components/ts/NoticeType';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { ATTACH_BOARD_LABEL, deleteAttachByBno } from '../../../components/ts/Attach';
import { useTab } from '../../../hooks/useTab';

/** 관리자 탭 — 공지사항 / 삭제된 공지(영구 삭제) */
type NoticeTabKey = 'list' | 'deleted';

export default function NoticeList() {
  const { no:ano, grade } = GlobalStoreSession();

  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/dbms/notice' });
  const { tab, changeTab } = useTab<NoticeTabKey>({ defaultTab: 'list', resetParamsOnTabChange: ['page'] });

  /* API 데이터 저장 */
  const [noticeList, setNoticeList] = useState<NoticeTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /* 필터바 설정 */
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
    
  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);
  
  // 삭제 모달 대상 Q&A 및 삭제 중 상태
  const [deleteTarget, setDeleteTarget] = useState<NoticeTypes | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  // 삭제된 공지 영구 삭제 대상
  const [purgeTarget, setPurgeTarget] = useState<NoticeTypes | null>(null);
  const [purging, setPurging] = useState<boolean>(false);
  

  const loadNoticeList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<NoticeSearchResult>(tab === 'deleted' ? '/notice/deleted' : '/notice/list/admin', {
        headers: {
          accessNo: String(ano),
          grade: String(grade),
        },
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
          type: applied.type === '' ? undefined : Number(applied.type),
          vmode: tab === 'list' && applied.vmode !== '' ? applied.vmode : undefined
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      // 삭제 등으로 인해 "지금 있는 페이지"에 데이터가 하나도 없는데 1페이지는 아닌 경우
      // (예: 2페이지 마지막 1건을 상세페이지에서 지우고 돌아온 경우) 한 페이지 앞으로 자동 보정합니다.
      // setPage가 바뀌면 이 useEffect가 page를 다시 의존성으로 갖고 있어서 알아서 재조회됩니다.
      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      // [가상 번호 생성] 전체 데이터 개수 기준 내림차순 순번(cnt) 계산하여 각 로우에 추가
      // 공식: 전체개수 - (현재페이지 * 페이지크기 + 인덱스)
      const withCnt: NoticeTypes[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setNoticeList(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages)); // 최소 1페이지 보장
      
    } catch (error) {
      console.error('목록 조회 실패:', error);
      
      setNoticeList([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };


  /* Effect 및 이벤트 핸들러 */
  useEffect(() => {
    loadNoticeList();
  }, [tab, applied, page]);

  
  // [검색 버튼 클릭] 현재 작성 중인 draft 값을 applied로 확정짓고 1페이지로 이동
  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  // 필터 입력값(draft)/적용값(applied) 초기화. page는 여기서 안 건드림 — 필요한 곳에서 따로 처리
  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  // [초기화 버튼 클릭] 모든 필터 조건을 초기화하고 1페이지로 이동
  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  /** 삭제 핸들러 (비밀번호 입력) */
  const handleDeleteWithPw = async (inputPw: string = '') => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      // Axios DELETE 요청 시 Body로 데이터를 전달할 때는 { data: ... } 옵션을 사용합니다.
      await axiosInstance.delete('/notice', {
        data: {
          no: deleteTarget.no,
          pw: inputPw,
        },
      });
      // 글 삭제가 성공한 뒤에만 첨부파일 삭제 (게시판 구분 tname 포함)
      await deleteAttachByBno(deleteTarget.no, ATTACH_BOARD_LABEL[1].table);
      
      // 빈 페이지 보정(현재 페이지에 데이터가 없으면 한 칸 앞으로)은 이제 loadQaList 안에서
      // 알아서 처리하므로, 여기서는 그냥 다시 조회하면 됩니다.
      setAlert({
        message: '삭제되었습니다.',
        variant: 'success',
        onConfirm: loadNoticeList,
      });
      setDeleteTarget(null);

    } catch (error) {
      console.error('삭제 실패:', error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status; // HTTP 상태 코드 (400, 401, 404, 500 등)
        const data = error.response?.data; // 백엔드가 보내준 JSON 데이터
                // ----------------------------------------------------
        // 1. HTTP 상태 코드(Status)에 따른 에러 처리
        // ----------------------------------------------------
        if (status === 400 || status === 401) {
          // 비밀번호 틀림 / 잘못된 입력값인 경우
          // const msg = data?.message || '비밀번호가 올바르지 않거나 입력값이 잘못되었습니다.';
          // alert(msg);

        } else if (status === 404) {
          // 존재하지 않는 글번호(no)인 경우
          setAlert({ message: '존재하지 않거나 이미 삭제된 FAQ입니다.', variant: 'error' });

        } else if (status === 500) {
          // 🚨 500 에러일 때: 백엔드 메시지에 "비밀번호"라는 단어가 포함되어 있는지 체크
          if (data?.message?.includes('비밀번호') || data?.message?.includes('password')) {
            setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
          } else {
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.', variant: 'error' });
          }
          
        } else {
          // 기타 상태 코드 처리
          setAlert({ message: `오류가 발생했습니다. (에러 코드: ${status || 'Unknown'})`, variant: 'error' });
        }
        
      } else {
        // Axios 에러가 아닌 일반 자바스크립트 오류
        setAlert({ message: '알 수 없는 오류가 발생했습니다.' , variant: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };

  /** 삭제된 공지 영구 삭제 — 성공한 뒤에만 첨부파일도 정리 */
  const handlePurge = async () => {
    if (!purgeTarget) return;
    setPurging(true);
    try {
      await axiosInstance.delete(`/notice/deleted/${purgeTarget.no}`);
      await deleteAttachByBno(purgeTarget.no, ATTACH_BOARD_LABEL[1].table);

      setPurgeTarget(null);
      setAlert({ message: '영구 삭제되었습니다.', variant: 'success', onConfirm: loadNoticeList });
    } catch (error) {
      console.error('영구 삭제 실패:', error);
      setPurgeTarget(null);
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      setAlert({ message: message || '영구 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.', variant: 'error' });
    } finally {
      setPurging(false);
    }
  };

  /** 탭 전환 — 검색 조건 초기화 (page는 useTab이 지움) */
  const handleTabChange = (next: NoticeTabKey) => {
    changeTab(next, () => {
      setDraft({ ...EMPTY_FILTERS });
      setApplied({ ...EMPTY_FILTERS });
    });
  };

  // ==========================================
  // DataCard 컬럼 정의
  // ==========================================
  const noticeColumns: DataCardColumn<NoticeTypes>[] = [
    {
      header: '고정여부',
      render: (n) => {
        if (n.fixyn !== 'Y') return null
        return (
        <div className='icon_row'>
          <div className='icon pin'>
            <span className='hidden'>상단 고정</span>
          </div>
        </div>
      )},
    },
    {
      header: '상태',
      render: (n) => (
        <div className='badge_area'>
          <span className={`badge ${NOTICE_TYPE_MAP[n.type].className}`}>
            {NOTICE_TYPE_MAP[n.type].label}
          </span>
        </div>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <div className="lt">
          <div className="cell_title">
            <button type='button' className='link' onClick={() => navigateWithQuery(`${n.no}`)}>
              {n.title}
              {n.vmode === 'N' ? 
                (<span className='lock'>
                  <span className='hidden'>비밀글</span>
                </span> ) : null
              }
            </button>
          </div>
          <div className="cell_sub">
            {n.cdate.split(' ')[0]} · 조회수 {n.vcnt}
          </div>
        </div>
      ),
    },
    {
      header: '파일 정보',
      render: (n) => {
        if (n.fileyn !== 'Y') return null;
        
        return (
          <div className="me">
            <div className='icon_row'>
              <div className='icon file'>
                <span className='hidden'>첨부파일 포함</span>
              </div>
            </div>
          </div>
        )
      },
    },
  ];

  /** 삭제된 공지 — 상세로 들어갈 수 없으므로 내용 일부를 목록에서 보여줌 */
  const deletedColumns: DataCardColumn<NoticeTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <div className='badge_area'>
          <span className={`badge ${NOTICE_TYPE_MAP[n.type]?.className ?? ''}`}>
            {NOTICE_TYPE_MAP[n.type]?.label}
          </span>
        </div>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <div className="lt">
          <div className="cell_title">
            No.{n.no} {n.title}
            {n.vmode === 'N' && (
              <span className='lock'>
                <span className='hidden'>비공개</span>
              </span>
            )}
          </div>
          <div className="cell_sub">
            {n.content && n.content.length > 60 ? `${n.content.slice(0, 60)}…` : n.content}
          </div>
          <div className="cell_sub">
            작성 {n.cdate?.split(' ')[0]} · 삭제 {n.ddate?.split(' ')[0] ?? '-'} · 조회수 {n.vcnt}
          </div>
        </div>
      ),
    },
    {
      header: '파일 정보',
      render: (n) => {
        if (n.fileyn !== 'Y') return null;
        return (
          <div className="me">
            <div className='icon_row'>
              <div className='icon file'>
                <span className='hidden'>첨부파일 포함</span>
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="공지사항"
        description="서비스 업데이트와 점검 안내를 관리할 수 있습니다."
        createLabel={tab === 'list' ? '+ 공지사항 작성' : undefined}
        onCreate={() => navigateWithQuery('new')}
      />

      <div className="tabs" role="tablist" aria-label="공지사항 보기 전환">
        {(['list', 'deleted'] as NoticeTabKey[]).map((tKey) => {
          const labels: Record<NoticeTabKey, string> = { list: '공지사항', deleted: '삭제된 공지' };
          return (
            <button
              key={tKey}
              type="button"
              role="tab"
              className={`tab${tab === tKey ? ' on' : ''}`}
              aria-selected={tab === tKey}
              onClick={() => handleTabChange(tKey)}
            >
              {labels[tKey]}
            </button>
          );
        })}
      </div>

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder='제목·내용으로 검색'
        filters={
          <>
            {/* 유형 필터 */}
            <select
              className="form_select"
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
              aria-label="유형 필터"
              title='유형 선택'
            >
              <option value="">유형 전체</option>
              {Object.entries(NOTICE_TYPE_MAP).map(([type, {label}]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>

            {/* 공개여부 필터 (공지사항 탭에서만) */}
            {tab === 'list' && (
            <select
              className="form_select"
              value={draft.vmode}
              onChange={(e) => setDraft((prev) => ({ ...prev, vmode: e.target.value }))}
              aria-label="공개여부 필터"
              title='공개여부 선택'
            >
              <option value="">공개여부 전체</option>
              <option value="Y">전체공개</option>
              <option value="N">비공개</option>
            </select>
            )}
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

      {tab === 'deleted' ? (
        <>
          <p className="cell_sub" style={{ margin: '0 0 12px' }}>
            삭제한 공지사항입니다. [영구 삭제]하면 DB와 첨부파일에서 완전히 지워지며 복구할 수 없습니다.
          </p>
          <DataCard
            columns={deletedColumns}
            data={noticeList}
            rowKey={(n) => n.no}
            loading={loading}
            emptyMessage="삭제된 공지사항이 없습니다."
            onDelete={(n) => setPurgeTarget(n)}
            deleteLabel="영구 삭제"
          />
        </>
      ) : (
        <DataCard
          columns={noticeColumns}
          data={noticeList}
          rowKey={(n) => n.no}
          loading={loading}
          emptyMessage="등록된 공지사항이 없습니다."
          onEdit={(n) => navigateWithQuery(`${n.no}/edit`)}
          onDelete={(n) => setDeleteTarget(n)}
        />
      )}

      {/* 페이지네이션 컴포넌트 */}
      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* 삭제된 공지 영구 삭제 확인 */}
      <ConfirmDeleteModal
        open={purgeTarget !== null}
        onClose={() => setPurgeTarget(null)}
        onConfirm={handlePurge}
        loading={purging}
        title="영구 삭제하시겠습니까?"
        description="공지사항과 첨부파일이 완전히 지워지며 복구할 수 없습니다."
        targetLabel={purgeTarget ? `No.${purgeTarget.no} · ${purgeTarget.title}` : undefined}
      />

      {/* 🔑 삭제 확인 모달 (수정됨) */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(pw) => handleDeleteWithPw(pw)}
        loading={deleting}
        targetLabel={
          deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined
        }
        requirePassword={true}
      />

      
      
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />

    </section>
  );
}