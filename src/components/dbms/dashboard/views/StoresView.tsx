import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../DashboardContext';
import { STORES } from '../mock';

export default function StoresView() {
  const { setCurrentStoreName } = useDashboard();
  const navigate = useNavigate();

  const enterStore = (name: string) => {
    setCurrentStoreName(name);
    navigate('../live');
  };

  return (
    <section className="view active">
      <div className="view_head">
        <h1>매장 목록</h1>
        <p>운영 중인 매장을 선택해 관제 화면으로 전환합니다.</p>
      </div>

      <div className="store_grid">
        {STORES.map((s) => (
          <div className="card store_card" key={s.name}>
            <div className="store_thumb">
              <div className="noise" />
              <div className={`sdot badge ${s.status}`}>{s.statusText}</div>
            </div>
            <div className="store_body">
              <div className="sname">{s.name}</div>
              <div className="saddr">{s.addr}</div>
              <div className="store_meta">
                <div>
                  카메라<b>{s.cams}대</b>
                </div>
                <div>
                  오늘 이벤트<b>{s.todayEv}건</b>
                </div>
              </div>
              <button className="btn btn_primary" onClick={() => enterStore(s.name)}>
                입장하기
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
