import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  /** thead에 표시할 라벨 */
  header: string;
  /** 값을 렌더링하는 함수. 지정 안 하면 accessor 키로 row[key] 출력 */
  render?: (row: T) => ReactNode;
  /** render 없이 단순 필드 출력할 때 사용 */
  accessor?: keyof T;
  /** 숫자/코드처럼 고정폭 폰트로 보여줄 컬럼이면 true (기존 .mono 클래스 사용) */
  mono?: boolean;
  /** th/td 폭 등 커스텀 클래스 */
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** 지정하면 각 행 우측에 수정 버튼 노출 */
  onEdit?: (row: T) => void;
  /** 지정하면 각 행 우측에 삭제 버튼 노출 */
  onDelete?: (row: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  emptyMessage?: string;
  loading?: boolean;
}

/**
 * 컬럼 정의만 넘기면 되는 범용 관리자 테이블.
 * 기존 .table_wrap / .table / .mono / .actions / .empty_row 클래스를 그대로 사용
 * (StoresView.tsx / HistoryView.tsx 패턴과 동일).
 *
 * 사용 예:
 *   <DataTable
 *     columns={[
 *       { header: '매장명', render: (r) => <span className="cell_title">{r.name}</span> },
 *       { header: '연락처', accessor: 'tel', mono: true },
 *       { header: '상태', render: (r) => <span className="badge badge_success">{r.status}</span> },
 *     ]}
 *     data={stores}
 *     rowKey={(r) => r.id}
 *     onEdit={(r) => openEditModal(r)}
 *     onDelete={(r) => askDelete(r)}
 *   />
 */
export default function DataTable<T>({
  columns,
  data,
  rowKey,
  onEdit,
  onDelete,
  editLabel = '수정',
  deleteLabel = '삭제',
  emptyMessage = '등록된 데이터가 없습니다.',
  loading = false,
}: DataTableProps<T>) {
  const hasActions = Boolean(onEdit || onDelete);
  const colCount = columns.length + (hasActions ? 1 : 0);

  return (
    <div className="table_wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={col.headerClassName}>
                {col.header}
              </th>
            ))}
            {hasActions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr className="empty_row">
              <td colSpan={colCount}>불러오는 중...</td>
            </tr>
          ) : data.length === 0 ? (
            <tr className="empty_row">
              <td colSpan={colCount}>{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.header} className={col.className}>
                    {col.render ? (
                      col.render(row)
                    ) : col.mono ? (
                      <span className="mono">{col.accessor ? String(row[col.accessor] ?? '') : ''}</span>
                    ) : col.accessor ? (
                      String(row[col.accessor] ?? '')
                    ) : (
                      ''
                    )}
                  </td>
                ))}
                {hasActions && (
                  <td>
                    <div className="actions">
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
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
