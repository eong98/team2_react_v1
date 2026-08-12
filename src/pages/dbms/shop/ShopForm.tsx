import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, ConfirmDeleteModal, AlertModal } from '../../../components/ui';
import { axiosInstance, enter_chk, set_focus } from '../../../utils/Tool.ts';
import type { ShopType } from '../../../components/ts/ShopAdmin.ts';

/* ---------------------------------------------------------------------
   매장 수정(/dbms/shop/:no/edit) - 관리자 화면. 생성 화면은 없음(매장 소유자가
   /user/shop에서 생성). 관리자는 mno 상관없이 모든 매장을 조회/수정/삭제할 수
   있지만, 소유자(mno) 자체는 여기서 바꾸지 않고 참고용으로만 표시합니다.

   ShopDTO (백엔드, dev.jpa.allimio.shop)
   no/mno/title/zip/address/address2/tel/coment/phone/snum/udate/cdate

   API (ShopCont, /shop)
   GET  /shop/{pk}        - 단건 조회
   PUT  /shop/update      - ShopDTO(JSON, no 포함) → 수정
   DELETE /shop/{pk}      - 삭제

   ※ update가 @RequestBody(JSON)이므로 FormData/multipart가 아닌 JSON으로 전송합니다.

   주소 검색: 다음(카카오) 우편번호 서비스 사용. index.html에 전역 스크립트로
   로드되어 있고, window.daum.Postcode(...).open()으로 팝업을 띄워 zip/address를
   채웁니다. (user/shop/ShopForm.tsx와 동일 방식)
   https://postcode.map.daum.net/guide

   레이아웃: .form_group > .form_label + .form_control(.form_hint) 패턴
--------------------------------------------------------------------- */

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
      }) => { open: () => void };
    };
  }
}

interface DaumPostcodeResult {
  zonecode: string; // 우편번호
  roadAddress: string; // 도로명 주소
  jibunAddress: string; // 지번 주소
  userSelectedType: 'R' | 'J'; // 사용자가 선택한 주소 타입
}

interface FieldErrors {
  title?: string;
  zip?: string;
  address?: string;
}

