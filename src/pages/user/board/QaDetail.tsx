import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { QA_STATUS_MAP, QA_TYPE_MAP, type QaTypes } from '../../user/board/QaType';

export default function QaDetail() {
  const { no } = useParams<{ no: string }>();
  const navigate = useNavigate();

  const [qa, setQa] = useState<QaTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!no) return;
    setLoading(true);
    setError(null);

    axiosInstance
      .get(`/qa/${no}`)
      .then((res) => setQa(res.data))
      .catch((err) => {
        console.error('문의 상세 조회 실패:', err);
        setError('문의 내용을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [no]);

  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="문의 상세" description="내용을 불러오는 중입니다." />
      </section>
    );
  }

  if (error || !qa) {
    return (
      <section className="view active">
        <PageHeader title="문의 상세" description={error ?? '해당 문의를 찾을 수 없습니다.'} />
        <Link to="../qa" className="btn btn_ghost">
          목록으로
        </Link>
      </section>
    );
  }

  const type = QA_TYPE_MAP[qa.type] ?? { label: '기타', className: 'badge_neutral' };
  const status = QA_STATUS_MAP[qa.status] ?? { label: '답변대기', className: 'badge_warning' };
  const answered = qa.status === 2 && !!qa.answer;

  return (
    <section className="view active">
      <PageHeader title="문의 상세" description="내가 등록한 문의와 답변 내용을 확인할 수 있습니다." />

      <div className="card card_pad_lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className={`badge ${type.className}`}>{type.label}</span>
          <span className={`badge ${status.className}`}>{status.label}</span>
          {qa.vmode === 'Y' && <span className="badge badge_neutral">🔒 비밀글</span>}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{qa.title}</h2>
        <div className="cell_sub" style={{ marginBottom: 20 }}>
          No.{qa.no} · {qa.cdate}
        </div>

        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
          {qa.content}
        </p>
      </div>

      <div className="card card_pad_lg" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>답변</h3>
        {answered ? (
          <>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
              {qa.answer}
            </p>
            {qa.adate && (
              <div className="cell_sub" style={{ marginTop: 12 }}>
                답변일 · {qa.adate}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>아직 답변이 등록되지 않았습니다.</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Link to="../qa" className="btn btn_ghost">
          목록으로
        </Link>
        {!answered && (
          <button type="button" className="btn btn_primary" onClick={() => navigate(`../qa/${qa.no}/edit`)}>
            문의 수정
          </button>
        )}
      </div>
    </section>
  );
}