import { useEffect, useMemo, useState } from 'react';
import {
  AdminToolbar,
  AlertModal,
  ConfirmDeleteModal,
  DataTable,
  DbmsPagination,
  Modal,
  PageHeader,
} from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import './ShopMapList.css';

interface ShopMap {
  shopmapno: number;
  no: number;
  fname: string;
  fsaved: string;
  cdate: string;
}

interface Shop {
  no: number;
  mno: number;
  title: string;
}

interface ShopMapRow extends ShopMap {
  mno?: number;
  shopTitle?: string;
}

const PAGE_SIZE = 6;

export default function ShopMapList() {
  const [rows, setRows] = useState<ShopMapRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 검색
  const [searchText, setSearchText] = useState('');
  const [keyword, setKeyword] = useState('');

  // 페이징
  const [page, setPage] = useState(1);

  // 도면 미리보기
  const [previewTarget, setPreviewTarget] = useState<ShopMapRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // 삭제
  const [deleteTarget, setDeleteTarget] = useState<ShopMapRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 결과 알림
  const [alert, setAlert] = useState<{
    message: string;
    variant?: 'success' | 'error';
  } | null>(null);

  /**
   * 전체 매장 도면 조회
   */
  const fetchShopMaps = async () => {
    setLoading(true);

    try {
      const response = await axiosInstance.get<ShopMap[]>('/api/shopmaps');

      const result = await Promise.all(
        response.data.map(async (map) => {
          try {
            const shopResponse = await axiosInstance.get<Shop>(
              `/shop/${map.no}`
            );

            return {
              ...map,
              mno: shopResponse.data.mno,
              shopTitle: shopResponse.data.title,
            };
          } catch {
            // 매장 정보 조회가 실패해도 도면은 표시
            return map;
          }
        })
      );

      setRows(result);
    } catch (error) {
      console.error('매장 도면 목록 조회 실패:', error);

      setAlert({
        message: '매장 도면 목록을 불러오지 못했습니다.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopMaps();
  }, []);

  /**
   * 검색
   */
  const onSearch = () => {
    setKeyword(searchText.trim());
    setPage(1);
  };

  /**
   * 검색 초기화
   */
  const onReset = () => {
    setSearchText('');
    setKeyword('');
    setPage(1);
  };

  /**
   * 검색 결과
   */
  const filtered = useMemo(() => {
    const word = keyword.toLowerCase();

    if (!word) return rows;

    return rows.filter(
      (row) =>
        String(row.mno ?? '').includes(word) ||
        String(row.no).includes(word) ||
        (row.shopTitle ?? '').toLowerCase().includes(word) ||
        row.fname.toLowerCase().includes(word)
    );
  }, [rows, keyword]);

  const totalCount = filtered.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const paged = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /**
   * 도면 보기
   */
  const openPreview = async (row: ShopMapRow) => {
    setPreviewTarget(row);
    setPreviewLoading(true);

    try {
      const response = await axiosInstance.get('/download', {
        params: {
          dir: 'shopmap',
          filename: row.fsaved,
          downname: row.fsaved,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      setPreviewUrl(url);
    } catch (error) {
      console.error('도면 미리보기 실패:', error);

      setPreviewTarget(null);

      setAlert({
        message: '도면 이미지를 불러오지 못했습니다.',
        variant: 'error',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl('');
    setPreviewTarget(null);
  };

  /**
   * 도면 다운로드
   */
  const downloadFile = async (row: ShopMapRow) => {
    try {
      const response = await axiosInstance.get('/download', {
        params: {
          dir: 'shopmap',
          filename: row.fsaved,
          downname: row.fsaved,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement('a');

      link.href = url;
      link.download = row.fname;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('도면 다운로드 실패:', error);

      setAlert({
        message: '도면 다운로드에 실패했습니다.',
        variant: 'error',
      });
    }
  };

  /**
   * 관리자 도면 삭제
   */
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await axiosInstance.delete(
        `/api/shopmaps/${deleteTarget.shopmapno}`
      );

      setDeleteTarget(null);

      await fetchShopMaps();

      if (paged.length === 1 && page > 1) {
        setPage(page - 1);
      }

      setAlert({
        message: '매장 도면이 삭제되었습니다.',
        variant: 'success',
      });
    } catch (error) {
      console.error('도면 삭제 실패:', error);

      setAlert({
        message: '매장 도면 삭제에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  /**
   * 도면 목록 컬럼
   */
  const columns: DataTableColumn<ShopMapRow>[] = [
    {
      header: '회원번호',
      width: 100,
      render: (row) => (
        <span className="mono">{row.mno ?? '-'}</span>
      ),
    },
    {
      header: '매장',
      width: 220,
      render: (row) => (
        <div>
          <div className="cell_title">
            {row.shopTitle || `매장 No.${row.no}`}
          </div>
          <div className="cell_sub">
            매장번호 {row.no}
          </div>
        </div>
      ),
    },
    {
      header: '도면 파일',
      render: (row) => (
        <div>
          <div className="cell_title">{row.fname}</div>
          <div className="cell_sub">
            도면번호 {row.shopmapno}
          </div>
        </div>
      ),
    },
    {
      header: '등록일',
      width: 170,
      mono: true,
      accessor: 'cdate',
    },
    {
      header: '관리',
      width: 230,
      render: (row) => (
        <div className="shopmap_actions">
          <button
            type="button"
            className="btn btn_sm btn_ghost"
            onClick={() => openPreview(row)}
          >
            보기
          </button>

          <button
            type="button"
            className="btn btn_sm btn_ghost"
            onClick={() => downloadFile(row)}
          >
            다운로드
          </button>

          <button
            type="button"
            className="btn btn_sm btn_danger"
            onClick={() => setDeleteTarget(row)}
          >
            삭제
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="회원 도면 관리"
        description="회원이 등록한 매장 도면을 조회하고 관리합니다."
      />

      <AdminToolbar
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="회원번호, 매장명, 매장번호, 파일명 검색"
        extra={
          <>
            <button
              type="button"
              className="btn btn_ghost"
              onClick={onReset}
            >
              초기화
            </button>

            <button
              type="button"
              className="btn btn_primary"
              onClick={onSearch}
            >
              검색
            </button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={paged}
        rowKey={(row) => row.shopmapno}
        loading={loading}
        emptyMessage="등록된 매장 도면이 없습니다."
      />

      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* 도면 미리보기 */}
      <Modal
        open={previewTarget !== null}
        onClose={closePreview}
        titleId="shopmap-preview-title"
        title={previewTarget?.shopTitle || '매장 도면'}
        footer={
          <button
            type="button"
            className="btn btn_md btn_ghost"
            onClick={closePreview}
          >
            닫기
          </button>
        }
      >
        <div className="shopmap_preview">
          {previewLoading ? (
            <p>도면을 불러오는 중입니다.</p>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={previewTarget?.fname || '매장 도면'}
            />
          ) : (
            <p>표시할 도면이 없습니다.</p>
          )}
        </div>
      </Modal>

      {/* 삭제 확인 */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        targetLabel={
          deleteTarget
            ? `${deleteTarget.shopTitle || `매장 ${deleteTarget.no}`} · ${deleteTarget.fname}`
            : undefined
        }
        requirePassword={false}
      />

      {/* 결과 알림 */}
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}