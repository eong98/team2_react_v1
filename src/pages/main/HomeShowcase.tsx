/* 메인(랜딩)의 "서비스 화면" 그림
   실시간 CCTV 화면 대신, 이상행동이 감지됐을 때 점주가 받는 것(알림 → AI 검토 → 도면 위 위치 → 통계)을 한 장으로 보여 준다.
   실제 화면 캡처가 아니라 그림이므로, 화면 문구는 서비스에 있는 표현만 쓴다. */

const VISITS = [4, 6, 5, 9, 7, 12, 10, 14, 11, 16, 13, 18]; // 방문객 추이(예시)

const HomeShowcase = () => {
  const max = Math.max(...VISITS);
  const pts = VISITS.map((v, i) => `${24 + i * 22},${92 - (v / max) * 60}`).join(' ');

  return (
    <div className="showcase">
      <svg viewBox="0 0 1120 560" role="img" aria-label="이상행동이 감지되면 알림, AI 검토 결과, 도면 위 발생 위치, 매장 통계를 받아 보는 흐름">
        {/* ① 매장 도면 + 발생 위치 */}
        <g className="sc_panel">
          <rect x="16" y="16" width="420" height="528" rx="14" />
          <text className="sc_cap" x="40" y="52">매장 도면 위 발생 위치</text>
          <text className="sc_sub" x="40" y="74">감지된 곳을 도면에 바로 표시합니다</text>

          {/* 도면 */}
          <g className="sc_plan">
            <rect x="44" y="100" width="364" height="330" rx="6" />
            {/* 진열대 */}
            <rect className="shelf" x="68" y="124" width="150" height="34" rx="4" />
            <rect className="shelf" x="234" y="124" width="150" height="34" rx="4" />
            <rect className="shelf" x="68" y="196" width="34" height="150" rx="4" />
            <rect className="shelf" x="150" y="210" width="130" height="34" rx="4" />
            <rect className="shelf" x="150" y="280" width="130" height="34" rx="4" />
            <rect className="shelf" x="350" y="196" width="34" height="150" rx="4" />
            {/* 결제기 · 출입구 */}
            <rect className="kiosk" x="296" y="376" width="88" height="34" rx="4" />
            <text className="sc_tiny" x="340" y="398" textAnchor="middle">무인 결제기</text>
            <line className="door" x1="92" y1="430" x2="168" y2="430" />
            <text className="sc_tiny" x="130" y="450" textAnchor="middle">출입구</text>
            {/* CCTV */}
            <g className="camdot">
              <circle cx="60" cy="116" r="6" />
              <path d="M60 116 L150 190 L96 232 Z" />
              <text className="sc_tiny" x="74" y="112">CCTV #1</text>
            </g>
          </g>

          {/* 발생 위치 */}
          <g className="sc_pin">
            <circle className="ring" cx="228" cy="262" r="16" />
            <circle className="ring late" cx="228" cy="262" r="16" />
            <circle className="core" cx="228" cy="262" r="8" />
          </g>
          <g className="sc_tag">
            <rect x="246" y="232" width="118" height="30" rx="15" />
            <text x="305" y="252" textAnchor="middle">폭행 · AI 판단 86%</text>
          </g>

          {/* 범례 */}
          <g className="sc_legend">
            <circle className="core" cx="52" cy="486" r="5" />
            <text className="sc_tiny" x="64" y="490">발생 위치</text>
            <circle className="cam" cx="150" cy="486" r="5" />
            <text className="sc_tiny" x="162" y="490">CCTV</text>
            <rect className="shelf" x="216" y="480" width="16" height="12" rx="2" />
            <text className="sc_tiny" x="240" y="490">진열대</text>
          </g>
          <text className="sc_sub" x="40" y="522">2026-10-06 16:55:02 · CCTV #1</text>
        </g>

        {/* 연결선 */}
        <path className="sc_link" d="M436 180 H468" />
        <path className="sc_link" d="M436 400 H468" />

        {/* ② 알림 + AI 검토 */}
        <g className="sc_panel">
          <rect x="468" y="16" width="372" height="318" rx="14" />
          <text className="sc_cap" x="492" y="52">알림 · AI 확인 결과</text>
          <g className="sc_alert">
            <rect x="492" y="68" width="324" height="62" rx="10" />
            <circle cx="520" cy="99" r="12" />
            <path d="M520 91 v9 M520 104 v1.5" />
            <text className="t" x="544" y="94">폭행이 감지되었습니다</text>
            <text className="d" x="544" y="114">두 사람 간 격한 움직임이 반복 감지</text>
            <text className="time" x="804" y="94" textAnchor="end">16:55</text>
          </g>
          <g className="sc_review">
            <rect className="chip" x="492" y="146" width="74" height="24" rx="12" />
            <text className="chip_t" x="529" y="162" textAnchor="middle">판단 보류</text>
            <text className="by" x="576" y="162">AI가 관련 기록 4건을 살펴봤습니다</text>
            <circle cx="500" cy="194" r="2.5" /><text x="512" y="198">발생 시각 매장 방문객 0명</text>
            <circle cx="500" cy="220" r="2.5" /><text x="512" y="224">최근 7일 같은 CCTV에서 폭행 4건</text>
            <circle cx="500" cy="246" r="2.5" /><text x="512" y="250">같은 종류를 판단한 기록 없음</text>
            <rect className="tip" x="492" y="266" width="324" height="50" rx="8" />
            <text className="tip_l" x="506" y="286">권장 조치</text>
            <text className="tip_t" x="506" y="305">해당 시간대 영상을 직접 확인하세요</text>
          </g>
        </g>

        {/* ③ 문자 · 메일 */}
        <g className="sc_panel">
          <rect x="864" y="16" width="240" height="318" rx="14" />
          <text className="sc_cap" x="888" y="52">문자 · 메일</text>
          <g className="sc_phone">
            <rect x="900" y="68" width="168" height="250" rx="22" />
            <rect className="notch" x="962" y="78" width="44" height="6" rx="3" />
            <g className="bubble">
              <rect x="914" y="104" width="140" height="66" rx="10" />
              <text className="b" x="926" y="124">[Allimio] 이상행동 감지</text>
              <text x="926" y="142">매장: 본점 · CCTV #1</text>
              <text x="926" y="158">유형: 폭행 (86%)</text>
            </g>
            <g className="bubble mail">
              <rect x="914" y="184" width="140" height="82" rx="10" />
              <text className="b" x="926" y="204">알림 메일</text>
              <text x="926" y="222">받는 분의 언어로 번역해</text>
              <text x="926" y="238">보내 드립니다</text>
              <text className="lang" x="926" y="256">한국어 · English · 日本語</text>
            </g>
          </g>
        </g>

        {/* ④ 처리 + 통계 */}
        <g className="sc_panel">
          <rect x="468" y="358" width="300" height="186" rx="14" />
          <text className="sc_cap" x="492" y="394">확인하고 직접 처리</text>
          <text className="sc_sub" x="492" y="416">AI 의견은 참고용, 최종 판단은 점주님이 합니다</text>
          <g className="sc_btns">
            <rect className="ghost" x="492" y="440" width="120" height="42" rx="8" />
            <text className="ghost_t" x="552" y="466" textAnchor="middle">잘못된 감지</text>
            <rect className="solid" x="624" y="440" width="120" height="42" rx="8" />
            <text className="solid_t" x="684" y="466" textAnchor="middle">실제 상황</text>
          </g>
          <text className="sc_tiny" x="492" y="514">정해 주신 결과는 다음 AI 확인에 참고됩니다</text>
        </g>

        <g className="sc_panel">
          <rect x="792" y="358" width="312" height="186" rx="14" />
          <text className="sc_cap" x="816" y="394">매장 통계</text>
          <text className="sc_sub" x="816" y="416">같은 CCTV로 방문객 · 머문 시간까지</text>
          <g className="sc_chart" transform="translate(804 424)">
            <line className="axis" x1="20" y1="92" x2="280" y2="92" />
            <polyline points={pts} />
            {VISITS.map((v, i) => (
              <circle key={i} cx={24 + i * 22} cy={92 - (v / max) * 60} r="2.6" />
            ))}
          </g>
          <text className="sc_tiny" x="1088" y="394" textAnchor="end">일별 방문객</text>
        </g>
      </svg>
    </div>
  );
};

export default HomeShowcase;
