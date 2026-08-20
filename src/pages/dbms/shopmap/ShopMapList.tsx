import { useMemo, useState } from 'react';

import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  UserPagination,
} from '../../../components/ui';

import Filterbar from '../../../components/ui/user/Filterbar';

import { axiosInstance } from '../../../utils/Tool';

import './ShopMapList.css';


/**
 * SHOP + SHOPMAP LEFT JOIN 결과
 *
 * SHOP
 * - no: 매장번호
 * - mno: 회원번호
 * - title: 매장명
 * - address: 기본 주소
 * - address2: 상세 주소
 *
 * SHOPMAP
 * - shopmapno: 도면번호
 * - fname: 원본 파일명
 * - fsaved: 서버 저장 파일명
 * - shopmapCdate: 도면 등록일
 */
interface ShopMapRow {
  no: number;
  mno: number;
  title: string;

  address: string | null;
  address2: string | null;

  shopmapno: number | null;
  fname: string | null;
  fsaved: string | null;
  shopmapCdate: string | null;
}

const PAGE_SIZE = 10;


export default function ShopMapList() {

  /**
   * 검색어
   *
   * 매장명 또는 주소를 입력합니다.
   */
  const [keyword, setKeyword] = useState('');

  /**
   * 실제 조회에 사용된 검색어
   */
  const [searchedKeyword, setSearchedKeyword] = useState('');

  /**
   * JOIN 조회 결과
   */
  const [rows, setRows] = useState<ShopMapRow[]>([]);

  /**
   * 현재 페이지
   */
  const [page, setPage] = useState(1);

  /**
   * 서버 조회 상태
   */
  const [loading, setLoading] = useState(false);

  /**
   * 조회 여부
   */
  const [searched, setSearched] = useState(false);


  /**
   * 매장명 / 주소 기준
   * 매장 + 도면 LEFT JOIN 조회
   *
   * GET /api/shopmaps/admin?keyword=검색어
   *
   * 검색어가 없으면 전체 매장을 조회합니다.
   */
  const loadShopMaps = async () => {

    const searchKeyword = keyword.trim();

    setLoading(true);
    setSearched(true);

    try {

      const response = await axiosInstance.get<ShopMapRow[]>(
        '/api/shopmaps/admin',
        {
          params: {
            keyword: searchKeyword || undefined,
          },
        }
      );

      setRows(response.data);
      setSearchedKeyword(searchKeyword);
      setPage(1);

    } catch (error) {

      console.error('매장 도면 목록 조회 실패:', error);

      setRows([]);
      setSearchedKeyword(searchKeyword);

      alert('매장 도면 목록을 불러오지 못했습니다.');

    } finally {

      setLoading(false);
    }
  };


  /**
   * 검색 초기화
   */
  const handleReset = () => {

    setKeyword('');
    setSearchedKeyword('');
    setRows([]);
    setPage(1);
    setSearched(false);
  };


  /**
   * 관리자 도면 다운로드
   *
   * GET /api/shopmaps/admin/download/{shopmapno}
   */
  const handleDownload = async (row: ShopMapRow) => {

    if (!row.shopmapno || !row.fname) {
      return;
    }

    try {

      const response = await axiosInstance.get(
        `/api/shopmaps/admin/download/${row.shopmapno}`,
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data]);

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = url;
      link.download = row.fname;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

    } catch (error) {

      console.error('도면 다운로드 실패:', error);

      alert('도면 파일 다운로드 중 오류가 발생했습니다.');
    }
  };


  /**
   * 등록된 도면 수
   */
  const registeredCount = useMemo(() => {

    return rows.filter((row) => row.shopmapno !== null).length;

  }, [rows]);


  /**
   * 미등록 도면 수
   */
  const unregisteredCount = rows.length - registeredCount;


  /**
   * 페이지 계산
   */
  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / PAGE_SIZE)
  );

  const paged = rows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const from =
    rows.length === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const to = Math.min(
    page * PAGE_SIZE,
    rows.length
  );


  /**
   * 관리자 도면 관리 테이블
   */
  const columns: DataTableColumn<ShopMapRow>[] = [

    {
      header: '매장번호',
      accessor: 'no',
      width: '10%',
      mono: true,
    },

    {
      header: '매장명',
      accessor: 'title',
      width: '20%',
    },

    {
      header: '주소',
      width: '28%',
      render: (row) => {

        const fullAddress = [
          row.address,
          row.address2,
        ]
          .filter(Boolean)
          .join(' ');

        return fullAddress || '-';
      },
    },

    {
      header: '도면 상태',
      width: '12%',
      render: (row) => (
        row.shopmapno ? (
          <span className="shopmap_status registered">
            등록
          </span>
        ) : (
          <span className="shopmap_status unregistered">
            미등록
          </span>
        )
      ),
    },

    {
      header: '도면 파일',
      width: '18%',
      render: (row) => (
        row.fname ? (
          <span className="shopmap_filename">
            {row.fname}
          </span>
        ) : (
          <span className="shopmap_empty">
            -
          </span>
        )
      ),
    },

    {
      header: '등록일',
      width: '12%',
      mono: true,
      render: (row) => (
        row.shopmapCdate ?? '-'
      ),
    },

    {
      header: '관리',
      width: '12%',
      render: (row) => (
        row.shopmapno ? (
          <button
            type="button"
            className="btn btn_outline_primary shopmap_download_btn"
            onClick={() => handleDownload(row)}
          >
            다운로드
          </button>
        ) : (
          <span className="shopmap_empty">
            -
          </span>
        )
      ),
    },
  ];


  return (
    <section className="view active">

      <PageHeader
        title="매장 도면 관리"
        description="매장명 또는 주소로 매장을 검색하고 도면 등록 상태를 확인할 수 있습니다."
      />


      <Filterbar
        left={
          <span className="pagination_info">

            {searched ? (
              <>
                {searchedKeyword ? (
                  <>
                    검색어{' '}
                    <em className="b_num">
                      {searchedKeyword}
                    </em>
                    {' '}· 매장{' '}
                    <em className="b_num">
                      {rows.length}
                    </em>
                    개
                  </>
                ) : (
                  <>
                    전체 매장{' '}
                    <em className="b_num">
                      {rows.length}
                    </em>
                    개
                  </>
                )}
              </>
            ) : (
              <>
                매장명 또는 주소를 검색해주세요.
              </>
            )}

          </span>
        }

        searchValue={keyword}

        onSearchChange={(value) => {
          setKeyword(value);
        }}

        onSearchEnter={loadShopMaps}

        searchPlaceholder="매장명 또는 주소 입력"

        extra={
          <>
            <button
              type="button"
              className="btn btn_outline_primary"
              onClick={handleReset}
            >
              초기화
            </button>

            <button
              type="button"
              className="btn btn_primary"
              onClick={loadShopMaps}
            >
              조회
            </button>
          </>
        }
      />


      {searched && (
        <div className="shopmap_summary">

          <div className="shopmap_summary_item">

            <span className="shopmap_summary_label">
              전체 매장
            </span>

            <strong>
              {rows.length}
            </strong>

          </div>


          <div className="shopmap_summary_item">

            <span className="shopmap_summary_label">
              도면 등록
            </span>

            <strong>
              {registeredCount}
            </strong>

          </div>


          <div className="shopmap_summary_item">

            <span className="shopmap_summary_label">
              도면 미등록
            </span>

            <strong>
              {unregisteredCount}
            </strong>

          </div>

        </div>
      )}


      {loading ? (

        <div className="loading_box">
          매장 도면 정보를 불러오는 중입니다...
        </div>

      ) : (

        <DataTable<ShopMapRow>
          columns={columns}
          data={paged}
          rowKey={(row) => row.no}

          emptyMessage={
            searched
              ? '검색 조건에 해당하는 매장이 없습니다.'
              : '매장명 또는 주소를 검색하면 도면 목록이 표시됩니다.'
          }
        />

      )}


      {rows.length > 0 && (

        <>
          <div className="shopmap_result_info">
            조회 결과 {rows.length}건 중 {from}–{to}건 표시
          </div>

          <UserPagination
            page={page}
            totalPages={totalPages}
            totalCount={rows.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            showInfo={false}
          />
        </>

      )}

    </section>
  );
}