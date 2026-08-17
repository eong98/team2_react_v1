import { useState, useEffect, type ChangeEvent, type SyntheticEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance, getIP } from '../../../utils/Tool';
import type { TotalMemberUser } from '../../../store/DbmsStore';
import { GlobalStoreSession } from '../../../store/LoginStore';

export default function MemberDetail() {
  const { role, no } = useParams<{ role: 'USER' | 'ADMIN'; no: string }>();
  const { no: mnno } = GlobalStoreSession();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<TotalMemberUser>>({
    id: '', mname: '', email: '', phone: '', status: '', grade: 99,
    zipcode: '', addr: '', addrDetail: '', nation: ''
  });

  useEffect(() => {
    const fetchDetailData = async () => {
      setIsLoading(true);
      try {
        const endpoint = role === 'ADMIN'
          ? `http://${getIP()}:9102/v1/dbms/find/${no}`
          : `http://${getIP()}:9102/v1/user/find/${no}`;

        const res = await axiosInstance.get(endpoint);
        if (res.data) {
          setFormData(res.data);
        }
      } catch (error) {
        console.error('상세 정보 로드 실패:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
        navigate('/dbms/memberlist');
      } finally {
        setIsLoading(false);
      }
    };

    if (no && role) {
      fetchDetailData();
    }
  }, [role, no, navigate]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFormSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      const endpoint = role === 'ADMIN'
        ? `http://${getIP()}:9102/v1/dbms/update/manager/${no}/${mnno}`
        : `http://${getIP()}:9102/v1/user/update/manager/${no}/${mnno}`;

      await axiosInstance.put(endpoint, formData);
      alert('수정이 정상적으로 완료되었습니다.');
      navigate('/dbms/memberlist');
    } catch (error) {
      console.error('데이터 수정 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <section className="view active">
        <PageHeader title="상세 정보" description="상세 데이터를 불러오는 중입니다..." />
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title={`${role === 'ADMIN' ? '관리자' : '일반 회원'} 상세 정보 수정`}
        description={`선택한 계정(No. ${no})의 계정 상태 및 개인 신상 정보를 수정할 수 있습니다.`}
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => navigate(-1)}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={handleFormSubmit}>
        <div className="card card_pad_lg">

          <div className="form_group">
            <label className="form_label" htmlFor="id">아이디(이메일)</label>
            <div className="form_control">
              <input id="id" className="form_input" value={formData.id} disabled readOnly />
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="mname">
              이름<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input id="mname" className="form_input" value={formData.mname} onChange={handleInputChange} required />
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="email">이메일 주소</label>
            <div className="form_control">
              <input id="email" className="form_input" type="email" value={formData.email} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="phone">연락처</label>
            <div className="form_control">
              <input id="phone" className="form_input" value={formData.phone} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="status">계정 상태</label>
            <div className="form_control">
              <select id="status" className="form_select" value={formData.status} onChange={handleInputChange} style={{ maxWidth: 200 }}>
                <option value="ACTIVE">정상 이용</option>
                <option value="SUSPENDED">이용 정지</option>
                <option value="PENDING">승인 대기</option>
              </select>
            </div>
          </div>

          {role === 'ADMIN' && (
            <div className="form_group">
              <label className="form_label" htmlFor="grade">관리 권한 레벨</label>
              <div className="form_control">
                <select id="grade" className="form_select" value={formData.grade} onChange={handleInputChange} style={{ maxWidth: 200 }}>
                  <option value={1}>Level 1 (최고 마스터)</option>
                  <option value={2}>Level 2 (일반 관제관)</option>
                  <option value={3}>Level 3 (모니터링 전용)</option>
                </select>
              </div>
            </div>
          )}

          {role === 'USER' && (
            <>
              <div className="form_group">
                <label className="form_label" htmlFor="zipcode">우편번호</label>
                <div className="form_control">
                  <input id="zipcode" className="form_input" value={formData.zipcode} onChange={handleInputChange} style={{ maxWidth: 200 }} />
                </div>
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="addr">기본 주소</label>
                <div className="form_control">
                  <input id="addr" className="form_input" value={formData.addr} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="addrDetail">상세 주소</label>
                <div className="form_control">
                  <input id="addrDetail" className="form_input" value={formData.addrDetail} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="nation">국가</label>
                <div className="form_control">
                  <input id="nation" className="form_input" value={formData.nation} onChange={handleInputChange} style={{ maxWidth: 200 }} />
                </div>
              </div>
            </>
          )}

          <div className="form_page_footer">
            <button type="button" className="btn btn_md btn_ghost" onClick={() => navigate(-1)}>
              취소
            </button>
            <button type="submit" className="btn btn_md btn_primary">
              수정 완료 저장
            </button>
          </div>

        </div>
      </form>
    </section>
  );
}