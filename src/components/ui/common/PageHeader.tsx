import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** 타이틀 사이즈 클래스 지정 */
  title_size?: string;
  description?: ReactNode;
  /** 우측 상단 버튼 라벨 (예: "+ 공지 작성"). onCreate와 함께 사용 */
  createLabel?: string;
  onCreate?: () => void;
  /** 버튼 대신 커스텀 우측 영역을 직접 넣고 싶을 때 */
  actions?: ReactNode;
}

/**
 * 모든 화면 최상단에 공통으로 쓰는 타이틀 헤더.
 * 기존 .view_head / .btn 클래스를 그대로 사용 (StoresView.tsx 패턴과 동일).
 *
 * 사용 예:
 *   <PageHeader
 *     title="공지사항"
 *     title_size="xlg"
 *     description="서비스 업데이트와 점검 안내를 관리합니다."
 *     createLabel="+ 공지 작성"
 *     onCreate={() => setModalOpen(true)}
 *   />
 */
export default function PageHeader({
  title,
  title_size,
  description,
  createLabel,
  onCreate,
  actions,
}: PageHeaderProps) {
  return (
    <div className="view_head">
      <div className='title_area'>
        <h2 className={`title ${title_size ? title_size : ''}`}>{title}</h2>
        {description && <p className='b_title'>{description}</p>}
      </div>
      
      {actions ? (
        actions
      ) : createLabel ? (
        <button type="button" className="btn btn_md btn_primary" onClick={onCreate}>
          {createLabel}
        </button>
      ) : null}
    </div>
  );
}
