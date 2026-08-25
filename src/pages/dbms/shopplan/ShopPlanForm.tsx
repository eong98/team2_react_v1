import { useEffect, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { AlertModal, Modal, PageHeader } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';
import { usePaging } from '../../../hooks/usePaging';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';

/* ---------------------------------------------------------------------
   구독권 등록(/dbms/shopplan/new) / 수정(/dbms/shopplan/:no/edit) - 한 화면에서 처리.

   ShopPlanDTO.Request (백엔드, dev.jpa.allimio.shopplan)
   pname       String  - 구독권 상품이름 (예: '프로')
   pmonth      Integer - 이용기간 (6 | 12)
   bprice      Double  - CCTV 1대당 기본단가
   mincctv     Integer - CCTV 대수 구간 최소
   maxcctv     Integer - CCTV 대수 구간 최대
   description String  - 상세 설명, '|'로 구분해서 저장 (프론트에서 split해 리스트로 노출)
   issell      String  - 'Y'/'N' (상품 마스터 판매 여부 — 매장별 "이용중"과는 다른 필드)
   isreco:     String  - 'Y' | 'N' (이용자의 결제된 구독권이 없는 경우 관리자가 직접 추천하는 구독권에 추천표시)
   

   API (ShopPlanCont, /shop_plan)
   POST /shop_plan       - Request(JSON) → 등록
   PUT  /shop_plan/{no}  - Request(JSON) → 수정
   GET  /shop_plan/{no}  - 단건 조회(수정모드 진입 시)
--------------------------------------------------------------------- */

export default function ShopPlanForm() {
  const { no } = useParams<{ no: string }>();
  const isEdit = Boolean(no);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ShopPlanTypes  | null>(null);

  const { goToList } = usePaging({ basePath: '/dbms/shopplan' });
  
  const [input, setInput] = useState<ShopPlanTypes>({
    no: 0,
    pname: '',
    pmonth: '',
    mincctv: '',
    maxcctv: '',
    bprice: '',
    description: '',
    issell: 'Y',
    isreco: 'N'
  });

  /* 에러타입 정의 */
  type FormErrors = Partial<Record<keyof ShopPlanTypes, string>>;
  const [errors, setErrors] = useState<FormErrors>({});

  // 수정 모드일 때 정보 조회
  const loadPlan = () => {
    axiosInstance
      .get(`/shop_plan/${no}`)
      .then((result) => result.data)
      .then((data) => {
        setInput((prev) => ({
          no: data.no,
          pname: data.pname ?? '',
          pmonth: data.pmonth ?? '',
          bprice: data.bprice ?? '',
          mincctv: data.mincctv ?? '',
          maxcctv: data.maxcctv ?? '',
          description: data.description ?? '',
          issell: data.issell === 'Y' ? 'Y' : 'N',
          isreco: data.isreco === 'Y' ? 'Y' : 'N',
        }));
      })
      .catch((err) => console.error('구독권 상세 조회 실패:', err));
  };

  useEffect(() => {
    if (!isEdit) return;
    loadPlan();
  }, [isEdit, no]);

  // 입력 필드 변경
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue: string | number =
      type === 'number' ? (value === '' ? '' : Number(value)) : value;

    setInput((prev) => ({ ...prev, [name]: newValue }));

    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // 필수 필드 정의
  const REQUIRED_FIELDS: { field: keyof FormErrors; label: string; id: string }[] = [
    { field: 'pname', label: '구독권 이름', id: 'pname' },
    { field: 'pmonth', label: '구독권 개월수', id: 'pmonth' },
    { field: 'maxcctv', label: '등록 가능한 최대 CCTV 개수', id: 'maxcctv' },
    { field: 'mincctv', label: '등록 가능한 최소 CCTV 개수', id: 'mincctv' },
    { field: 'bprice', label: 'CCTV 1대당 단가', id: 'bprice' },
  ];

  // 유효성 검사: 필수 필드 전부 검사해서 전부 에러로 잡고, 포커스는 맨 첫 번째 오류 필드로만 이동
  const validate = () => {
    const newErrors: FormErrors = {};
    let firstErrorId: string | null = null;

    for (const { field, label, id } of REQUIRED_FIELDS) {
      if (!String(input[field] ?? '').trim()) {
        newErrors[field] = `${label}을(를) 입력해주세요.`;
        if (!firstErrorId) firstErrorId = id;
      }
    }
    
    // 대수 구간 검증은 반복문 밖에서 한 번만 (mincctv/maxcctv 둘 다 값이 있을 때만 비교)
    if (
      String(input.mincctv ?? '').trim() &&
      String(input.maxcctv ?? '').trim() &&
      Number(input.mincctv) > Number(input.maxcctv)
    ) {
      newErrors.maxcctv = '최대 대수는 최소 대수보다 크거나 같아야 합니다.';
      if (!firstErrorId) firstErrorId = 'maxcctv';
    }

    setErrors(newErrors);

    if (firstErrorId) {
      set_focus(firstErrorId);
      return false;
    }

    return true;
  };

  // 저장 (등록 / 수정)
  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        pname: input.pname,
        pmonth: Number(input.pmonth),
        bprice: Number(input.bprice),
        mincctv: Number(input.mincctv),
        maxcctv: Number(input.maxcctv),
        description: input.description,
        issell: input.issell,
      };

      if (isEdit) {
        await axiosInstance.put(`/shop_plan/${no}`, payload);
      } else {
        await axiosInstance.post('/shop_plan', payload);
      }

      setAlert({
        message: isEdit ? '구독권이 수정되었습니다.' : '구독권이 등록되었습니다.',
        variant: 'success',
        onConfirm: goToList,
      });
    } catch (error) {
      console.error('공지사항 저장 중 오류 발생:', error);
      setAlert({ message: `오류가 발생했습니다.`, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '구독권 수정' : '구독권 등록'}
        description="구독권 등급·이용기간별 단가와 CCTV 대수 구간을 설정합니다."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

        
      <form onSubmit={send}>
        <div className="card card_pad_lg form_page">
          {/* 구독권 이름 */}
          <div className="form_group">
            <label className="form_label" htmlFor="pname">
              구독권 이름<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                type="text"
                id="pname"
                className={`form_input ${errors.pname ? 'is_error' : ''}`}
                placeholder="예: 프로"
                name="pname"
                value={input.pname}
                onChange={onChange}
                style={{ maxWidth: 200 }}
              />
              {errors.pname && <div className="form_hint error">{errors.pname}</div>}
            </div>
          </div>

          {/* 이용 기간 */}
          <div className="form_group">
            <div className="form_label">
              이용 기간<span className="req" title="필수 입력 요소">*</span>
            </div>
            <div className="form_control">
              <div className="check_row">
                <div className="form_check">
                  <input type="radio" id="pmonth_6" name="pmonth" value={6} checked={Number(input.pmonth) === 6} onChange={onChange} />
                  <label htmlFor="pmonth_6" className="b_title">6개월</label>
                </div>
                <div className="form_check">
                  <input type="radio" id="pmonth_12" name="pmonth" value={12} checked={Number(input.pmonth) === 12} onChange={onChange} />
                  <label htmlFor="pmonth_12" className="b_title">12개월</label>
                </div>
              </div>
              {errors.pmonth && <div className="form_hint error">{errors.pmonth}</div>}
              <div className="form_hint">
                같은 등급이라도 기간이 다르면 별도 행으로 등록해야 합니다 (예: "프로" 6개월 / 12개월 각각 등록).
              </div>
            </div>
          </div>

          {/* 대당 단가 */}
          <div className="form_group">
            <label className="form_label" htmlFor="bprice">
              CCTV 1대당 단가 (원)<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <div className='input_unit'>
                <input
                  type="number"
                  id="bprice"
                  className={`form_input ${errors.bprice ? 'is_error' : ''}`}
                  placeholder="예: 6100"
                  name="bprice"
                  value={input.bprice}
                  onChange={onChange}
                  min={0}
                  style={{ maxWidth: 200 }}
                />
                <span className='unit'>원</span>
              </div>
              {errors.bprice && <div className="form_hint error">{errors.bprice}</div>}
            </div>
          </div>

          {/* CCTV 대수 구간 */}
          <div className="form_group">
            <div className="form_label">
              CCTV 대수 구간<span className="req" title="필수 입력 요소">*</span>
            </div>
            <div className="form_control">
              <div className="check_row" style={{ alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  id="mincctv"
                  className={`form_input ${errors.mincctv ? 'is_error' : ''}`}
                  placeholder="최소"
                  name="mincctv"
                  value={input.mincctv}
                  onChange={onChange}
                  min={1}
                  style={{ width: 60 }}
                />
                <span className="b_title">~</span>
                <input
                  type="number"
                  id="maxcctv"
                  className={`form_input ${errors.maxcctv ? 'is_error' : ''}`}
                  placeholder="최대"
                  name="maxcctv"
                  value={input.maxcctv}
                  onChange={onChange}
                  min={1}
                  style={{ width: 60 }}
                />
                <span className="b_title">대</span>
              </div>
              {(errors.mincctv || errors.maxcctv) && (
                <div className="form_hint error">{errors.mincctv ?? errors.maxcctv}</div>
              )}
              <div className="form_hint">
                구독권 선택 STEP2 에서 사용자가 조정할 수 있는 대수 범위입니다. 다른 등급과 구간이 겹치지 않도록 주의하세요.
              </div>
            </div>
          </div>

          {/* 상세 설명(혜택) */}
          <div className="form_group">
            <label className="form_label" htmlFor="description">
              혜택 설명
            </label>
            <div className="form_control">
              <textarea
                id="description"
                className="form_textarea"
                placeholder="혜택 항목을 | 로 구분해서 입력하세요. 예: 5종 감지|SMS 알림|영상 90일 보관"
                name="description"
                value={input.description}
                onChange={onChange}
                style={{ minHeight: 100 }}
              />
              <div className="form_hint">결제 화면 카드에 목록으로 표시됩니다. '|' 문자로 항목을 구분해주세요.</div>
            </div>
          </div>

          {/* 판매 여부 */}
          <div className="form_group">
            <div className="form_label">판매 여부</div>
            <div className="form_control">
              <div className="check_row">
                <div className="form_check">
                  <input type="radio" id="issell_Y" name="issell" value="Y" checked={input.issell === 'Y'} onChange={onChange} />
                  <label htmlFor="issell_Y" className="b_title">판매중</label>
                </div>
                <div className="form_check">
                  <input type="radio" id="issell_N" name="issell" value="N" checked={input.issell === 'N'} onChange={onChange} />
                  <label htmlFor="issell_N" className="b_title">판매중지</label>
                </div>
              </div>
              <div className="form_hint">
                판매중지로 두면 사용자 결제 화면에서 노출되지 않습니다.
              </div>
            </div>
          </div>

          <div className="form_group">
            <div className="form_label">추천 여부</div>
            <div className="form_control">
              <div className="check_row">
                <div className="form_check">
                  <input type="radio" id="isreco_Y" name="isreco" value="Y" checked={input.isreco === 'Y'} onChange={onChange} />
                  <label htmlFor="isreco_Y" className="b_title">추천</label>
                </div>
                <div className="form_check">
                  <input type="radio" id="isreco_N" name="isreco" value="N" checked={input.isreco === 'N'} onChange={onChange} />
                  <label htmlFor="isreco_N" className="b_title">일반</label>
                </div>
              </div>

              <div className="form_hint">
                같은 이용기간(6개월 / 12개월) 내에서 여러 구독권을 추천으로 설정하면 전부 배지가 붙습니다. 하나만 추천하고 싶으면 관리자가 직접 나머지를 일반으로 바꿔주세요.
              </div>
            </div>
          </div>

          {/* 푸터 버튼 */}
          <div className="form_page_footer">
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              취소
            </button>

            <button type="button" className="btn btn_outline_primary" onClick={() => setPreviewTarget(input)}>
              미리보기
            </button>
            
            <button type="submit" className="btn btn_md btn_primary" disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>

      
      {/* 사용자 결제화면 카드 미리보기 — /user/subscribe STEP2의 plan_card와 동일 마크업 */}
      <Modal
        open={previewTarget !== null}
        onClose={() => setPreviewTarget(null)}
        titleId="planPreviewTitle"
        title="사용자 화면 미리보기"
        footer={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => setPreviewTarget(null)}>
            닫기
          </button>
        }
      >
        {previewTarget && (
          <div>
            <p className="b_title" style={{ marginBottom: 10 }}>
              사용자가 구독권을 선택하는 화면에 아래처럼 보여집니다.
            </p>
            <div className="plan_grid">
              <div className={`card plan_card${previewTarget.isreco === 'Y' ? ' plan_highlight' : ''}`}>
                {previewTarget.isreco === 'Y' && <span className="plan_tag reco">추천</span>}

                <h3>{previewTarget.pname}</h3>
                
                <div className="plan_range mono">
                  {previewTarget.mincctv} ~ {previewTarget.maxcctv}대
                </div>

                <div className="plan_unit mono">
                  대당 <span className="price">{previewTarget.bprice.toLocaleString('ko-KR')}</span>원 / {previewTarget.pmonth}개월
                </div>

                {previewTarget.description && (
                  <ul>
                    {previewTarget.description.split('|').map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {previewTarget.issell === 'N' && (
              <p className="form_hint error" style={{ marginTop: 10 }}>
                판매중지 상태입니다 — 사용자 화면에 노출되지 않습니다.
              </p>
            )}
          </div>
        )}
      </Modal>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}