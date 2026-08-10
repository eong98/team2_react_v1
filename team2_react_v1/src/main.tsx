import { createRoot } from 'react-dom/client'
import './styles/normalize.css' /* 브라우저 스타일 초기화 */
import './index.css' /* 커스텀 전역 스타일 */

import App from './routes/App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />
)
