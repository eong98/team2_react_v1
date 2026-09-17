import { useEffect, useRef, useState } from 'react';
import { axiosInstance } from '../../../../utils/Tool';
import { AlertModal, ConfirmDeleteModal, Modal, PageHeader } from '../../../../components/ui';
import type { ChatMenuRequest, ChatMenuTypes } from '../../../../components/ts/ChatMenu';
import ChatBotPreview, { type ChatBotPreviewHandle } from './ChatBotPreview';

/* ---------------------------------------------------------------------
   챗봇 옵션 메뉴 관리 (/dbms/chat_menu) — 트리 구조 CRUD.
   전체 트리를 한 번에 불러와서(GET /chat_menu/tree/admin), 프론트에서
   STEP1 → STEP2 → STEP3 계층으로 재구성해 보여줍니다.

   API
   GET    /chat_menu/tree/admin        → 전체 메뉴 (페이징 없음)
   POST   /chat_menu                   → 등록
   PUT    /chat_menu/{no}              → 수정
   DELETE /chat_menu/{no}              → 삭제 (하위 선택지 있으면 서버가 거부)
--------------------------------------------------------------------- */

interface TreeNode extends ChatMenuTypes {
  children: TreeNode[];
}

const EMPTY_FORM: ChatMenuRequest = {
  pno: null,
  step: 1,
  label: '',
  answer: '',
  userag: 'N',
  vseq: 0,
  useyn: 'Y',
};

