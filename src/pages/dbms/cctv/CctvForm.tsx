import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, ConfirmDeleteModal, AlertModal } from '../../../components/ui';
import { axiosInstance, enter_chk, set_focus } from '../../../utils/Tool.ts';
import { STATE_LABELS, EMPTY_CCTV, type CctvType } from '../../../components/ts/CctvAdmin.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 등록(/dbms/cctv/new) / 수정(/dbms/cctv/:no/edit) - 관리자 전용.
   CCTV 등록/수정/삭제는 이 화면(관리자)에서만 하고, 사용자(user/shop)는
   조회만 할 수 있습니다(user/shop/CctvList.tsx).

   CctvDTO (백엔드, dev.jpa.allimio.cctv)
   no        long    - PK, 생성 시엔 보내지 않아도 됨(시퀀스 채번)
   sno       long    - 매장번호(SHOP.no). 어느 매장 소유 CCTV인지 관리자가 직접 지정
   mac       String  - MAC 주소
   represent String  - 대표 카메라 여부 'Y'/'N'
   cname     String  - CCTV명
   ckdate    String  - 최근 점검일자 (yyyy-MM-dd)
   state     int     - 상태 코드 (CctvAdmin.ts STATE_LABELS 참고)
   cdate     String  - 서버(CctvService.save)에서 Tool.getDate()로 채움

   API (CctvCont, /cctv)
   POST /cctv/save    - CctvDTO(JSON) → 등록
   PUT  /cctv/update  - CctvDTO(JSON, no 포함) → 수정
   GET  /cctv/{pk}    - 단건 조회(수정모드 진입 시)
   DELETE /cctv/{pk}  - 삭제

   매장번호(sno) 확인: 오타로 엉뚱한 매장에 CCTV가 걸리는 걸 막기 위해, sno 입력 후
   "매장 확인" 버튼으로 GET /shop/{pk}를 호출해 매장명을 미리 보여줍니다(참고용 조회일
   뿐이고, 실제 매장 소유권 검증은 아님).

   레이아웃: .form_group > .form_label + .form_control(.form_hint) 패턴 (ShopForm.tsx와 동일 톤)
--------------------------------------------------------------------- */

interface FieldErrors {
  sno?: string;
  cname?: string;
}

