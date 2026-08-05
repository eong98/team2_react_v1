/* --------------- css import --------------- */
import '../style/normalize.css'
import '../style/common.css'
import '../style/contents.css'
/* ------------------------------------------- */

import { useState } from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import { getCopyright } from '../Tool'; // Tool.ts


import Home from '../Home';
import DashboardLayout from '../user/dashboard/DashboardLayout'
import MemberLayout from '../user/member/MemberLayout'
import StoreLayout from '../user/store/StoreLayout'
import NotifyLayout from '../user/notify/NotifyLayout'
import BoardLayout from '../user/board/BoardLayout'
import Landing from '../landing/Landing'


function App() {

  return (
    <BrowserRouter>
      <div id='allimio'>
        {/* 2조 React Frontend project */}
        <Routes>
          {/* <Route path='/' element={<Home />} /> */}
          
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard/*" element={<DashboardLayout />} />
          <Route path="/member/*" element={<MemberLayout />} />
          <Route path="/store/*" element={<StoreLayout />} />
          <Route path="/notify/*" element={<NotifyLayout />} />
          <Route path="/board/*" element={<BoardLayout />} />
        </Routes>

        {/* <div className='copyright'>{getCopyright()}</div>       */}
      </div>
    </BrowserRouter>


  )
}

export default App