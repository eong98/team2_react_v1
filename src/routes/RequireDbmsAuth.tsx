import { Navigate, Outlet } from 'react-router-dom';
import { GlobalStoreSession } from '../store/LoginStore';

/* ---------------------------------------------------------------------
   /dbms/* 진입 가드. (/user/* 의 RequireUserAuth 와 같은 방식)

   로그인 세션(GlobalStoreSession)을 확인해서
   - login이 false거나
   - no(관리자번호)가 0이거나
   - grade가 관리자 범위(1~5) 밖이면 (6~10 회원, 99 손님)
   /dbms/* 하위로 못 들어가고 관리자 로그인(/dbms/login)으로 보냅니다.

   가드가 없을 때는 주소를 직접 입력하면 관리자 화면 틀이 그대로 열렸습니다.
   (데이터는 서버가 막아서 안 나오지만, 회원으로 로그인한 상태에서는 로그인 화면으로도 넘어가지 않고 빈 화면에 머뭄)

   화면 가드는 편의 장치일 뿐이고, 실제 권한은 서버(SecurityConfig, 각 컨트롤러)가 로그인 토큰으로 확인합니다.
   /dbms/login 은 MainLayout 쪽 라우트라 이 가드를 거치지 않습니다.
--------------------------------------------------------------------- */
export default function RequireDbmsAuth() {
  const login = GlobalStoreSession((state) => state.login);
  const no = GlobalStoreSession((state) => state.no);
  const grade = GlobalStoreSession((state) => state.grade);

  const isAuthorized = login && no !== 0 && grade >= 1 && grade <= 5;

  if (!isAuthorized) {
    return <Navigate to="/dbms/login" replace />;
  }

  return <Outlet />;
}
