import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui'; // 프로젝트 경로에 맞춰 확인
import { axiosInstance, getIP } from '../../utils/Tool';
import { NATION_OPTIONS } from './nation';

export default function Register() {
  const navigate = useNavigate();

  // 회원가입 폼 데이터 상태 정의
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
    termsAgreeYn: '', // 이용약관 동의
    privacyAgreeYn: '', // 개인정보이용동의
    nation: '대한민국', // 기본값
  });

  // ⭐️ 아이디 중복 확인 통과 여부 상태 (boolean)
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 약관 동의 여부
  const [isAgreedTerms, setIsAgreedTerms] = useState(false);
  const [isAgreedPrivacy, setIsAgreedPrivacy] = useState(false);

  // 입력창 데이터 실시간 동기화 핸들러
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    // 💡 아이디 값이 변경되면 중복 확인 상태를 즉시 초기화 (재검증 필요)
    if (id === 'id') {
      setIsIdChecked(false);
    }

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // ⭐️ 1. 백엔드 연동 아이디 중복 확인 핸들러 (Boolean 리턴 수용)
  const handleCheckDuplicateId = async () => {
    const idTrimmed = formData.id.trim();

    if (!idTrimmed) {
      alert('중복 확인할 아이디를 입력해주세요.');
      return;
    }

    try {
      // id 중복체크 조회 후 결과를 저장, res.data.available로 접근, 성공시 ture, 실패시 false
      const res = await axiosInstance.get(`http://${getIP()}:9102/v1/user/check/${formData.id}`);
      
      if (res.data.available === true) {
        alert('사용 가능한 아이디입니다.');
        setIsIdChecked(true); // 중복 확인 성공 처리
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

  // 다음(카카오) 우편번호 검색 팝업 호출 핸들러
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

        setFormData((prev) => ({
          ...prev,
          zipcode: data.zonecode,
          addr: fullAddr,
        }));

        document.getElementById('addrDetail')?.focus();
      },
    }).open();
  };

  // 회원가입 제출 핸들러
  const handleFormSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    // ⭐️ 2. 제출 전 필수 조건 검증
    if (!isIdChecked) {
      alert('아이디 중복 확인을 진행해주세요.');
      return;
    }

    if (formData.password.length < 8) {
      alert('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const EXCLUDE_FIELDS = ['grade', 'status']

    // ⭐️ 모든 필드가 입력되었는지 2차 체크 (전체 필수입력)
    const emptyFields = Object.entries(formData).filter(([key]) => !EXCLUDE_FIELDS.includes(key)).filter(([_, val]) => !val.toString().trim());
    if (emptyFields.length > 0) {
      const emptyKeys = emptyFields.map(([key]) => key);
      console.log('비어있는 필드명 목록:', emptyKeys);
      // alert('모든 필수 항목을 입력해주세요.');
      return;
    }

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

          {/* 아이디 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="id">
              아이디<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="id"
                className="form_input"
                value={formData.id}
                onChange={handleInputChange}
                placeholder="사용할 아이디를 입력하세요"
                style={{ flex: 1 }}
                required
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
          </div>

          {/* 🔒 비밀번호 영역 (8자 이상) */}
          <div className="form_group">
            <label className="form_label" htmlFor="password">
              비밀번호 (8자 이상)<span className="req" title="필수 입력 요소">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="form_input"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 8자 이상 입력하세요"
              minLength={8}
              required
            />
          </div>

          {/* 비밀번호 확인 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="confirmPassword">
              비밀번호 확인<span className="req" title="필수 입력 요소">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form_input"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="비밀번호를 다시 한번 입력하세요"
              minLength={8}
              required
            />
          </div>

          {/* 이름 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="mname">
              이름<span className="req" title="필수 입력 요소">*</span>
            </label>
            <input
              id="mname"
              className="form_input"
              value={formData.mname}
              onChange={handleInputChange}
              placeholder="성함을 입력하세요"
              required
            />
          </div>

          {/* 이메일 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="email">
              이메일 주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form_input"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@domain.com"
              required
            />
          </div>

          {/* 연락처 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="phone">
              연락처<span className="req" title="필수 입력 요소">*</span>
            </label>
            <input
              id="phone"
              className="form_input"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="010-0000-0000"
              required
            />
          </div>

          {/* 우편번호 영역 + 주소 검색 버튼 */}
          <div className="form_group">
            <label className="form_label" htmlFor="zipcode">
              우편번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="zipcode"
                className="form_input"
                value={formData.zipcode}
                readOnly
                placeholder="우편번호 검색 버튼 클릭"
                style={{ flex: 1 }}
                required
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
          </div>

          {/* 기본 주소 */}
          <div className="form_group">
            <label className="form_label" htmlFor="addr">
              기본 주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <input
              id="addr"
              className="form_input"
              value={formData.addr}
              readOnly
              placeholder="우편번호 검색 시 자동 입력됩니다."
              required
            />
          </div>

          {/* 상세 주소 */}
          <div className="form_group">
            <label className="form_label" htmlFor="addrDetail">
              상세 주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <input
              id="addrDetail"
              className="form_input"
              value={formData.addrDetail}
              onChange={handleInputChange}
              placeholder="상세 주소를 입력하세요 (예: 101동 202호)"
              required
            />
          </div>

          {/* 국가 선택 */}
          <div className="form_group">
            <label className="form_label" htmlFor="nation">
              국가<span className="req" title="필수 입력 요소">*</span>
            </label>
            <select
              id="nation"
              className="form_select"
              value={formData.nation}
              onChange={handleInputChange}
              required
            >
              {NATION_OPTIONS.map((nation) => (
                <option key={nation} value={nation}>
                  {nation}
                </option>
              ))}
            </select>
          </div>

          {/* 약관 동의 영역 (버튼 바로 위 배치 예시) */}
          <div className="form_group" style={{ marginTop: '24px' }}>
            <label className="form_label">서비스 이용 약관 동의<span className="req">*</span></label>
            <div style={{ border: '1px solid #ccc', padding: '12px', height: '100px', overflowY: 'auto', fontSize: '13px', background: '#242121', borderRadius: '4px' }}>
              [이용약관 동의]
              본 관제 시스템의 이용약관...
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="agreeTerms"
                checked={isAgreedTerms}
                onChange={(e) => setIsAgreedTerms(e.target.checked)}
              />
              <label htmlFor="agreeTerms" style={{ cursor: 'pointer', fontSize: '14px' }}>
                위 약관에 동의합니다.
              </label>
            </div>
          </div>

          {/* 약관 동의 영역 (버튼 바로 위 배치 예시) */}
          <div className="form_group" style={{ marginTop: '24px' }}>
            <label className="form_label">서비스 이용 약관 동의<span className="req">*</span></label>
            <div style={{ border: '1px solid #ccc', padding: '12px', height: '100px', overflowY: 'auto', fontSize: '13px', background: '#242121', borderRadius: '4px' }}>
              [개인정보 수집 및 이용 동의]
              본 관제 시스템은 신규 회원가입 및 계정 관리를 위해 최소한의 개인정보를 수집합니다...
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="agreeTerms"
                checked={isAgreedPrivacy}
                onChange={(e) => setIsAgreedPrivacy(e.target.checked)}
              />
              <label htmlFor="agreeTerms" style={{ cursor: 'pointer', fontSize: '14px' }}>
                위 개인정보 수집 이용에 동의합니다.
              </label>
            </div>
          </div>

          {/* 하단 제어 버튼 행 배열 */}
          <div className="div_row_right" style={{ gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn_lg btn_outline_primary"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn_lg btn_primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '가입 처리 중...' : '회원가입 완료'}
            </button>
          </div>

        </div>
      </form>
    </section>
  );
}