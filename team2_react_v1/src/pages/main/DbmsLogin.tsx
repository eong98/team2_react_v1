import { Link, useNavigate } from 'react-router-dom';
import { useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { GlobalStoreCookie, GlobalStoreSession } from '../../store/LoginStore';
import PageHeader from '../../components/ui/common/PageHeader';
import { axiosInstance, enter_chk } from '../../utils/Tool';

/* ---------------------------------------------------------------------
  
  페이지의 최상단 타이틀은 PageHeader 공통화한 것으로 사용
  에러 메시지 노출을 위해 form_group 으로 감싸서 사용할 것

  ** 웹 접근성 **
  req 사용시 title='필수 입력 요소' 필수 명시
  인풋 사용시 checkbox,radio 외 모든 인풋요소에 label htmlFor / input id 값 매칭 필수

--------------------------------------------------------------------- */



export default function Login() {
  const navigate = useNavigate();


  //쿠키 저장소 세팅
  const storeId = GlobalStoreCookie((state) => state.storeId);
  const setStoreId = GlobalStoreCookie((state) => state.setStoreId);

  // 아이디 저장 체크시, id를 세팅
  const[input, setInput] = useState(
    {
      id: GlobalStoreSession.getState().id || "",
      password: ""
    }
  )

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    // 구조분해할당
    const { id, value } = e.target;
    console.log(`-> ${id}: ${value}`);
    setInput({
      ...input,  // input 객체의 값 할당
      [e.target.id]: e.target.value, // 해당하는 변수의 값을 덮어씀    
    });
  }

  // 아이디 저장 사용 여부에 따라 저장됨, 저장안됨 상태 변경
  const setStoreIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked === true) {
      setStoreId(true);
    } else {
      setStoreId(false);
    }
  }

  // 버튼 누를 시 테스트 계정 자동 세팅
  const test = () => {
    setInput({
      id: 'admin01', // 해당하는 변수의 값을 덮어씀    
      password: 'password123!',
    });
  }

  // 로그인 버튼 누를 시 동작
  const send = async (e: SyntheticEvent) => {
    e.preventDefault();

    try{
      // id와 비밀번호 값이 일치하는지 확인
      const loginResult = await axiosInstance.post(`http://10.1.205.120:9200/v1/dbms/login?id=${input.id}&password=${input.password}`);
      // 결과 저장
      const loginResultData = loginResult.data;

      if(loginResultData){
        // 로그인에 성공했다면 세션 스토리지에 로그인값과 아이디값을 변경
        GlobalStoreSession.getState().setLogin(true);
        GlobalStoreSession.getState().setId(input.id);

        if(storeId) {
          setStoreId(true);
        } else {
          setStoreId(false);
        }

        alert("로그인에 성공했습니다!")

        navigate('/dbms');
      } else {
        alert("아이디 또는 비밀번호가 일치하지 않습니다")
      }
    } catch(err) {
      console.error(err);
      alert("서버 연결에 실패했습니다")
    }
  }

  return (
    <section className="view active">
      <PageHeader title="로그인" title_size="xlg" description="allimio 관제 서비스에 오신 것을 환영합니다." />      
      <form onSubmit={send}>
      <div className="card card_pad_lg">
        <div className="form_group">
          <label className="form_label" htmlFor="id">
            아이디(이메일)<span className="req" title='필수 입력 요소'>*</span>
          </label>
          <input id="id" className="form_input" placeholder="you@example.com"
          autoFocus onKeyDown={e => enter_chk(e, 'id')} onChange={onChange} value={input.id}/>
        </div>
        <div className='mb-3 form-check div_row_left'>
          <input type="checkbox" id="storeId" className="form-check-input"
            onChange={setStoreIdChange} checked={storeId}
            style={{ marginTop: '0px' }} />
          <label className='form-check-label' htmlFor='storeId'>아이디 저장</label>
        </div>


        <div className="form_group">
          <label className="form_label" htmlFor="password">
            비밀번호<span className="req"title='필수 입력 요소'>*</span>
          </label>
          <input id="password" className="form_input is_error" type="password" placeholder="비밀번호 입력" 
            onKeyDown={e => enter_chk(e, 'btnSend')} onChange={onChange} value={input.password}/>
          <div className="form_hint error">비밀번호는 8자 이상이어야 합니다</div>
        </div>
        
        <button type="button" className="btn btn_lg btn_primary" onClick={test}>테스트</button>
        <button id='btnSend' type="submit" className="btn btn_lg btn_primary" >로그인</button>
        
        <div className="link_row">
          <Link to="/">아이디/비밀번호 찾기</Link>
        </div>
      </div>
      </form>
    </section>
  );
}
