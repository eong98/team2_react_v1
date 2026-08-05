import { useState } from 'react';
import Modal from '../../../ui/Modal';

const DEVICES = [
  { name: 'ESP-AUD-01', cam: '본점 · CAM 03', mac: 'A4:CF:12:0A:1B:2C', battery: '87%', status: '온라인', tone: 'badge_success', topic: 'allimio/audio/01' },
  { name: 'ESP-AUD-02', cam: '본점 · CAM 05', mac: 'A4:CF:12:0A:1B:2D', battery: '12%', status: '배터리 부족', tone: 'badge_warning', topic: 'allimio/audio/02' },
  { name: 'ESP-AUD-05', cam: '3호점 · CAM 02', mac: 'A4:CF:12:0A:1B:30', battery: '-', status: '오프라인', tone: 'badge_neutral', topic: 'allimio/audio/05' },
];

export default function AudioView() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="view active">
      <div className="view_head">
        <div>
          <h1>오디오 센서(ESP32) 관리</h1>
          <p>CCTV와 별도로 소음·이상음을 감지하는 오디오 기기를 등록·관리합니다. (device_name·mac_addr·battery·mqtt_topic·status)</p>
        </div>
        <button className="btn btn_md btn_primary" onClick={() => setModalOpen(true)}>
          + 기기 등록
        </button>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>기기명</th>
              <th>소속 CCTV</th>
              <th>MAC 주소</th>
              <th>배터리</th>
              <th>상태</th>
              <th>MQTT 토픽</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {DEVICES.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{d.cam}</td>
                <td className="mono">{d.mac}</td>
                <td className="mono">{d.battery}</td>
                <td>
                  <span className={`badge ${d.tone}`}>{d.status}</span>
                </td>
                <td className="mono">{d.topic}</td>
                <td className="actions">
                  <button className="btn btn_sm btn_ghost" onClick={() => setModalOpen(true)}>
                    수정
                  </button>
                  <button className="btn btn_sm btn_danger_outline">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titleId="audioModalTitle"
        title="오디오 센서 등록"
        footer={
          <>
            <button className="btn btn_md btn_ghost" onClick={() => setModalOpen(false)}>
              취소
            </button>
            <button className="btn btn_md btn_primary" onClick={() => setModalOpen(false)}>
              저장
            </button>
          </>
        }
      >
        <div className="form_group">
          <label className="form_label" htmlFor="store-cctv-fld-16">
            기기명(device_name)<span className="req">*</span>
          </label>
          <input id="store-cctv-fld-16" className="form_input" placeholder="예: ESP-AUD-06" />
        </div>
        <div className="grid_2">
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-17">
              소속 CCTV<span className="req">*</span>
            </label>
            <select id="store-cctv-fld-17" className="form_select">
              <option>본점 · CAM 03</option>
              <option>본점 · CAM 05</option>
              <option>2호점 · CAM 01</option>
            </select>
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-18">
              MAC 주소<span className="req">*</span>
            </label>
            <input id="store-cctv-fld-18" className="form_input mono" placeholder="A4:CF:12:00:00:00" />
          </div>
        </div>
        <div className="grid_2">
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-19">
              MQTT 토픽
            </label>
            <input id="store-cctv-fld-19" className="form_input mono" placeholder="allimio/audio/06" />
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-20">
              감지 임계값(threshold, dB)
            </label>
            <input id="store-cctv-fld-20" className="form_input mono" placeholder="60" />
          </div>
        </div>
      </Modal>
    </section>
  );
}