export default function ShopFormView() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();

  const [input, setInput] = useState<Partial<ShopType>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formAlert, setFormAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!no) return;

    setLoading(true);
    axiosInstance
      .get(`/shop/${no}`)
      .then((result) => result.data)
      .then((data: ShopType) => {
        setInput(data);
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [no]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setInput((prev) => ({ ...prev, [id]: value }));
    if (id in errors) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  // 다음 우편번호 검색 팝업. 완료 시 zip/address 채우고 상세주소(address2)로 포커스 이동.
  const openPostcode = () => {
    if (!window.daum?.Postcode) {
      alert('우편번호 검색 스크립트를 불러오지 못했습니다.\n잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        const fullAddress = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;

        setInput((prev) => ({ ...prev, zip: data.zonecode, address: fullAddress }));
        setErrors((prev) => ({ ...prev, zip: undefined, address: undefined }));

        set_focus('address2');
      },
    }).open();
  };

  const goBack = () => navigate('/dbms/shop');

  // ==========================================
  // 입력값 유효성 검사 (QaForm.tsx와 동일 패턴)
  // 필수 항목이 늘어나면 이 배열에 한 줄만 추가하면 됩니다.
  // ==========================================
  const REQUIRED_FIELDS: { field: keyof FieldErrors; label: string; message: string; id: string }[] = [
    { field: 'title', label: '매장명', message: '매장명을 입력해주세요.', id: 'title' },
    { field: 'zip', label: '우편번호', message: '우편번호 검색으로 주소를 입력해주세요.', id: 'btnPostcode' },
    { field: 'address', label: '주소', message: '우편번호 검색으로 주소를 입력해주세요.', id: 'btnPostcode' },
  ];

  const validate = () => {
    for (const { field, message, id } of REQUIRED_FIELDS) {
      if (!input[field]?.trim()) {
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
    if (!no) return;

    // ShopDTO 형태 그대로 JSON으로 전송. mno(소유자)는 관리자 화면에서 바꾸지 않고 그대로 전달.
    const payload: ShopType = {
      no: Number(no),
      mno: input.mno as number,
      title: input.title?.trim() ?? '',
      zip: input.zip?.trim() ?? '',
      address: input.address?.trim() ?? '',
      address2: input.address2?.trim() ?? '',
      tel: input.tel?.trim() ?? '',
      coment: input.coment ?? '',
      phone: input.phone?.trim() ?? '',
      snum: input.snum?.trim() ?? '',
      udate: input.udate ?? null,
      cdate: input.cdate ?? '',
    };

    setSaving(true);
    try {
      const response = await axiosInstance.put('/shop/update', payload);

      if (response.status === 401) {
        setFormAlert({ message: '저장 권한이 없습니다.\n다시 로그인 해주세요.', variant: 'error' });
        return;
      } else if (response.status !== 200) {
        setFormAlert({ message: '저장에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
        return;
      }

      setFormAlert({ message: '매장 정보가 수정되었습니다.', variant: 'success', onConfirm: goBack });
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
      await axiosInstance.delete(`/shop/${no}`);
      goBack();
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n다시 시도해주세요.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="매장 수정" description="불러오는 중..." />
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="view active">
        <PageHeader title="매장 수정" description="해당 매장을 찾을 수 없습니다." />
        <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
          ← 목록으로
        </button>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title="매장 수정"
        description={`No.${no} · 회원 #${input.mno ?? '-'}${input.cdate ? ` · 등록일 ${input.cdate}` : ''}`}
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={send}>
        <div className="card card_pad_lg">

          {/* 소유 회원번호 - 관리자 화면에서는 참고용으로만 표시, 수정 불가 */}
          <div className="form_group">
            <label className="form_label">소유 회원번호</label>
            <div className="form_control">
              <input className="form_input" value={input.mno ?? ''} disabled style={{ maxWidth: 160 }} />
              <div className="form_hint">매장 소유자(mno)는 관리자 화면에서 변경할 수 없습니다.</div>
            </div>
          </div>

          {/* 매장명 */}
          <div className="form_group">
            <label className="form_label" htmlFor="title">
              매장명<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="title"
                className="form_input"
                placeholder="예: 본점 · 스터디카페 A"
                value={input.title ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'btnPostcode')}
              />
              {errors.title && <div className="form_hint error">{errors.title}</div>}
            </div>
          </div>

          {/* 우편번호 + 주소1 - 다음 우편번호 검색 팝업으로 자동 입력, 읽기 전용 */}
          <div className="form_group">
            <label className="form_label" htmlFor="zip">
              우편번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="zip"
                  className="form_input"
                  placeholder="우편번호 검색을 이용해주세요"
                  value={input.zip ?? ''}
                  readOnly
                  onClick={openPostcode}
                  style={{ maxWidth: 160, cursor: 'pointer' }}
                />
                <button
                  type="button"
                  id="btnPostcode"
                  className="btn btn_sm btn_outline_primary"
                  onClick={openPostcode}
                >
                  우편번호 검색
                </button>
              </div>
              {errors.zip && <div className="form_hint error">{errors.zip}</div>}
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="address">
              주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="address"
                className="form_input"
                placeholder="우편번호 검색을 이용해주세요"
                value={input.address ?? ''}
                readOnly
                onClick={openPostcode}
                style={{ cursor: 'pointer' }}
              />
              {errors.address && <div className="form_hint error">{errors.address}</div>}
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="address2">상세주소</label>
            <div className="form_control">
              <input
                id="address2"
                className="form_input"
                placeholder="동/호수 등 상세 주소"
                value={input.address2 ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'tel')}
              />
            </div>
          </div>

          {/* 매장연락처 / 핸드폰 */}
          <div className="form_group">
            <label className="form_label" htmlFor="tel">매장연락처</label>
            <div className="form_control">
              <input
                id="tel"
                className="form_input"
                placeholder="02-1234-5678"
                value={input.tel ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'phone')}
                style={{ maxWidth: 220 }}
              />
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="phone">핸드폰</label>
            <div className="form_control">
              <input
                id="phone"
                className="form_input"
                placeholder="010-1234-5678"
                value={input.phone ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'snum')}
                style={{ maxWidth: 220 }}
              />
            </div>
          </div>

          {/* 사업자등록번호 */}
          <div className="form_group">
            <label className="form_label" htmlFor="snum">사업자등록번호</label>
            <div className="form_control">
              <input
                id="snum"
                className="form_input"
                placeholder="123-45-67890"
                value={input.snum ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'coment')}
                style={{ maxWidth: 220 }}
              />
            </div>
          </div>

          {/* 특이사항 */}
          <div className="form_group">
            <label className="form_label" htmlFor="coment">특이사항</label>
            <div className="form_control">
              <textarea
                id="coment"
                className="form_textarea"
                placeholder="매장 운영 관련 특이사항을 입력하세요"
                value={input.coment ?? ''}
                onChange={onChange}
                style={{ minHeight: 140 }}
              />
              <div className="form_hint">등록 후에도 다시 수정할 수 있습니다.</div>
            </div>
          </div>

          {/* 매장 삭제 - 관리자 권한으로 즉시 삭제 가능 */}
          <div className="card card_pad_md danger" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="b_title">매장 삭제</div>
                <div className="form_hint">삭제한 매장 정보는 복구할 수 없습니다.</div>
              </div>
              <button
                type="button"
                className="btn btn_md btn_danger"
                onClick={() => setDeleteOpen(true)}
              >
                매장 삭제
              </button>
            </div>
          </div>

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
        targetLabel={input.title}
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
