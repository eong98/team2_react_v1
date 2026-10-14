/* 메인 첫 화면의 CCTV 4분할 그림
   실제 영상 대신 매장 안을 위에서 비스듬히 본 장면을 그리고, AI가 사람을 따라가는 표시(네모 · 번호)를 얹는다.
   CAM 02 한 칸에서만 이상행동(폭행)이 감지된 모습을 보여 준다. */

const Person = ({ x, y, s = 1, tone = 'p' }: { x: number; y: number; s?: number; tone?: string }) => (
  <g className={`hc_person ${tone}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="0" cy="-30" r="6" />
    <rect x="-7" y="-23" width="14" height="20" rx="5" />
    <rect x="-6" y="-4" width="5" height="14" rx="2" />
    <rect x="1" y="-4" width="5" height="14" rx="2" />
  </g>
);

const Track = ({ x, y, w, h, label, alert = false }: { x: number; y: number; w: number; h: number; label: string; alert?: boolean }) => (
  <g className={`hc_track${alert ? ' alert' : ''}`}>
    <rect x={x} y={y} width={w} height={h} rx="1.5" />
    <rect className="lab" x={x - 0.5} y={y - 9} width={label.length * 4.6 + 8} height="9" rx="1.5" />
    <text x={x + 3.5} y={y - 2.4}>{label}</text>
  </g>
);

/* 바닥 · 벽 · 진열대 공통 */
const Room = ({ children }: { children?: React.ReactNode }) => (
  <>
    <polygon className="hc_floor" points="0,120 160,120 160,62 0,62" />
    <polygon className="hc_wall" points="0,0 160,0 160,62 0,62" />
    <line className="hc_edge" x1="0" y1="62" x2="160" y2="62" />
    {children}
  </>
);

const SCENES = [
  // CAM 01 · 출입구 — 들어오는 손님
  <svg key="1" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice">
    <Room>
      <rect className="hc_door" x="58" y="14" width="44" height="48" rx="1" />
      <line className="hc_frame" x1="80" y1="14" x2="80" y2="62" />
      <rect className="hc_shelf" x="8" y="30" width="34" height="32" rx="1" />
      <rect className="hc_shelf" x="118" y="30" width="34" height="32" rx="1" />
    </Room>
    <g className="hc_walk">
      <Person x={80} y={96} s={1.15} />
      <Track x={70} y={56} w={20} h={53} label="ID 12" />
    </g>
  </svg>,
  // CAM 02 · 진열대 사이 — 폭행 감지
  <svg key="2" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice">
    <Room>
      <rect className="hc_shelf" x="6" y="22" width="40" height="40" rx="1" />
      <rect className="hc_freezer" x="112" y="30" width="42" height="32" rx="2" />
      <line className="hc_frame" x1="133" y1="30" x2="133" y2="62" />
    </Room>
    <Person x={72} y={98} s={1.1} tone="p hot" />
    <g transform="rotate(-12 92 90)"><Person x={92} y={98} s={1.1} tone="p hot" /></g>
    <Track x={58} y={58} w={48} h={52} label="폭행 · 86%" alert />
  </svg>,
  // CAM 03 · 무인 결제기 앞
  <svg key="3" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice">
    <Room>
      <rect className="hc_kiosk" x="96" y="20" width="26" height="42" rx="2" />
      <rect className="hc_screen" x="100" y="25" width="18" height="12" rx="1" />
      <rect className="hc_shelf" x="10" y="26" width="46" height="36" rx="1" />
    </Room>
    <Person x={94} y={100} s={1.05} />
    <Track x={84} y={62} w={21} h={50} label="ID 09" />
  </svg>,
  // CAM 04 · 냉동고 앞 — 오래 머무는 손님
  <svg key="4" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice">
    <Room>
      <rect className="hc_freezer" x="14" y="28" width="60" height="34" rx="2" />
      <line className="hc_frame" x1="34" y1="28" x2="34" y2="62" />
      <line className="hc_frame" x1="54" y1="28" x2="54" y2="62" />
      <rect className="hc_shelf" x="104" y="26" width="46" height="36" rx="1" />
    </Room>
    <Person x={48} y={100} s={1.05} />
    <Track x={38} y={62} w={21} h={50} label="체류 8분" />
    <Person x={124} y={104} s={0.95} />
    <Track x={115} y={70} w={19} h={44} label="ID 15" />
  </svg>,
];

const HeroCams = () => (
  <div className="cams">
    {SCENES.map((scene, i) => (
      <div className={`cam${i === 1 ? ' alert' : ''}`} key={i}>
        <div className="hc_scene">{scene}</div>
        <span className="cam_tag">CAM 0{i + 1}</span>
        <div className="cam_noise" />
      </div>
    ))}
  </div>
);

export default HeroCams;
