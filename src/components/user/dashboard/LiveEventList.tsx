import type { DashboardEvent } from './Live.mock';

interface LiveEventListProps {
  events: DashboardEvent[];
  openDetail: (id: number) => void;
}

export default function LiveEventList({ events, openDetail }: LiveEventListProps) {
  const recent = events.slice(0, 4);

  return (
    <div className="side_col">
      <div className="stat_mini_grid">
        <div className="card stat_mini">
          <div className="lab">현재 인원</div>
          <div className="val green">3명</div>
        </div>
        <div className="card stat_mini">
          <div className="lab">오늘 이벤트</div>
          <div className="val amber">5건</div>
        </div>
        <div className="card stat_mini">
          <div className="lab">소음 레벨</div>
          <div className="val">32dB</div>
        </div>
        <div className="card stat_mini">
          <div className="lab">출입 상태</div>
          <div className="val green">정상</div>
        </div>
      </div>

      <div className="card recent_card">
        <h3>최근 이벤트</h3>
        <div>
          {recent.map((ev) => (
            <div
              key={ev.id}
              className="ev_row"
              role="button"
              tabIndex={0}
              aria-label={`${ev.cam} · ${ev.type} 이벤트 상세보기`}
              onClick={() => openDetail(ev.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openDetail(ev.id);
                }
              }}
            >
              <div className={`ev_bar ${ev.level}`} />
              <div className="ev_main">
                <div className="ev_type">
                  {ev.cam} · {ev.type}
                </div>
                <div className="ev_meta">{ev.time}</div>
              </div>
              <div className="chev">›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