export default function ChatMenu() {
  const [flatList, setFlatList] = useState<ChatMenuTypes[]>([]);
  const [loading, setLoading] = useState(true);

  // 선택 경로(칼럼 체인) — [STEP1에서 클릭한 노드, STEP2에서 클릭한 노드, ...]
  const [selectedPath, setSelectedPath] = useState<TreeNode[]>([]);

  const previewRef = useRef<ChatBotPreviewHandle>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChatMenuTypes | null>(null);
  const [form, setForm] = useState<ChatMenuRequest>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ChatMenuTypes | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const loadTree = () => {
    setLoading(true);
    axiosInstance
      .get<ChatMenuTypes[]>('/chat_menu/tree/admin')
      .then((res) => setFlatList(res.data))
      .catch((err) => console.error('메뉴 트리 조회 실패:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTree();
  }, []);

  const buildTree = (list: ChatMenuTypes[]): TreeNode[] => {
    const map = new Map<number, TreeNode>();
    list.forEach((item) => map.set(item.no, { ...item, children: [] }));
    const roots: TreeNode[] = [];
    map.forEach((node) => {
      if (node.pno == null) roots.push(node);
      else {
        const parent = map.get(node.pno);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    });
    const sortRec = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.vseq - b.vseq);
      nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  };

  const tree = buildTree(flatList);

  // 트리가 바뀌면(수정/삭제 후) selectedPath도 최신 데이터로 다시 맞춤
  useEffect(() => {
    if (selectedPath.length === 0) return;
    const freshPath: TreeNode[] = [];
    let currentLevel = tree;
    for (const oldNode of selectedPath) {
      const found = currentLevel.find((n) => n.no === oldNode.no);
      if (!found) break; // 삭제된 경우 그 지점에서 경로 끊음
      freshPath.push(found);
      currentLevel = found.children;
    }
    setSelectedPath(freshPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatList]);

  /** 노드 클릭 시 — 그 노드가 속한 depth까지만 경로를 자르고, 클릭한 노드를 새로 추가 */
  const handleSelectAt = (depth: number, node: TreeNode) => {
    setSelectedPath((prev) => [...prev.slice(0, depth), node]);
  };

  const lastSelected = selectedPath[selectedPath.length - 1] ?? null;

  // 렌더링할 컬럼들: [STEP1 목록, (선택했으면) 그 자식 목록, (또 선택했으면) 그 자식 목록...]
  const columns: { nodes: TreeNode[]; depth: number }[] = [{ nodes: tree, depth: 0 }];
  selectedPath.forEach((node, idx) => {
    if (node.children.length > 0) {
      columns.push({ nodes: node.children, depth: idx + 1 });
    }
  });

  const openCreateModal = (parent: TreeNode | null) => {
    setEditTarget(null);
    setForm({ pno: parent ? parent.no : null, step: parent ? parent.step + 1 : 1, label: '', answer: '', userag: 'N', vseq: 0, useyn: 'Y' });
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (node: TreeNode) => {
    setEditTarget(node);
    setForm({ pno: node.pno, step: node.step, label: node.label, answer: node.answer ?? '', userag: node.userag, vseq: node.vseq, useyn: node.useyn });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const submitForm = async () => {
    if (!form.label.trim()) {
      setFormError('선택지 텍스트를 입력해주세요.');
      return;
    }
    if (form.step > 3) {
      setFormError('옵션 단계는 최대 3단계까지만 가능합니다.');
      return;
    }
    setSubmitting(true);
    try {
      if (editTarget) {
        await axiosInstance.put(`/chat_menu/${editTarget.no}`, form);
        setAlert({ message: '메뉴가 수정되었습니다.', variant: 'success' });
      } else {
        await axiosInstance.post('/chat_menu', form);
        setAlert({ message: '메뉴가 등록되었습니다.', variant: 'success' });
      }
      closeForm();
      loadTree();
    } catch (err) {
      console.error('메뉴 저장 실패:', err);
      setFormError('저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/chat_menu/${deleteTarget.no}`);
      setAlert({ message: '메뉴가 삭제되었습니다.', variant: 'success' });
      setDeleteTarget(null);
      loadTree();
    } catch (err) {
      console.error('메뉴 삭제 실패:', err);
      setAlert({ message: '하위 선택지가 있어 삭제할 수 없습니다. 먼저 하위 선택지를 정리해주세요.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handlePreviewRefresh = () => {
    setSelectedPath([]); // 트리 쪽 선택 경로도 초기화
    previewRef.current?.reset(); // 미리보기 내부 상태도 초기화
  };

  return (
    <section className="view active">
      <PageHeader
        title="챗봇 옵션 메뉴 관리"
        description="옵션형 상담 선택지 트리를 관리합니다 (최대 3단계)"
        createLabel="+ 최상위 메뉴 추가"
        onCreate={() => openCreateModal(null)}
      />

      {loading ? (
        <p className="b_title">불러오는 중...</p>
      ) : (
        <div className="flow_wrap">
          <div className="flow_row">
            <div className="flow_columns">
              {columns.map((col, i) => (
                <div key={i} className="flow_column">
                  <div className="flow_column_title">STEP{i + 1}</div>
                  {col.nodes.length === 0 ? (
                    <div className="flow_empty">등록된 메뉴가 없습니다.</div>
                  ) : (
                    col.nodes.map((n) => (
                      <button
                        key={n.no}
                        type="button"
                        className={`flow_node ${selectedPath[i]?.no === n.no ? 'active' : ''}`}
                        onClick={() => handleSelectAt(i, n)}
                      >
                        <span className="flow_node_label">{n.label}</span>
                        {n.children.length > 0 && <span className="flow_node_arrow">›</span>}
                      </button>
                    ))
                  )}
                </div>
              ))}
            </div>

            <div className="flow_detail_panel">
              <div className="flow_detail_header">
                <span className="flow_detail_label">선택된 메뉴 상세</span>
              </div>

              {lastSelected ? (
                <>
                  <div className="flow_detail_row">
                    <span className="chatmenu_step_badge">STEP{lastSelected.step}</span>
                    <span className="flow_detail_title">{lastSelected.label}</span>
                    {lastSelected.userag === 'Y' && <span className="badge info">RAG</span>}
                    {lastSelected.useyn === 'N' && <span className="cell_sub">(숨김)</span>}
                  </div>

                  <div className="flow_detail_answer">{lastSelected.answer ?? '서비스 준비 중 입니다.'}</div>

                  <div className="flow_detail_actions">
                    {lastSelected.step < 3 && (
                      <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openCreateModal(lastSelected)}>
                        하위추가
                      </button>
                    )}
                    <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openEditModal(lastSelected)}>
                      수정
                    </button>
                    <button type="button" className="btn btn_xsm btn_danger_outline" onClick={() => setDeleteTarget(lastSelected)}>
                      삭제
                    </button>
                  </div>
                </>
              ) : (
                <div className="flow_empty">옵션에서 메뉴를 선택해주세요.</div>
              )}
            </div>
          </div>

          {/* 사용자 화면 미리보기 */}
          <div className="flow_preview_panel">
            <div className="flow_detail_header">
              <span className="flow_detail_label">사용자 화면 미리보기</span>
              <button
                type="button"
                className="flow_preview_refresh_btn"
                onClick={handlePreviewRefresh}
                aria-label="미리보기 새로고침"
              >
                ↻ 새로고침
              </button>
            </div>

            <div className="flow_preview_frame">
              <ChatBotPreview ref={previewRef} flatMenuList={flatList} selectedPath={selectedPath} />
            </div>
          </div>
        </div>
      )}

      {/* 등록/수정 모달 — 기존 전체 필드 포함 */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        titleId="chatMenuFormTitle"
        title={editTarget ? '메뉴 수정' : '메뉴 등록'}
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={closeForm}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" disabled={submitting} onClick={submitForm}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </>
        }
      >
        <div>
          {form.pno != null && (
            <p className="cell_sub" style={{ marginBottom: 12 }}>
              상위 메뉴 번호: {form.pno} (STEP{form.step})
            </p>
          )}
          {form.pno == null && !editTarget && (
            <p className="cell_sub" style={{ marginBottom: 12 }}>
              최상위(STEP1) 메뉴로 등록됩니다.
            </p>
          )}

          <div className="form_group">
            <label className="form_label" htmlFor="cm_label">
              선택지 텍스트<span className="req">*</span>
            </label>
            <div className="form_control">
              <input
                id="cm_label"
                type="text"
                className="form_input"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="cm_answer">
              답변 (클릭 시 노출, 최상위는 생략 가능)
            </label>
            <div className="form_control">
              <textarea
                id="cm_answer"
                className="form_textarea"
                style={{ minHeight: 120 }}
                value={form.answer ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))}
              />
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="cm_vseq">
              노출 순서
            </label>
            <div className="form_control">
              <input
                id="cm_vseq"
                type="number"
                className="form_input"
                style={{ maxWidth: 120 }}
                value={form.vseq}
                onChange={(e) => setForm((prev) => ({ ...prev, vseq: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="form_group">
            <div className="form_label">RAG 검색 여부</div>
            <div className="form_control">
              <div className="form_check">
                <input
                  type="checkbox"
                  id="cm_userag"
                  checked={form.userag === 'Y'}
                  onChange={(e) => setForm((prev) => ({ ...prev, userag: e.target.checked ? 'Y' : 'N' }))}
                />
                <label htmlFor="cm_userag" className="b_title">
                  답변 시 RAG 검색도 같이 수행
                </label>
              </div>
            </div>
          </div>

          <div className="form_group">
            <div className="form_label">사용 여부</div>
            <div className="form_control">
              <div className="form_check">
                <input
                  type="checkbox"
                  id="cm_useyn"
                  checked={form.useyn === 'Y'}
                  onChange={(e) => setForm((prev) => ({ ...prev, useyn: e.target.checked ? 'Y' : 'N' }))}
                />
                <label htmlFor="cm_useyn" className="b_title">
                  사용함 (해제 시 챗봇 목록에서 숨김)
                </label>
              </div>
            </div>
          </div>

          {formError && <div className="form_hint error">{formError}</div>}
        </div>
      </Modal>

      {/* 삭제 모달 — 기존 ConfirmDeleteModal 재사용 */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={submitDelete}
        targetLabel={deleteTarget?.label}
        title="메뉴를 삭제하시겠습니까?"
        description="하위 선택지가 있으면 삭제할 수 없습니다."
        requirePassword={false}
        loading={deleting}
      />

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}