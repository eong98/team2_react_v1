import type { ReactNode } from "react";
import React from "react";


export interface DataCardColumn<T> {
  /** 라벨 (선택 사항) */
  header?: string;
  /** 값을 렌더링하는 함수 */
  render?: (row: T) => ReactNode;
  /** render 없이 단순 필드 출력할 때 사용 */
  accessor?: keyof T;
  /** 커스텀 클래스 */
  className?: string;
}

interface DataCardProps<T> {
  columns: DataCardColumn<T>[];
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
 * DataTable과 동일한 인터페이스로 컬럼을 받아 카드 리스트 형태(.card > .list_row)로 렌더링하는 컴포넌트
 */
export default function DataCard<T>({
  columns,
  data,
  rowKey,
  onEdit,
  onDelete,
  editLabel = '수정',
  deleteLabel = '삭제',
  emptyMessage = '등록된 데이터가 없습니다.',
  loading = false,
}: DataCardProps<T>) {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div className="card">
      {loading ? (
        <div className="list_row empty_row">
          <div>불러오는 중...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="list_row empty_row">
          <div>{emptyMessage}</div>
        </div>
      ) : (
        data.map((row) => (
          <div key={rowKey(row)} className="list_row">
            {/* 컬럼 순서대로 렌더링 */}
            {columns.map((col, idx) => (
              <React.Fragment key={idx}>
                {col.render ? (
                  col.render(row)
                ) : col.accessor ? (
                  <span className={col.className}>
                    {String(row[col.accessor] ?? '')}
                  </span>
                ) : null}
              </React.Fragment>
            ))}

            {/* 액션 버튼 영역 */}
            {hasActions && (
              <div className="actions">
                {onEdit && (
                  <button
                    type="button"
                    className="btn btn_sm btn_ghost"
                    onClick={() => onEdit(row)}
                  >
                    {editLabel}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="btn btn_sm btn_danger_outline"
                    onClick={() => onDelete(row)}
                  >
                    {deleteLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}