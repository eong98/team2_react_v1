import { useEffect, useRef, useState } from 'react';

/**
 * IntersectionObserver로 요소가 뷰포트에 들어오면 true를 반환합니다.
 * 원본 index-v2.html의 `.reveal` / `.reveal.in` 스크롤 등장 애니메이션과 동일한 동작입니다.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, className: `reveal${visible ? ' in' : ''}` };
}
