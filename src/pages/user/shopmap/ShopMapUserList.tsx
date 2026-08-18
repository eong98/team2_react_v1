import { type ChangeEvent, useEffect, useState } from 'react';
import {
    AlertModal,
    ConfirmDeleteModal,
    Modal,
    PageHeader,
    UserPagination,
} from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
    PAGE_SIZE,
    EMPTY_FILTERS,
    type ShopType,
    type ShopSearchResult,
    type Filters,
} from '../../../components/ts/ShopUser.ts';
import { GlobalStoreSession } from '../../../store/LoginStore.ts';
import './ShopMapUserList.css';

// SHOPMAP API 데이터
interface ShopMap {
    sno: number;
    no: number;
    fname: string;
    fsaved: string;
    cdate: string;
}

// 매장 정보에 도면 등록 정보를 추가
interface ShopMapRow extends ShopType {
    shopMap: ShopMap | null;
}

export default function ShopMapUserList() {
    const { no: mno } = GlobalStoreSession();

    // 검색: 입력값과 실제 검색값 분리
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);

    // 목록 / 페이징
    const [rows, setRows] = useState<ShopMapRow[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    // 도면 등록 / 변경
    const [uploadTarget, setUploadTarget] = useState<ShopMapRow | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState('');
    const [saving, setSaving] = useState(false);

    // 기존 도면 보기
    const [previewTarget, setPreviewTarget] = useState<ShopMapRow | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);

    // 삭제 / 결과 알림
    const [deleteTarget, setDeleteTarget] = useState<ShopMapRow | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [alert, setAlert] = useState<{
        message: string;
        variant?: 'success' | 'error';
    } | null>(null);

    // 로그인 회원의 매장 목록 조회 후 각 매장의 도면 등록 여부 확인
    const loadList = async () => {
        setLoading(true);

        try {
            const res = await axiosInstance.get<ShopSearchResult>('/shop/search', {
                params: {
                    mno,
                    page: page - 1,
                    size: PAGE_SIZE,
                    keyword: applied.keyword.trim() || undefined,
                },
            });

            const { content, totalElements: total, totalPages: pages } = res.data;

            const result: ShopMapRow[] = await Promise.all(
                content.map(async (shop) => {
                    try {
                        const mapRes = await axiosInstance.get<ShopMap>(
                            `/api/shopmaps/shop/${shop.no}`
                        );
                        return { ...shop, shopMap: mapRes.data };
                    } catch (error: any) {
                        // 404는 해당 매장에 등록된 도면이 없는 정상 상태
                        if (error.response?.status === 404) return { ...shop, shopMap: null };
                        console.error(`매장 ${shop.no} 도면 조회 실패:`, error);
                        return { ...shop, shopMap: null };
                    }
                })
            );

            setRows(result);
            setTotalElements(total);
            setTotalPages(Math.max(1, pages));
        } catch (error) {
            console.error('매장 목록 조회 실패:', error);
            setRows([]);
            setTotalElements(0);
            setTotalPages(1);
            setAlert({ message: '매장 목록을 불러오지 못했습니다.', variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applied, page]);

    // 검색
    const onSearch = () => {
        setPage(1);
        setApplied(draft);
    };

    // 검색 초기화
    const onReset = () => {
        const empty = { ...EMPTY_FILTERS };
        setDraft(empty);
        setPage(1);
        setApplied(empty);
    };

    // 도면 등록/변경 모달 열기
    const openUpload = (row: ShopMapRow) => {
        setUploadTarget(row);
        setFile(null);

        if (filePreview) URL.revokeObjectURL(filePreview);
        setFilePreview('');
    };

    const closeUpload = () => {
        if (filePreview) URL.revokeObjectURL(filePreview);
        setUploadTarget(null);
        setFile(null);
        setFilePreview('');
    };

    // 업로드할 이미지 선택 및 미리보기
    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;

        if (filePreview) URL.revokeObjectURL(filePreview);

        setFile(selected);
        setFilePreview(selected ? URL.createObjectURL(selected) : '');
    };

    // 도면 신규 등록 또는 기존 도면 변경
    const saveShopMap = async () => {
        if (!uploadTarget || !file) {
            setAlert({ message: '도면 이미지를 선택해주세요.', variant: 'error' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setSaving(true);

            if (uploadTarget.shopMap) {
                await axiosInstance.put(
                    `/api/shopmaps/${uploadTarget.shopMap.shopmapno}`,
                    formData
                );
            } else {
                formData.append('no', String(uploadTarget.no));
                await axiosInstance.post('/api/shopmaps', formData);
            }

            const message = uploadTarget.shopMap
                ? '매장 도면이 변경되었습니다.'
                : '매장 도면이 등록되었습니다.';

            closeUpload();
            await loadList();
            setAlert({ message, variant: 'success' });
        } catch (error: any) {
            console.error('도면 저장 실패:', error);
            setAlert({
                message: error.response?.data ?? '매장 도면 저장에 실패했습니다.',
                variant: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    // 서버에 저장된 기존 도면 이미지 보기
    const openPreview = async (row: ShopMapRow) => {
        if (!row.shopMap) return;

        try {
            setPreviewTarget(row);
            setPreviewLoading(true);

            const res = await axiosInstance.get('/download', {
                params: {
                    dir: 'shopmap',
                    filename: row.shopMap.fsaved,
                    downname: row.shopMap.fsaved,
                },
                responseType: 'blob',
            });

            setPreviewUrl(URL.createObjectURL(new Blob([res.data])));
        } catch (error) {
            console.error('도면 미리보기 실패:', error);
            setPreviewTarget(null);
            setAlert({ message: '도면 이미지를 불러오지 못했습니다.', variant: 'error' });
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        setPreviewTarget(null);
    };

    // 등록된 도면 삭제
    const handleDelete = async () => {
        if (!deleteTarget?.shopMap) return;

        try {
            setDeleting(true);
            await axiosInstance.delete(`/api/shopmaps/${deleteTarget.shopMap.shopmapno}`);
            setDeleteTarget(null);
            await loadList();
            setAlert({ message: '매장 도면이 삭제되었습니다.', variant: 'success' });
        } catch (error) {
            console.error('도면 삭제 실패:', error);
            setAlert({ message: '매장 도면 삭제에 실패했습니다.', variant: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <section className="view active">
            <PageHeader
                title="매장 도면 관리"
                description="매장별 도면 등록 여부를 확인하고 도면을 등록하거나 관리합니다."
            />

            {/* 사용자 공통 검색 영역 */}
            <Filterbar
                searchValue={draft.keyword}
                onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
                searchPlaceholder="매장명·주소로 검색"
                onSearchEnter={onSearch}
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={totalElements}
                extra={
                    <>
                        <button type="button" className="btn btn_ghost" onClick={onReset}>초기화</button>
                        <button type="button" className="btn btn_primary" onClick={onSearch}>검색</button>
                    </>
                }
            />

            {/* 매장별 도면 등록 상태 */}
            <div className="shopmap_list">
                {loading ? (
                    <p className="shopmap_empty">불러오는 중...</p>
                ) : rows.length === 0 ? (
                    <p className="shopmap_empty">조건에 맞는 매장이 없습니다.</p>
                ) : (
                    rows.map((row) => (
                        <div className="shopmap_row" key={row.no}>
                            <div className="shopmap_store">
                                <div className="cell_title">{row.title}</div>
                                <div className="cell_sub">
                                    {row.address}
                                    {row.address2 ? ` ${row.address2}` : ''}
                                </div>
                            </div>

                            <div className="shopmap_status">
                                <span className={row.shopMap ? 'badge badge_success' : 'badge'}>
                                    {row.shopMap ? '등록' : '미등록'}
                                </span>
                            </div>

                            <div className="shopmap_file">
                                {row.shopMap ? (
                                    <>
                                        <div className="cell_title">{row.shopMap.fname}</div>
                                        <div className="cell_sub">도면번호 {row.shopMap.shopmapno}</div>
                                    </>
                                ) : (
                                    <span className="cell_sub">등록된 도면이 없습니다.</span>
                                )}
                            </div>

                            <div className="shopmap_actions">
                                {!row.shopMap ? (
                                    <button type="button" className="btn btn_sm btn_primary" onClick={() => openUpload(row)}>
                                        도면 등록
                                    </button>
                                ) : (
                                    <>
                                        <button type="button" className="btn btn_sm btn_ghost" onClick={() => openPreview(row)}>보기</button>
                                        <button type="button" className="btn btn_sm btn_ghost" onClick={() => openUpload(row)}>변경</button>
                                        <button type="button" className="btn btn_sm btn_danger" onClick={() => setDeleteTarget(row)}>삭제</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <UserPagination
                page={page}
                totalPages={totalPages}
                totalCount={totalElements}
                pageSize={PAGE_SIZE}
                onChange={setPage}
                showInfo={false}
            />

            {/* 도면 등록 / 변경 */}
            <Modal
                open={uploadTarget !== null}
                onClose={closeUpload}
                titleId="shopmap-upload-title"
                title={uploadTarget?.shopMap ? '매장 도면 변경' : '매장 도면 등록'}
                footer={
                    <>
                        <button type="button" className="btn btn_ghost" onClick={closeUpload}>취소</button>
                        <button type="button" className="btn btn_primary" disabled={saving} onClick={saveShopMap}>
                            {saving ? '저장 중...' : uploadTarget?.shopMap ? '변경' : '등록'}
                        </button>
                    </>
                }
            >
                <div className="shopmap_upload">
                    <div className="shopmap_upload_info">
                        <strong>{uploadTarget?.title}</strong>
                        <span className="cell_sub">매장번호 {uploadTarget?.no}</span>
                    </div>

                    <label className="form_label" htmlFor="shopmapFile">도면 이미지</label>
                    <input
                        id="shopmapFile"
                        type="file"
                        className="form_input"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={onFileChange}
                    />

                    {filePreview && (
                        <div className="shopmap_preview">
                            <img src={filePreview} alt="선택한 도면 미리보기" />
                        </div>
                    )}
                </div>
            </Modal>

            {/* 기존 도면 보기 */}
            <Modal
                open={previewTarget !== null}
                onClose={closePreview}
                titleId="shopmap-preview-title"
                title={`${previewTarget?.title ?? ''} 도면`}
                footer={
                    <button type="button" className="btn btn_ghost" onClick={closePreview}>닫기</button>
                }
            >
                <div className="shopmap_preview">
                    {previewLoading ? (
                        <p>도면을 불러오는 중입니다.</p>
                    ) : previewUrl ? (
                        <img src={previewUrl} alt={previewTarget?.shopMap?.fname ?? '매장 도면'} />
                    ) : (
                        <p>표시할 도면이 없습니다.</p>
                    )}
                </div>
            </Modal>

            {/* 도면 삭제 확인 */}
            <ConfirmDeleteModal
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="매장 도면을 삭제하시겠습니까?"
                description="삭제한 도면은 복구할 수 없습니다."
                targetLabel={deleteTarget?.shopMap ? `${deleteTarget.title} · ${deleteTarget.shopMap.fname}` : undefined}
                requirePassword={false}
            />

            {/* 처리 결과 알림 */}
            <AlertModal
                open={alert !== null}
                onClose={() => setAlert(null)}
                message={alert?.message ?? ''}
                variant={alert?.variant}
            />
        </section>
    );
}