import { useState, useEffect, type ChangeEvent, type SyntheticEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui'; // 공통 UI 컴포넌트 경로에 맞게 확인
import { axiosInstance } from '../../../utils/Tool';
import type { TotalMemberUser } from '../../../store/DbmsStore';

export default function MemberDetail() {
  const { role, no } = useParams<{ role: 'USER' | 'ADMIN'; no: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  // 백엔드 명세 데이터 구조를 수용할 단건 데이터 상태
  const [formData, setFormData] = useState<Partial<TotalMemberUser>>({
    id: '',
    mname: '',
    email: '',
    phone: '',
    status: '',
    grade: 99,
    zipcode: '',
    addr: '',
    addrDetail: '',
    nation: ''
  });

  // 1. 페이지 진입 시 단건 데이터 로드
  useEffect(() => {
    const fetchDetailData = async () => {
      setIsLoading(true);
      try {
        // role(USER/ADMIN)에 따라 각각 알맞은 단건 조회 API를 호출합니다.
        const endpoint = role === 'ADMIN' 
          ? `http://10.1.205.120:9102/v1/dbms/find/${no}`  // 관리자 단건 조회 API (예시)
          : `http://10.1.205.120:9102/v1/member/find/${no}`; // 일반회원 단건 조회 API (예시)

        const res = await axiosInstance.get(endpoint);
        if (res.data) {
          setFormData(res.data);
        }
      } catch (error) {
        console.error("상세 정보 로드 실패:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
        navigate('/dbms/memberlist');
      } finally {
        setIsLoading(false);
      }
    };

    if (no && role) {
      fetchDetailData();
    }
  }, [role, no, navigate]);

  // 2. 입력창 데이터 실시간 동기화 핸들러
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  // 3. 수정 사항 저장 제출 핸들러
  const handleFormSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      // 대상을 수정(Update)하기 위한 분기 처리 API 호출
      const endpoint = role === 'ADMIN'
        ? ``
        : ``;

      await axiosInstance.put(endpoint, formData);
      alert("수정이 정상적으로 완료되었습니다.");
      navigate('/dbms/memberlist'); // 완료 후 목록으로 리다이렉트
    } catch (error) {
      console.error("데이터 수정 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return <div className="loading_box">상세 데이터를 로드하고 있습니다...</div>;
  }

  return (
    <section className="view active">
      <PageHeader 
        title={`${role === 'ADMIN' ? '🔑 관리자' : '👤 일반 회원'} 상세 정보 수정`} 
        description={`선택한 계정(No. ${no})의 계정 상태 및 개인 신상 정보를 수정할 수 있습니다.`} 
      />

      <form onSubmit={handleFormSubmit}>
        <div className="card card_pad_lg">
          
          {/* [공통] 아이디 영역 (수정 불가 고정) */}
          <div className="form_group">
            <label className="form_label" htmlFor="id">아이디(이메일)</label>
            <input id="id" className="form_input" value={formData.id} disabled readOnly />
          </div>

          {/* [공통] 이름 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="mname">이름<span className="req" title='필수 입력 요소'>*</span></label>
            <input id="mname" className="form_input" value={formData.mname} onChange={handleInputChange} required />
          </div>

          {/* [공통] 이메일 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="email">이메일 주소</label>
            <input id="email" className="form_input" type="email" value={formData.email} onChange={handleInputChange} />
          </div>

          {/* [공통] 연락처 영역 */}
          <div className="form_group">
            <label className="form_label" htmlFor="phone">연락처</label>
            <input id="phone" className="form_input" value={formData.phone} onChange={handleInputChange} />
          </div>

          {/* [공통] 계정 활성화 상태 변경 제어 */}
          <div className="form_group">
            <label className="form_label" htmlFor="status">계정 상태</label>
            <select id="status" className="form_select" value={formData.status} onChange={handleInputChange}>
              <option value="ACTIVE">정상 이용</option>
              <option value="SUSPENDED">이용 정지</option>
              <option value="PENDING">승인 대기</option>
            </select>
          </div>

          {/* 🔑 관리자 전용 노출 필드 (grade 등급 제어) */}
          {role === 'ADMIN' && (
            <div className="form_group">
              <label className="form_label" htmlFor="grade">관리 권한 레벨</label>
              <select id="grade" className="form_select" value={formData.grade} onChange={handleInputChange}>
                <option value={1}>Level 1 (최고 마스터)</option>
                <option value={2}>Level 2 (일반 관제관)</option>
                <option value={3}>Level 3 (모니터링 전용)</option>
              </select>
            </div>
          )}

          {/* 👤 일반 회원 전용 노출 필드 (주소 정보 그룹) */}
          {role === 'USER' && (
            <>
              <div className="form_group">
                <label className="form_label" htmlFor="zipcode">우편번호</label>
                <input id="zipcode" className="form_input" value={formData.zipcode} onChange={handleInputChange} />
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="addr">기본 주소</label>
                <input id="addr" className="form_input" value={formData.addr} onChange={handleInputChange} />
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="addrDetail">상세 주소</label>
                <input id="addrDetail" className="form_input" value={formData.addrDetail} onChange={handleInputChange} />
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="nation">국가</label>
                <input id="nation" className="form_input" value={formData.nation} onChange={handleInputChange} />
              </div>
            </>
          )}

          {/* 하단 제어 버튼 행 배열 */}
          <div className="div_row_right" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn_lg btn_outline_primary" onClick={() => navigate(-1)}>
              취소 및 목록으로
            </button>
            <button type="submit" className="btn btn_lg btn_primary">
              수정 완료 저장
            </button>
          </div>

        </div>
      </form>
    </section>
  );
}