import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui'; // 프로젝트 경로에 맞춰 확인
import { axiosInstance, getIP } from '../../../utils/Tool';

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
    nation: '대한민국',
    role: 'USER', // 기본값: 일반 회원
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력창 데이터 실시간 동기화 핸들러
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // ⭐️ 다음(카카오) 우편번호 검색 팝업 호출 핸들러
  const handleOpenPostcode = () => {
    if (!window.daum || !window.daum.Postcode) {
      alert('우편번호 서비스 라이브러리가 로드되지 않았습니다.\nHTML script 태그를 확인해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data: any) => {
        let fullAddr = data.address; // 기본 주소 변수
        let extraAddr = ''; // 참고 항목 변수

        // 도로명 주소 타입일 경우 참고항목(동/리, 건물명) 조합
        if (data.addressType === 'R') {
          if (data.bname !== '') extraAddr += data.bname;
          if (data.buildingName !== '') extraAddr += extraAddr !== '' ? `, ${data.buildingName}` : data.buildingName;
          fullAddr += extraAddr !== '' ? ` (${extraAddr})` : '';
        }

        // 선택된 우편번호와 기본 주소를 상태에 동기화
        setFormData((prev) => ({
          ...prev,
          zipcode: data.zonecode,
          addr: fullAddr,
        }));

        // 상세주소 입력란으로 포커스 안내 (필요시 커스텀 가능)
        document.getElementById('addrDetail')?.focus();
      },
    }).open();
  };

  // 회원가입 제출 핸들러
  const handleFormSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    // 1. 비밀번호 일치 검증
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    // 2. 우편번호 및 주소 필수 입력 검증 (일반 회원 기준)
    if (!formData.zipcode || !formData.addr) {
      alert('우편번호 검색을 통해 주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 회원가입 API 호출 (서버 endpoint는 프로젝트 환경에 맞게 조정)
      const endpoint = `http://${getIP()}:9102/v1/member/register`;
      
      const payload = {
        id: formData.id,
        password: formData.password,
        mname: formData.mname,
        email: formData.email,
        phone: formData.phone,
        zipcode: formData.zipcode,
        addr: formData.addr,
        addrDetail: formData.addrDetail,
        nation: formData.nation,
        role: formData.role,
      };

      await axiosInstance.post(endpoint, payload);

      alert('회원가입이 성공적으로 완료되었습니다.');
      navigate('/dbms/memberlist'); // 완료 후 회원 목록으로 이동
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

      <form onSubmit={handleFormSubmit}>
        <div className="card card_pad_lg">
          
          {/* 계정 구분 선택 */}
          <div className="form_group">
            <label className="form_label" htmlFor="role">계정 구분<span className="req" title="필수 입력 요소">*</span></label>
            <select id="role" className="form_select" value={formData.role} onChange={handleInputChange}>
              <option value="USER">일반 회원</option>
              <option value="ADMIN">관리자 계정</option>
            </select>
          </div>

          {/* 아이디 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="id">아이디<span className="req" title="필수 입력 요소">*</span></label>
            <input
              id="id"
              className="form_input"
              value={formData.id}
              onChange={handleInputChange}
              placeholder="사용할 아이디를 입력하세요"
              required
            />
          </div>

          {/* 비밀번호 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="password">비밀번호<span className="req" title="필수 입력 요소">*</span></label>
            <input
              id="password"
              type="password"
              className="form_input"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          {/* 비밀번호 확인 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="confirmPassword">비밀번호 확인<span className="req" title="필수 입력 요소">*</span></label>
            <input
              id="confirmPassword"
              type="password"
              className="form_input"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="비밀번호를 다시 한번 입력하세요"
              required
            />
          </div>

          {/* 이름 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="mname">이름<span className="req" title="필수 입력 요소">*</span></label>
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
            <label className="form_label" htmlFor="email">이메일 주소</label>
            <input
              id="email"
              type="email"
              className="form_input"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@domain.com"
            />
          </div>

          {/* 연락처 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="phone">연락처</label>
            <input
              id="phone"
              className="form_input"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="010-0000-0000"
            />
          </div>

          {/* 우편번호 영역 + 주소 검색 버튼 */}
          <div className="form_group">
            <label className="form_label" htmlFor="zipcode">우편번호<span className="req" title="필수 입력 요소">*</span></label>
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
            <label className="form_label" htmlFor="addr">기본 주소<span className="req" title="필수 입력 요소">*</span></label>
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
            <label className="form_label" htmlFor="addrDetail">상세 주소</label>
            <input
              id="addrDetail"
              className="form_input"
              value={formData.addrDetail}
              onChange={handleInputChange}
              placeholder="상세 주소를 입력하세요 (예: 101동 202호)"
            />
          </div>

          {/* 국가 */}
          <div className="form_group">
            <label className="form_label" htmlFor="nation">국가</label>
            <input
              id="nation"
              className="form_input"
              value={formData.nation}
              onChange={handleInputChange}
            />
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