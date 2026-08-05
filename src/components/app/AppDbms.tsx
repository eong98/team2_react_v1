/* --------------- css import --------------- */
import '../style/normalize.css'
import '../style/common.css'
import '../style/contents.css'
/* ------------------------------------------- */

import { useState } from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import { getCopyright } from '../Tool'; // Tool.ts


import Home from '../Home';
import DashboardLayout from '../dbms/dashboard/DashboardLayout'
import MemberLayout from '../dbms/member/MemberLayout'
import StoreLayout from '../dbms/store/StoreLayout'
import NotifyLayout from '../dbms/notify/NotifyLayout'
import BoardLayout from '../dbms/board/BoardLayout'
import Landing from '../landing/Landing'


function App() {

  return (
    <BrowserRouter>
      <div id='allimio'>
        {/* 2조 React Frontend project */}
        <Routes>
          {/* <Route path='/' element={<Home />} /> */}
          
          <Route path="/" element={<Landing />} />
          <Route path="/dbms/dashboard/*" element={<DashboardLayout />} />
          <Route path="/dbms/member/*" element={<MemberLayout />} />
          <Route path="/dbms/store/*" element={<StoreLayout />} />
          <Route path="/dbms/notify/*" element={<NotifyLayout />} />
          <Route path="/dbms/board/*" element={<BoardLayout />} />
        </Routes>

        {/* <div className='copyright'>{getCopyright()}</div>       */}
      </div>
    </BrowserRouter>


  )
}

export default App