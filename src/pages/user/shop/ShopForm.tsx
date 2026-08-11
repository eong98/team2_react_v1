import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/common/PageHeader';
import { ConfirmDeleteModal } from '../../../components/ui';
import { axiosInstance, enter_chk, set_focus } from '../../../utils/Tool.ts';
import { EMPTY_SHOP, type ShopType } from './Shop.ts';
import { GlobalStoreSession } from '../../../store/LoginStore.ts'; 
// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   매장 등록(/user/shop/new) / 수정(/user/shop/:no/edit) 페이지 - 한 화면에서 처리.

   ShopDTO (백엔드, dev.jpa.allimio.shop)
   no        long    - PK, 생성 시엔 보내지 않아도 됨(시퀀스 채번)
   mno       long    - 회원번호(매장 소유자), 로그인 세션 값 그대로 전송(폼에는 미노출)
   title     String  - 매장명
   zip       String  - 우편번호 (다음 우편번호 검색 팝업으로 자동 입력, 읽기 전용)
   address   String  - 주소1 (다음 우편번호 검색 팝업으로 자동 입력, 읽기 전용)
   address2  String  - 상세주소 (직접 입력)
   tel       String  - 매장연락처
   coment    String  - 특이사항
   phone     String  - 핸드폰(담당자 연락처)
   snum      String  - 사업자등록번호
   udate/cdate       - 서버(ShopService)에서 Tool.getDate()로 채움

   ※ 2026-08-11 PAYSTATE(결제상태)/QRIMG(QR이미지) 필드는 폼에서 제거했습니다.
     QR이미지는 "고객의소리" 쪽에서 받는 것으로 방향이 바뀌었고, 결제상태도
     이 화면 책임이 아닌 것으로 정리됐습니다. (백엔드 Shop/ShopDTO/쿼리도 동일하게 정리)

   API (ShopCont, /shop)
   POST /shop/save          - ShopDTO(JSON) → 등록
   PUT  /shop/update        - ShopDTO(JSON, no 포함) → 수정
   GET  /shop/{pk}          - 단건 조회(수정모드 진입 시)

   ※ save/update가 @RequestBody(JSON)이므로 FormData/multipart가 아닌
     JSON으로 전송합니다.

   주소 검색: 다음(카카오) 우편번호 서비스 사용 (국내 웹사이트에서 가장 흔히 쓰는 방식).
   index.html에 스크립트 태그로 전역 로드해뒀고, window.daum.Postcode(...).open()으로
   팝업을 띄워서 zip/address를 채웁니다. 상세주소(address2)만 직접 입력.
   https://postcode.map.daum.net/guide

   레이아웃: .form_group > .form_label + .form_control(.form_hint) 패턴
   (ShopMenuForm.tsx와 동일 톤)
--------------------------------------------------------------------- */

// 다음 우편번호 서비스는 index.html에서 전역 스크립트로 로드하므로 window.daum 타입만 선언
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

// TODO: 로그인 세션(GlobalStoreSession)에 회원번호(mno) 필드가 아직 없어서
// 우선 고정값으로 둡니다. 로그인 연동 완료되면 세션에서 꺼내 쓰도록 교체해주세요.
// (QaForm.tsx의 mno 처리와 동일한 임시 패턴입니다)
// const { mno,grade } = GlobalStoreSession();
interface FieldErrors {
  title?: string;
  zip?: string;
  address?: string;
}

export default function ShopFormView() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession(); 
  const { no } = useParams<{ no: string }>();
  const isEdit = Boolean(no);

  const [input, setInput] = useState<ShopType>({ ...EMPTY_SHOP, mno });
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // 매장 삭제(수정 모드에서만 사용)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 수정모드일 때 기존 데이터 조회
  useEffect(() => {
    if (!isEdit) return;

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
  }, [isEdit, no]);

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

  const goBack = () => navigate('/user/shop');

  const validate = () => {
    const next: FieldErrors = {};
    if (!input.title?.trim()) next.title = '매장명을 입력해주세요.';
    if (!input.zip?.trim()) next.zip = '우편번호 검색으로 주소를 입력해주세요.';
    if (!input.address?.trim()) next.address = '우편번호 검색으로 주소를 입력해주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // ShopDTO 형태 그대로 JSON으로 전송
    const payload: ShopType = {
      ...(isEdit ? { no: Number(no) } : {}),
      mno: input.mno ?? mno,
      title: input.title?.trim() ?? '',
      zip: input.zip?.trim() ?? '',
      address: input.address?.trim() ?? '',
      address2: input.address2?.trim() ?? '',
      tel: input.tel?.trim() ?? '',
      coment: input.coment ?? '',
      phone: input.phone?.trim() ?? '',
      snum: input.snum?.trim() ?? '',
    };

    setSaving(true);
    try {
      const response = isEdit
        ? await axiosInstance.put('/shop/update', payload)
        : await axiosInstance.post('/shop/save', payload);

      if (response.status === 401) { // axios는 상태값 처리, fetch는 안됨.
        alert('저장 권한이 없습니다.\n다시 로그인 해주세요.');
        return;
      } else if (response.status !== 200) {
        alert('저장에 실패했습니다.\n다시 시도해주세요.');
        return;
      }

      navigate('/user/shop');
    } catch (err) {
      console.error('네트워크 오류:', err);
      alert('네트워크 오류가 발생했습니다.\n다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!no) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/shop/${no}`);
      navigate('/user/shop');
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
        <PageHeader title="매장 수정" description="불러오는 중..." />
      </section>
    );
  }

  if (isEdit && notFound) {
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
        title={isEdit ? '매장 수정' : '매장 생성'}
        description={
          isEdit
            ? `No.${no}${input.cdate ? ` · 등록일 ${input.cdate}` : ''}`
            : '새로 운영을 시작하는 매장 정보를 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={send}>
        <div className="card card_pad_lg">

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

          {/* 매장 삭제 - 수정 모드에서만 노출 */}
          {isEdit && (
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
        targetLabel={input.title}
        loading={deleting}
      />
    </section>
  );
}
