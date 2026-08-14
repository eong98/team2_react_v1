import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui';
import { axiosInstance, getIP, set_focus } from '../../utils/Tool';
import { NATION_OPTIONS } from '../../components/ts/nation';

type FieldKey =
  | 'id' | 'password' | 'confirmPassword' | 'mname' | 'email' | 'phone'
  | 'zipcode' | 'addr' | 'addrDetail';

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: '',
    password: '',
    confirmPassword: '',
    mname: '',
    email: '',
    phone: '',
    zipcode: '',
    addr: '',
    addrDetail: '',
    termsAgreeYn: '',
    privacyAgreeYn: '',
    nation: '대한민국',
  });

  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAgreedTerms, setIsAgreedTerms] = useState(false);
  const [isAgreedPrivacy, setIsAgreedPrivacy] = useState(false);

  // 🔴 필수값 미입력 / 비밀번호 8자 미만 / 비밀번호 불일치 등의 에러 상태
  type FormErrors = Partial<Record<FieldKey | 'terms' | 'privacy', string>>;
  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    if (id === 'id') {
      setIsIdChecked(false);
    }

    setFormData((prev) => ({ ...prev, [id]: value }));

    if (id in errors) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
    // 비밀번호를 다시 입력하면 확인 필드 불일치 에러도 같이 지워줌
    if (id === 'password' && errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleCheckDuplicateId = async () => {
    const idTrimmed = formData.id.trim();

    if (!idTrimmed) {
      setErrors((prev) => ({ ...prev, id: '중복 확인할 아이디를 입력해주세요.' }));
      set_focus('id');
      return;
    }

    try {
      const res = await axiosInstance.get(`http://${getIP()}:9102/v1/user/check/${formData.id}`);

      if (res.data.available === true) {
        alert('사용 가능한 아이디입니다.');
        setIsIdChecked(true);
        setErrors((prev) => ({ ...prev, id: undefined }));
      } else {
        alert('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
        setIsIdChecked(false);
      }
    } catch (error) {
      console.error('아이디 중복 확인 실패:', error);
      alert('아이디 중복 확인 중 오류가 발생했습니다.');
      setIsIdChecked(false);
    }
  };

  const handleOpenPostcode = () => {
    const daum = (window as any).daum;

    if (!daum || !daum.Postcode) {
      alert('우편번호 서비스 라이브러리가 로드되지 않았습니다.');
      return;
    }

    new daum.Postcode({
      oncomplete: (data: any) => {
        let fullAddr = data.address;
        let extraAddr = '';

        if (data.addressType === 'R') {
          if (data.bname !== '') extraAddr += data.bname;
          if (data.buildingName !== '') extraAddr += extraAddr !== '' ? `, ${data.buildingName}` : data.buildingName;
          fullAddr += extraAddr !== '' ? ` (${extraAddr})` : '';
        }

        setFormData((prev) => ({ ...prev, zipcode: data.zonecode, addr: fullAddr }));
        setErrors((prev) => ({ ...prev, zipcode: undefined, addr: undefined }));

        document.getElementById('addrDetail')?.focus();
      },
    }).open();
  };

  // ==========================================
  // 유효성 검사 (QaForm.tsx REQUIRED_FIELDS 패턴)
  // ==========================================
  const REQUIRED_TEXT_FIELDS: { field: FieldKey; label: string; id: string }[] = [
    { field: 'id', label: '아이디', id: 'id' },
    { field: 'password', label: '비밀번호', id: 'password' },
    { field: 'confirmPassword', label: '비밀번호 확인', id: 'confirmPassword' },
    { field: 'mname', label: '이름', id: 'mname' },
    { field: 'email', label: '이메일 주소', id: 'email' },
    { field: 'phone', label: '연락처', id: 'phone' },
    { field: 'zipcode', label: '우편번호', id: 'zipcode' },
    { field: 'addr', label: '기본 주소', id: 'addr' },
    { field: 'addrDetail', label: '상세 주소', id: 'addrDetail' },
  ];

  const validate = () => {
    const newErrors: FormErrors = {};
    let firstErrorId: string | null = null;

    for (const { field, label, id } of REQUIRED_TEXT_FIELDS) {
      if (!formData[field].toString().trim()) {
        newErrors[field] = `${label}을(를) 입력해주세요.`;
        if (!firstErrorId) firstErrorId = id;
      }
    }

    // 아이디 중복확인 여부
    if (!newErrors.id && !isIdChecked) {
      newErrors.id = '아이디 중복 확인을 진행해주세요.';
      if (!firstErrorId) firstErrorId = 'id';
    }

    // 비밀번호 8자 미만
    if (!newErrors.password && formData.password.length < 8) {
      newErrors.password = '비밀번호가 8자 미만입니다.';
      if (!firstErrorId) firstErrorId = 'password';
    }

    // 비밀번호 확인 불일치
    if (!newErrors.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호와 확인이 일치하지 않습니다.';
      if (!firstErrorId) firstErrorId = 'confirmPassword';
    }

    // 약관 동의
    if (!isAgreedTerms) {
      newErrors.terms = '서비스 이용 약관에 동의해주세요.';
      if (!firstErrorId) firstErrorId = 'agreeTerms';
    }
    if (!isAgreedPrivacy) {
      newErrors.privacy = '개인정보 수집 및 이용에 동의해주세요.';
      if (!firstErrorId) firstErrorId = 'agreePrivacy';
    }

    setErrors(newErrors);

    if (firstErrorId) {
      set_focus(firstErrorId);
      return false;
    }
    return true;
  };

  const handleFormSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const endpoint = `http://${getIP()}:9102/v1/user/save`;

      const payload = {
        id: formData.id,
        password: formData.password,
        mname: formData.mname,
        email: formData.email,
        phone: formData.phone,
        zipcode: formData.zipcode,
        addr: formData.addr,
        addrDetail: formData.addrDetail,
        grade: 6,
        status: 1,
        termsAgreeYn: isAgreedTerms ? 'Y' : 'N',
        privacyAgreeYn: isAgreedPrivacy ? 'Y' : 'N',
        nation: formData.nation,
      };

      await axiosInstance.post(endpoint, payload);

      alert('회원가입이 성공적으로 완료되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('회원가입 처리 실패:', error);
      alert('회원가입 중 오류가 발생했습니다. 입력 정보를 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="view active">
      <PageHeader
        title="신규 회원가입"
        description="관제 시스템에 가입할 신규 일반 회원 및 관리자 계정을 등록합니다."
      />

      <form onSubmit={handleFormSubmit} noValidate>
        <div className="card card_pad_lg">

          {/* 아이디 */}
          <div className="form_group">
            <label className="form_label" htmlFor="id">
              아이디<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="id"
                  className={`form_input${errors.id ? ' is_error' : ''}`}
                  value={formData.id}
                  onChange={handleInputChange}
                  placeholder="사용할 아이디를 입력하세요"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className={`btn ${isIdChecked ? 'btn_success' : 'btn_outline_primary'}`}
                  onClick={handleCheckDuplicateId}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isIdChecked ? '확인 완료' : '중복 확인'}
                </button>
              </div>
              {errors.id && <div className="form_hint error">{errors.id}</div>}
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="form_group">
            <label className="form_label" htmlFor="password">
              비밀번호 (8자 이상)<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="password"
                type="password"
                className={`form_input${errors.password ? ' is_error' : ''}`}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="비밀번호를 8자 이상 입력하세요"
              />
              {errors.password && <div className="form_hint error">{errors.password}</div>}
            </div>
          </div>

          {/* 비밀번호 확인 */}
          <div className="form_group">
            <label className="form_label" htmlFor="confirmPassword">
              비밀번호 확인<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="confirmPassword"
                type="password"
                className={`form_input${errors.confirmPassword ? ' is_error' : ''}`}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="비밀번호를 다시 한번 입력하세요"
              />
              {errors.confirmPassword && <div className="form_hint error">{errors.confirmPassword}</div>}
            </div>
          </div>

          {/* 이름 */}
          <div className="form_group">
            <label className="form_label" htmlFor="mname">
              이름<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="mname"
                className={`form_input${errors.mname ? ' is_error' : ''}`}
                value={formData.mname}
                onChange={handleInputChange}
                placeholder="성함을 입력하세요"
              />
              {errors.mname && <div className="form_hint error">{errors.mname}</div>}
            </div>
          </div>

          {/* 이메일 */}
          <div className="form_group">
            <label className="form_label" htmlFor="email">
              이메일 주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="email"
                type="email"
                className={`form_input${errors.email ? ' is_error' : ''}`}
                value={formData.email}
                onChange={handleInputChange}
                placeholder="example@domain.com"
              />
              {errors.email && <div className="form_hint error">{errors.email}</div>}
            </div>
          </div>

          {/* 연락처 */}
          <div className="form_group">
            <label className="form_label" htmlFor="phone">
              연락처<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="phone"
                className={`form_input${errors.phone ? ' is_error' : ''}`}
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="010-0000-0000"
              />
              {errors.phone && <div className="form_hint error">{errors.phone}</div>}
            </div>
          </div>

          {/* 우편번호 */}
          <div className="form_group">
            <label className="form_label" htmlFor="zipcode">
              우편번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="zipcode"
                  className={`form_input${errors.zipcode ? ' is_error' : ''}`}
                  value={formData.zipcode}
                  readOnly
                  placeholder="우편번호 검색 버튼 클릭"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn_outline_primary"
                  onClick={handleOpenPostcode}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  우편번호 검색
                </button>
              </div>
              {errors.zipcode && <div className="form_hint error">{errors.zipcode}</div>}
            </div>
          </div>

          {/* 기본 주소 */}
          <div className="form_group">
            <label className="form_label" htmlFor="addr">
              기본 주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="addr"
                className={`form_input${errors.addr ? ' is_error' : ''}`}
                value={formData.addr}
                readOnly
                placeholder="우편번호 검색 시 자동 입력됩니다."
              />
              {errors.addr && <div className="form_hint error">{errors.addr}</div>}
            </div>
          </div>

          {/* 상세 주소 */}
          <div className="form_group">
            <label className="form_label" htmlFor="addrDetail">
              상세 주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="addrDetail"
                className={`form_input${errors.addrDetail ? ' is_error' : ''}`}
                value={formData.addrDetail}
                onChange={handleInputChange}
                placeholder="상세 주소를 입력하세요 (예: 101동 202호)"
              />
              {errors.addrDetail && <div className="form_hint error">{errors.addrDetail}</div>}
            </div>
          </div>

          {/* 국가 */}
          <div className="form_group">
            <label className="form_label" htmlFor="nation">
              국가<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <select id="nation" className="form_select" value={formData.nation} onChange={handleInputChange}>
                {NATION_OPTIONS.map((nation) => (
                  <option key={nation} value={nation}>{nation}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 이용약관 동의 */}
          <div className="form_group" style={{ marginTop: '24px' }}>
            <label className="form_label">서비스 이용 약관 동의<span className="req">*</span></label>
            <div className="form_control">
              <div style={{ border: '1px solid var(--border)', padding: '12px', height: '100px', overflowY: 'auto', fontSize: '13px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                [이용약관 동의]
                본 관제 시스템의 이용약관...
              </div>
              <div className="form_check" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={isAgreedTerms}
                  onChange={(e) => {
                    setIsAgreedTerms(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                  }}
                />
                <label htmlFor="agreeTerms" className="b_title">위 약관에 동의합니다.</label>
              </div>
              {errors.terms && <div className="form_hint error">{errors.terms}</div>}
            </div>
          </div>

          {/* 개인정보 수집 및 이용 동의 */}
          <div className="form_group" style={{ marginTop: '24px' }}>
            <label className="form_label">개인정보 수집 및 이용 동의<span className="req">*</span></label>
            <div className="form_control">
              <div style={{ border: '1px solid var(--border)', padding: '12px', height: '100px', overflowY: 'auto', fontSize: '13px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                [개인정보 수집 및 이용 동의]
                본 관제 시스템은 신규 회원가입 및 계정 관리를 위해 최소한의 개인정보를 수집합니다...
              </div>
              <div className="form_check" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="agreePrivacy"
                  checked={isAgreedPrivacy}
                  onChange={(e) => {
                    setIsAgreedPrivacy(e.target.checked);
                    if (errors.privacy) setErrors((prev) => ({ ...prev, privacy: undefined }));
                  }}
                />
                <label htmlFor="agreePrivacy" className="b_title">위 개인정보 수집 이용에 동의합니다.</label>
              </div>
              {errors.privacy && <div className="form_hint error">{errors.privacy}</div>}
            </div>
          </div>

          <div className="form_page_footer">
            <button
              type="button"
              className="btn btn_lg btn_ghost"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button type="submit" className="btn btn_lg btn_primary" disabled={isSubmitting}>
              {isSubmitting ? '가입 처리 중...' : '회원가입 완료'}
            </button>
          </div>

        </div>
      </form>
    </section>
  );
}