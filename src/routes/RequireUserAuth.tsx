import { Navigate, Outlet } from 'react-router-dom';
import { GlobalStoreSession } from '../store/LoginStore';

/* ---------------------------------------------------------------------
   /user/* 진입 가드.

   로그인 세션(GlobalStoreSession, sessionStorage 기반)을 확인해서
   - login이 false거나
   - no(회원번호, mno)가 0(손님)이거나
   - grade가 1~10 범위 밖(99=손님 등)이면
   /user/* 하위로 못 들어가고 /login으로 보냅니다.

   App.tsx에서 /user/* 라우트(BaseLayout 포함) 상위에 이 컴포넌트를 감싸서 씁니다.
--------------------------------------------------------------------- */
export default function RequireUserAuth() {
  const login = GlobalStoreSession((state) => state.login);
  const no = GlobalStoreSession((state) => state.no);
  const grade = GlobalStoreSession((state) => state.grade);

  const isAuthorized = login && no !== 0 && grade >= 1 && grade <= 10;

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
