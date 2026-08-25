import { useEffect, useState } from "react";
import { EMPTY_FILTERS, PAGE_SIZE, type Filters, type AttachSearchResult, type AttachType, ATTACH_TYPE_LABEL, ATTACH_BOARD_LABEL, formatFileSize } from "../../../components/ts/Attach";
import { usePaging } from "../../../hooks/usePaging";
import { GlobalStoreSession } from "../../../store/LoginStore";
import { axiosInstance, getAttachUrl } from "../../../utils/Tool";
import { AdminToolbar, DataTable, DbmsPagination, PageHeader, type DataTableColumn } from "../../../components/ui";

export default function AttachList() {
  // const { no:ano, id, grade } = GlobalStoreSession();
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/dbms/attach' });
  
  // const { navigateWithQuery } = usePaging({ basePath: `/dbms/${tname}/${bno}` });

  /* API 데이터 저장 */
  const [attachList, setAttachList] = useState<AttachType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /* 필터바 설정 */
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
    
  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);
  
  /* 게시판 구분 드롭다운 적용 필터 */
  const [boardOptions, setBoardOptions] = useState<{ tno: number; name: string }[]>([]);

  /* 2. attachList 변경 시 새로운 tno 정보가 있으면 기존 옵션에 누적 추가 */
  useEffect(() => {
    if (attachList.length === 0) return;

    setBoardOptions((prev) => {
      // 기존 옵션들을 Map으로 구성
      const optionMap = new Map(prev.map((opt) => [opt.tno, opt]));
      
      // 현재 attachList 데이터의 tno 정보를 Map에 추가 (중복 자동 제거)
      attachList.forEach((item) => {
        if (item.tno !== undefined && !optionMap.has(item.tno)) {
          const board = Object.values(ATTACH_BOARD_LABEL).find(
            (b) => b.table === item.tname
          );
          optionMap.set(item.tno, {
            tno: item.tno,
            name: board?.name ?? item.tname,
          });
        }
      });

      return Array.from(optionMap.values());
    });
  }, [attachList]);

  const loadAttachList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<AttachSearchResult>('/attach/list/admin', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.word.trim() || undefined,
          tno: applied.tno === '' ? undefined : Number(applied.tno),
          type: applied.type === '' ? undefined : Number(applied.type),
          cdate: applied.cdate || undefined,
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
      const withCnt: AttachType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));


      setAttachList(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages)); // 최소 1페이지 보장
      
    } catch (error) {
      console.error('목록 조회 실패:', error);
      
      setAttachList([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };


  /* Effect 및 이벤트 핸들러 */
  useEffect(() => {
    loadAttachList();
  }, [applied, page]);

  
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

  
  /** 파일명에서 확장자만 뽑아 대문자로 (예: 'photo.jpg' -> 'JPG') */
  function getExt(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot === -1 ? '' : name.slice(dot + 1).toUpperCase();
  }


  const columns: DataTableColumn<AttachType>[] = [
    {
      header: '게시판 정보',
      width: '10%',
      render: (a) => {// ATTACH_BOARD_LABEL 객체를 배열로 변환하여 tname과 일치하는 항목을 검색
        const boardInfo = Object.values(ATTACH_BOARD_LABEL).find(
          (board) => board.table === a.tname
        );

        return (
          <div>
            <div className="cell_sub">No.{a.tno}</div>
            <div className="cell_title">{boardInfo?.name ?? a.tname}</div>
          </div>
        );
      },
    },
    {
      header: '파일명',
      render: (a) => (
        <div>
          <div className="cell_sub">No.{a.no}</div>
          <div className="cell_title">{a.name.split('.')[0]}</div>
        </div>
      ),
    },
    {
      header: '저장경로',
      width: '30%',
      render: (a) => (
        <div>
          <div className="cell_title">{a.purl}</div>
        </div>
      ),
    },
    {
      header: '구분',
      width: '9%',
      render: (a) => (
        <div>
          <div className="cell_sub">{ATTACH_TYPE_LABEL[a.type]} · {getExt(a.name)}</div>
        </div>
      ),
    },
    {
      header: '크기',
      width: '5%',
      render: (a) => (
        <div>
          <div className="cell_sub">{formatFileSize(a.fsize)}</div>
        </div>
      ),
    },
    {
      header: '등록일',
      width: '11%',
      render: (a) => (
        <div>
          <div className="cell_sub">{a.cdate}</div>
        </div>
      ),
    },
    {
      header: '이동',
      width: '120px',
      render: (a) => (
        <div className="actions">
          {a.tno !== 10 && (
            <button type="button" className="btn btn_sm btn_ghost" onClick={() => navigateWithQuery(`/dbms/${a.tname.toLowerCase()}/${a.bno}`)}>
              게시글로 이동
            </button>
          )}
        </div>
      ),
    },
  ];




  return (
    <section className="view active">
      <PageHeader
        title="첨부파일 관리"
        description="등록된 첨부파일의 상세정보를 확인합니다."
      />

      <AdminToolbar
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder='파일명으로 검색'
        filters={
          <>
            {/* 게시판 필터 */}
            <select
              className="form_select"
              value={draft.tno}
              onChange={(e) => setDraft((prev) => ({ ...prev, tno: e.target.value }))}
              aria-label="게시판 구분 필터"
              title='게시판 구분 선택'
            >
              <option value="">구분 전체</option>
              {boardOptions.map(({ tno, name }) => (
                <option key={tno} value={tno}>
                  {name}
                </option>
              ))}
            </select>

            {/* 타입 필터 */}
            <select
              className="form_select"
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
              aria-label="첨부파일 구분 필터"
              title='첨부파일 구분 선택'
            >
              <option value="">구분 전체</option>
              {Object.entries(ATTACH_TYPE_LABEL).map(([type, value]) => (
                <option key={type} value={type}>
                  {value}
                </option>
              ))}
            </select>

            
            <input
              type="date"
              className="form_input"
              value={draft.cdate}
              onChange={(e) => setDraft((prev) => ({ ...prev, cdate: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="등록일 시작"
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
      {/* onClick={() => navigateWithQuery(`/dbms/${a.tname.toLowerCase()}/${a.bno}`)} */}

      <DataTable
        columns={columns}
        data={attachList}
        rowKey={(a) => a.no}
        loading={loading}
      />
      

      {/* 페이지네이션 컴포넌트 */}
      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </section>
  );
}