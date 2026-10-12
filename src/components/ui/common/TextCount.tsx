import { getByteLength } from '../../../utils/Tool';

/* ---------------------------------------------------------------------
   입력 글자 수 표시 — 입력 칸 바로 아래 오른쪽에 붙입니다. (스타일: styles/common.css .text_count)

   - maxBytes를 넘기면 "45 / 200 byte" (DB 컬럼이 VARCHAR2(200)처럼 바이트 기준일 때 — 한글은 3byte)
     90%를 넘으면 경고색, 꽉 차면 위험색
   - 넘기지 않으면 "1,234자" (CLOB처럼 길이 제한이 없는 본문)

   사용 예:
     <input name="title" value={input.title} onChange={onChange} />
     <TextCount value={input.title} maxBytes={200} />
--------------------------------------------------------------------- */

interface TextCountProps {
  value?: string | null;
  /** 최대 바이트 (없으면 글자 수만 표시) */
  maxBytes?: number;
}

export default function TextCount({ value, maxBytes }: TextCountProps) {
  const text = value ?? '';

  if (!maxBytes) {
    return <div className="text_count">{text.length.toLocaleString()}자</div>;
  }

  const bytes = getByteLength(text);
  const state = bytes >= maxBytes ? ' is_full' : bytes >= maxBytes * 0.9 ? ' is_near' : '';

  return (
    <div className={`text_count${state}`}>
      <span className="text_count_now">{bytes.toLocaleString()}</span> / {maxBytes.toLocaleString()} byte
    </div>
  );
}
