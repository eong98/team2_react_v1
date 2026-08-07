/* --------------- css import --------------- */
import '../style/main.css'
/* ------------------------------------------- */

import Footer from "./Footer"
import Header from "./Header"
import { Outlet } from 'react-router-dom'

const MainLayout = () => {
  return (
    <div className='main'>
      <Header />

      <Outlet />

      <Footer />
    </div>
  )
}

export default MainLayout
