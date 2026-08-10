import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, ConfirmDeleteModal, DbmsPagination } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool.ts';
import type { InMenuType } from './InMenu.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   관리자 메뉴 목록(/dbms/menu)

   - 대표 메뉴(dept=1)를 그룹 카드로 보여주고, 그 안에 하위 메뉴(dept=2)를
     들여쓰기된 목록으로 붙여서 트리처럼 표시합니다.
   - 대표 메뉴 그룹은 PAGE_SIZE개씩 페이지네이션됩니다(하위 메뉴는 그룹 안에서
     전부 다 보여줌 - 그룹당 하위 메뉴 개수는 많지 않다는 전제).
   - "마우스 드래그"로 순서(ord)를 바로 바꿀 수 있습니다.
       · 대표 메뉴 카드끼리 드래그 → 대표 메뉴들 순서 변경 (페이지가 달라도
         드래그 자체는 항상 화면에 보이는 카드끼리만 가능)
       · 같은 그룹 안의 하위 메뉴끼리 드래그 → 그 그룹 내 하위 메뉴 순서 변경
       · 다른 그룹으로 하위 메뉴를 옮기는 것(상위 메뉴 변경)은 지원하지 않음 →
         상위 메뉴를 바꾸고 싶으면 수정 화면에서 "상위 메뉴" select로 변경.
   - 드래그가 끝나면(마우스를 놓으면) 순서가 바뀐 항목만 골라
     PUT /inmenu/update 로 즉시 저장합니다(별도 "저장" 버튼 없음).

   API (InMenuCont, /inmenu)
   GET    /inmenu/find_by_fkno            - 대표 메뉴 목록(fkno=null)
   GET    /inmenu/find_by_fkno?fkno={no}  - 해당 대표 메뉴의 하위 메뉴 목록
   PUT    /inmenu/update                  - 순서(ord) 변경 저장 (InMenuDTO 전체 필드 필요)
   DELETE /inmenu/{pk}                    - 삭제
--------------------------------------------------------------------- */

const PAGE_SIZE = 10; // 대표 메뉴(1뎁스) 기준, 한 페이지에 보여줄 그룹 개수