export default function CctvFormView() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();
  const isEdit = Boolean(no);

  const [input, setInput] = useState<CctvType>({ ...EMPTY_CCTV });
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formAlert, setFormAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  // 매장번호(sno) 확인 - GET /shop/{pk}로 매장명 미리보기
  const [shopCheck, setShopCheck] = useState<{ loading: boolean; title: string | null; checked: boolean }>({
    loading: false,
    title: null,
    checked: false,
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 수정모드일 때 기존 데이터 조회
  useEffect(() => {
    if (!isEdit) return;

    axiosInstance
      .get(`/cctv/${no}`)
      .then((result) => result.data)
      .then((data: CctvType) => {
        setInput(data);
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [isEdit, no]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setInput((prev) => ({ ...prev, [id]: value }));
    if (id in errors) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
    if (id === 'sno') {
      setShopCheck({ loading: false, title: null, checked: false });
    }
  };

  const checkShop = async () => {
    const sno = input.sno;
    if (!sno) {
      setErrors((prev) => ({ ...prev, sno: '매장번호를 입력해주세요.' }));
      set_focus('sno');
      return;
    }

    setShopCheck({ loading: true, title: null, checked: false });
    try {
      const res = await axiosInstance.get(`/shop/${sno}`);
      const title = res.data?.title as string | undefined;
      setShopCheck({ loading: false, title: title || '(매장명 없음)', checked: true });
    } catch (err) {
      console.error(err);
      setShopCheck({ loading: false, title: null, checked: true });
    }
  };

  const goBack = () => navigate('/dbms/cctv');

  // ==========================================
  // 입력값 유효성 검사 (QaForm.tsx와 동일 패턴)
  // ==========================================
  const REQUIRED_FIELDS: { field: keyof FieldErrors; message: string; id: string }[] = [
    { field: 'sno', message: '매장번호를 입력해주세요.', id: 'sno' },
    { field: 'cname', message: 'CCTV명을 입력해주세요.', id: 'cname' },
  ];

  const validate = () => {
    for (const { field, message, id } of REQUIRED_FIELDS) {
      const value = input[field as keyof CctvType];
      if (!value || String(value).trim() === '') {
        setErrors({ [field]: message });
        set_focus(id);
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // CctvDTO 형태 그대로 JSON으로 전송
    const payload: CctvType = {
      ...(isEdit ? { no: Number(no) } : {}),
      sno: Number(input.sno),
      mac: input.mac?.trim() ?? '',
      represent: input.represent ?? 'N',
      cname: input.cname?.trim() ?? '',
      ckdate: input.ckdate ?? '',
      state: Number(input.state ?? 0),
    };

    setSaving(true);
    try {
      const response = isEdit
        ? await axiosInstance.put('/cctv/update', payload)
        : await axiosInstance.post('/cctv/save', payload);

      if (response.status === 401) {
        setFormAlert({ message: '저장 권한이 없습니다.\n다시 로그인 해주세요.', variant: 'error' });
        return;
      } else if (response.status !== 200) {
        setFormAlert({ message: '저장에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
        return;
      }

      setFormAlert({
        message: isEdit ? 'CCTV 정보가 수정되었습니다.' : 'CCTV가 등록되었습니다.',
        variant: 'success',
        onConfirm: goBack,
      });
    } catch (err) {
      console.error('네트워크 오류:', err);
      setFormAlert({ message: '네트워크 오류가 발생했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!no) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/cctv/${no}`);
      goBack();
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n다시 시도해주세요.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isEdit && loading) {
    return (
      <section className="view active">
        <PageHeader title="CCTV 수정" description="불러오는 중..." />
      </section>
    );
  }

  if (isEdit && notFound) {
    return (
      <section className="view active">
        <PageHeader title="CCTV 수정" description="해당 CCTV를 찾을 수 없습니다." />
        <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
          ← 목록으로
        </button>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? 'CCTV 수정' : 'CCTV 등록'}
        description={
          isEdit
            ? `No.${no}${input.cdate ? ` · 등록일 ${input.cdate}` : ''}`
            : '매장에 새로 설치한 CCTV 장비 정보를 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={send}>
        <div className="card card_pad_lg form_page">

          {/* 매장번호 - 어느 매장 소유 CCTV인지 지정, "매장 확인"으로 매장명 미리보기 */}
          <div className="form_group">
            <label className="form_label" htmlFor="sno">
              매장번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="sno"
                  type="number"
                  className="form_input"
                  placeholder="예: 3"
                  value={input.sno ?? ''}
                  onChange={onChange}
                  onKeyDown={(e) => enter_chk(e, 'cname')}
                  style={{ maxWidth: 160 }}
                />
                <button type="button" className="btn btn_sm btn_outline_primary" onClick={checkShop} disabled={shopCheck.loading}>
                  {shopCheck.loading ? '확인 중...' : '매장 확인'}
                </button>
              </div>
              {errors.sno && <div className="form_hint error">{errors.sno}</div>}
              {!errors.sno && shopCheck.checked && (
                <div className="form_hint" style={{ color: shopCheck.title ? 'var(--text)' : 'var(--danger, #e5484d)' }}>
                  {shopCheck.title ? `매장명: ${shopCheck.title}` : '해당 매장번호를 찾을 수 없습니다. 번호를 다시 확인해주세요.'}
                </div>
              )}
              {!errors.sno && !shopCheck.checked && (
                <div className="form_hint">매장 목록(/dbms/shop)에서 매장번호(No.)를 확인할 수 있습니다.</div>
              )}
            </div>
          </div>

          {/* CCTV명 */}
          <div className="form_group">
            <label className="form_label" htmlFor="cname">
              CCTV명<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="cname"
                className="form_input"
                placeholder="예: 카운터, 출입구, 열람실 A구역"
                value={input.cname ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'mac')}
              />
              {errors.cname && <div className="form_hint error">{errors.cname}</div>}
            </div>
          </div>

          {/* MAC 주소 */}
          <div className="form_group">
            <label className="form_label" htmlFor="mac">MAC 주소</label>
            <div className="form_control">
              <input
                id="mac"
                className="form_input mono"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={input.mac ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'ckdate')}
                style={{ maxWidth: 220 }}
              />
              <div className="form_hint">장비 고유 식별용 MAC 주소입니다. 설치 시 장비 라벨에서 확인할 수 있습니다.</div>
            </div>
          </div>

          {/* 최근 점검일 */}
          <div className="form_group">
            <label className="form_label" htmlFor="ckdate">최근 점검일</label>
            <div className="form_control">
              <input
                id="ckdate"
                type="date"
                className="form_input"
                value={input.ckdate ?? ''}
                onChange={onChange}
                style={{ maxWidth: 200 }}
              />
            </div>
          </div>

          {/* 대표 카메라 여부 */}
          <div className="form_group">
            <label className="form_label" htmlFor="represent">대표 카메라</label>
            <div className="form_control">
              <select
                id="represent"
                className="form_select"
                value={input.represent ?? 'N'}
                onChange={onChange}
                style={{ maxWidth: 160 }}
              >
                <option value="N">일반</option>
                <option value="Y">대표</option>
              </select>
              <div className="form_hint">매장 대시보드 기본 화면에 먼저 보여줄 대표 카메라인지 여부입니다.</div>
            </div>
          </div>

          {/* 상태 */}
          <div className="form_group">
            <label className="form_label" htmlFor="state">상태</label>
            <div className="form_control">
              <select
                id="state"
                className="form_select"
                value={input.state ?? 0}
                onChange={onChange}
                style={{ maxWidth: 160 }}
              >
                {Object.entries(STATE_LABELS).map(([state, label]) => (
                  <option key={state} value={state}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CCTV 삭제 - 수정 모드에서만 노출, 관리자 권한으로 즉시 삭제 가능 */}
          {isEdit && (
            <div className="card card_pad_md danger" style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div className="b_title">CCTV 삭제</div>
                  <div className="form_hint">삭제한 CCTV 정보와 연결된 이슈 이력은 복구할 수 없습니다.</div>
                </div>
                <button
                  type="button"
                  className="btn btn_md btn_danger"
                  onClick={() => setDeleteOpen(true)}
                >
                  CCTV 삭제
                </button>
              </div>
            </div>
          )}

          <div className="form_page_footer">
            <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={send} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        targetLabel={input.cname}
        loading={deleting}
      />

      <AlertModal
        open={formAlert !== null}
        onClose={() => setFormAlert(null)}
        onConfirm={formAlert?.onConfirm}
        message={formAlert?.message ?? ''}
        variant={formAlert?.variant}
      />
    </section>
  );
}
