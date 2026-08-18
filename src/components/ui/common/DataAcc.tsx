import type { ReactNode } from 'react';
import { useState } from 'react';

export interface DataAccColumn<T> {
  /** 라벨 (선택 사항) */
  header?: string;
  /** 값을 렌더링하는 함수 */
  render?: (row: T) => ReactNode;
  /** render 없이 단순 필드 출력할 때 사용 */
  accessor?: keyof T;
  /** 커스텀 클래스 */
  className?: string;
}

interface DataAccProps<T> {
  /** 접혀있을 때도 보이는 트리거(제목) 영역 */
  title: (row: T) => ReactNode;
  /** 펼쳤을 때 .acc_panel 안에 순서대로 렌더링되는 컬럼들 (DataCard와 동일한 인터페이스) */
  columns: DataAccColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** 지정하면 펼친 영역 하단에 수정 버튼 노출 */
  onEdit?: (row: T) => void;
  /** 지정하면 펼친 영역 하단에 삭제 버튼 노출 */
  onDelete?: (row: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  emptyMessage?: string;
  loading?: boolean;
  /** true면 여러 항목을 동시에 펼칠 수 있음 (기본값). false면 한 번에 하나만 펼쳐짐 */
  allowMultiple?: boolean;
}

/**
 * DataCard와 동일한 columns/data/rowKey 인터페이스를 쓰되, 각 행을 .acc_item으로 감싸
 * 트리거를 눌러야 상세 컬럼(.acc_panel)이 펼쳐지는 아코디언 카드 리스트.
 *
 * 사용 예:
 *   <DataAcc
 *     title={(r) => <>{r.name}<span className="badge badge_success">{r.status}</span></>}
 *     columns={[
 *       { header: '연락처', accessor: 'tel' },
 *       { header: '주소', accessor: 'addr' },
 *     ]}
 *     data={stores}
 *     rowKey={(r) => r.id}
 *     onEdit={(r) => openEditModal(r)}
 *     onDelete={(r) => askDelete(r)}
 *   />
 */
export default function DataAcc<T>({
  title,
  columns,
  data,
  rowKey,
  onEdit,
  onDelete,
  editLabel = '수정',
  deleteLabel = '삭제',
  emptyMessage = '등록된 데이터가 없습니다.',
  loading = false,
  allowMultiple = true,
}: DataAccProps<T>) {
  const [openKeys, setOpenKeys] = useState<Set<string | number>>(new Set());
  const hasActions = Boolean(onEdit || onDelete);

  const toggle = (key: string | number) => {
    setOpenKeys((prev) => {
      const next = allowMultiple ? new Set(prev) : new Set<string | number>();
      if (prev.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

 
  return (
    <div className="card_acc">
      {loading ? (
        <div className="list_row empty_row">
          <div>불러오는 중...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="list_row empty_row">
          <div>{emptyMessage}</div>
        </div>
      ) : (
        data.map((row) => {
          const key = rowKey(row);
          const open = openKeys.has(key);
          const panelId = `acc-panel-${key}`;

          return (
            <div className="acc_item" key={key}>
              <button
                type="button"
                className="acc_trigger"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(key)}
              >
                <span className='acc_title'>{title(row)}</span>
              </button>
              <div className={`acc_panel${open ? ' open' : ''}`} id={panelId}>
                {columns.map((col, idx) => (
                  <div key={idx} className={col.className}>
                    {col.header && <span className="answer">{col.header}</span>}
                    {col.render ? col.render(row) : col.accessor ? String(row[col.accessor] ?? '') : null}
                  </div>
                ))}

                {hasActions && (
                  <div className="form_page_footer">
                    {onEdit && (
                      <button type="button" className="btn btn_sm btn_ghost" onClick={() => onEdit(row)}>
                        {editLabel}
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" className="btn btn_sm btn_danger_outline" onClick={() => onDelete(row)}>
                        {deleteLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  )
}