export default function InMenuListView() {
  const navigate = useNavigate();

  const [topList, setTopList] = useState<InMenuType[]>([]);
  const [childMap, setChildMap] = useState<Record<number, InMenuType[]>>({});
  const [loading, setLoading] = useState(true);
  const [reorderingKey, setReorderingKey] = useState<string | null>(null); // "top" | `child:${fkno}`
  const [deleteTarget, setDeleteTarget] = useState<InMenuType | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  // 드래그 중에도 항상 최신 상태를 참조하기 위한 ref
  const topListRef = useRef<InMenuType[]>([]);
  const childMapRef = useRef<Record<number, InMenuType[]>>({});
  useEffect(() => { topListRef.current = topList; }, [topList]);
  useEffect(() => { childMapRef.current = childMap; }, [childMap]);

  const loadAll = () => {
    setLoading(true);
    axiosInstance
      .get('/inmenu/find_by_fkno')
      .then(res => res.data as InMenuType[])
      .then(async (tops) => {
        const sortedTops = [...tops].sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
        setTopList(sortedTops);

        const entries = await Promise.all(
          sortedTops.map(async (t) => {
            const childRes = await axiosInstance.get('/inmenu/find_by_fkno', {
              params: { fkno: t.no },
            });
            const children = (childRes.data as InMenuType[]).sort(
              (a, b) => (a.ord ?? 0) - (b.ord ?? 0)
            );
            return [t.no as number, children] as const;
          })
        );

        setChildMap(Object.fromEntries(entries));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const totalPages = Math.max(1, Math.ceil(topList.length / PAGE_SIZE));
  const pagedTopList = topList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 삭제 등으로 목록이 줄어들어 현재 페이지가 범위를 벗어나면 마지막 페이지로 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleCollapse = (no: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  const askDelete = (item: InMenuType) => setDeleteTarget(item);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axiosInstance.delete(`/inmenu/${deleteTarget.no}`);
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.');
    }
  };

  /**
   * 배열 순서를 기준으로 ord(0,1,2...)를 다시 매기고,
   * 실제로 ord가 바뀐 항목만 서버에 저장합니다.
   * update()는 DTO 전체 필드를 그대로 덮어쓰므로, 기존에 불러온 항목
   * 전체(title/purl/... 포함)를 그대로 보내고 ord만 바꿔서 보냅니다.
   */
  const persistOrder = async (list: InMenuType[]): Promise<InMenuType[]> => {
    const changed = list.filter((item, idx) => (item.ord ?? 0) !== idx);
    const reindexed = list.map((item, idx) => ({ ...item, ord: idx }));

    if (changed.length === 0) return reindexed;

    try {
      await Promise.all(
        changed.map((item) => {
          const idx = list.indexOf(item);
          return axiosInstance.put('/inmenu/update', { ...item, ord: idx });
        })
      );
    } catch (err) {
      console.error(err);
      alert('순서 저장에 실패했습니다. 목록을 다시 불러옵니다.');
      loadAll();
    }

    return reindexed;
  };

  // ------------------------------------------------------------------
  // 대표 메뉴(1뎁스) 드래그
  // ------------------------------------------------------------------
  const [dragTopNo, setDragTopNo] = useState<number | null>(null);
  const [overTopNo, setOverTopNo] = useState<number | null>(null);

  const onTopDragStart = (no: number) => (e: DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragTopNo(no);
  };

  const onTopDragOver = (no: number) => (e: DragEvent) => {
    e.preventDefault();
    setOverTopNo(no);
    if (dragTopNo === null || dragTopNo === no) return;

    setTopList(prev => {
      const from = prev.findIndex(m => m.no === dragTopNo);
      const to = prev.findIndex(m => m.no === no);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const onTopDragEnd = async () => {
    setDragTopNo(null);
    setOverTopNo(null);
    setReorderingKey('top');
    const saved = await persistOrder(topListRef.current);
    setTopList(saved);
    setReorderingKey(null);
  };

  // ------------------------------------------------------------------
  // 하위 메뉴(2뎁스) 드래그 - 같은 그룹(fkno) 안에서만 이동 가능
  // ------------------------------------------------------------------
  const [dragChild, setDragChild] = useState<{ fkno: number; no: number } | null>(null);
  const [overChildNo, setOverChildNo] = useState<number | null>(null);

  const onChildDragStart = (fkno: number, no: number) => (e: DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    setDragChild({ fkno, no });
  };

  const onChildDragOver = (fkno: number, no: number) => (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragChild || dragChild.fkno !== fkno) return; // 다른 그룹으로는 이동 불가
    setOverChildNo(no);
    if (dragChild.no === no) return;

    setChildMap(prev => {
      const list = prev[fkno] ?? [];
      const from = list.findIndex(c => c.no === dragChild.no);
      const to = list.findIndex(c => c.no === no);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, [fkno]: next };
    });
  };

  const onChildDragEnd = (fkno: number) => async (e: DragEvent) => {
    e.stopPropagation();
    setDragChild(null);
    setOverChildNo(null);
    setReorderingKey(`child:${fkno}`);
    const saved = await persistOrder(childMapRef.current[fkno] ?? []);
    setChildMap(prev => ({ ...prev, [fkno]: saved }));
    setReorderingKey(null);
  };

  return (
    <section className="view active">
      <PageHeader
        title="관리자메뉴생성"
        description="대표 메뉴 카드끼리, 또는 같은 그룹의 하위 메뉴끼리 마우스로 끌어서 순서를 바꿀 수 있습니다."
        createLabel="+ 메뉴생성"
        onCreate={() => navigate('new')}
      />

      {loading ? (
        <div className="card card_pad_lg">
          <p className="b_title">불러오는 중...</p>
        </div>
      ) : topList.length === 0 ? (
        <div className="card card_pad_lg">
          <p className="b_title">등록된 메뉴가 없습니다.</p>
        </div>
      ) : (
        <div className="menu_reorder_list">
          {pagedTopList.map((top) => {
            const children = childMap[top.no ?? -1] ?? [];
            const isCollapsed = collapsed.has(top.no ?? -1);

            return (
              <div
                key={top.no}
                className={`menu_group${dragTopNo === top.no ? ' dragging' : ''}${
                  overTopNo === top.no && dragTopNo !== null && dragTopNo !== top.no ? ' drag_over' : ''
                }`}
              >
                <div
                  className="menu_group_head"
                  draggable
                  onDragStart={onTopDragStart(top.no as number)}
                  onDragOver={onTopDragOver(top.no as number)}
                  onDragEnd={onTopDragEnd}
                >
                  <span className="menu_drag_handle" title="드래그해서 순서 변경">
                    <GripIcon />
                  </span>

                  <span className="menu_ord_badge">{(top.ord ?? 0) + 1}</span>

                  <button
                    type="button"
                    className="menu_collapse_btn"
                    onClick={() => toggleCollapse(top.no as number)}
                    aria-label={isCollapsed ? '펼치기' : '접기'}
                  >
                    {isCollapsed ? '▸' : '▾'}
                  </button>

                  <div className="menu_group_title">
                    <span className="cell_title">{top.title}</span>
                    <span className="cell_sub mono">{top.purl}</span>
                    {top.useYn === 'N' && <span className="badge badge_neutral">미사용</span>}
                    {reorderingKey === 'top' && <span className="cell_sub">저장 중...</span>}
                  </div>

                  <div className="menu_group_actions">
                    <button
                      type="button"
                      className="btn btn_sm btn_ghost"
                      onClick={() => navigate(`new?fkno=${top.no}`)}
                    >
                      + 하위 메뉴
                    </button>
                    <button
                      type="button"
                      className="btn btn_sm btn_ghost"
                      onClick={() => navigate(`${top.no}/edit`)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="btn btn_sm btn_danger_outline"
                      onClick={() => askDelete(top)}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="menu_children">
                    {children.length === 0 ? (
                      <div className="menu_empty_children">등록된 하위 메뉴가 없습니다.</div>
                    ) : (
                      children.map((child) => (
                        <div
                          key={child.no}
                          className={`menu_child_row${
                            dragChild?.no === child.no ? ' dragging' : ''
                          }${
                            overChildNo === child.no &&
                            dragChild &&
                            dragChild.fkno === top.no &&
                            dragChild.no !== child.no
                              ? ' drag_over'
                              : ''
                          }`}
                          draggable
                          onDragStart={onChildDragStart(top.no as number, child.no as number)}
                          onDragOver={onChildDragOver(top.no as number, child.no as number)}
                          onDragEnd={onChildDragEnd(top.no as number)}
                        >
                          <span className="menu_drag_handle" title="드래그해서 순서 변경">
                            <GripIcon />
                          </span>

                          <span className="menu_ord_badge">{(child.ord ?? 0) + 1}</span>

                          <div className="menu_group_title">
                            <span className="cell_title">{child.title}</span>
                            <span className="cell_sub mono">{child.purl}</span>
                            {child.useYn === 'N' && <span className="badge badge_neutral">미사용</span>}
                            {reorderingKey === `child:${top.no}` && (
                              <span className="cell_sub">저장 중...</span>
                            )}
                          </div>

                          <div className="menu_group_actions">
                            <button
                              type="button"
                              className="btn btn_sm btn_ghost"
                              onClick={() => navigate(`${child.no}/edit`)}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="btn btn_sm btn_danger_outline"
                              onClick={() => askDelete(child)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
{/* 
      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={topList.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      /> */}

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
      />
    </section>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="3" r="1.3" fill="currentColor" />
      <circle cx="5" cy="8" r="1.3" fill="currentColor" />
      <circle cx="5" cy="13" r="1.3" fill="currentColor" />
      <circle cx="11" cy="3" r="1.3" fill="currentColor" />
      <circle cx="11" cy="8" r="1.3" fill="currentColor" />
      <circle cx="11" cy="13" r="1.3" fill="currentColor" />
    </svg>
  );
}
