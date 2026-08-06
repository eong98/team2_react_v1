/* --------------- css import --------------- */
import '../style/normalize.css'
import '../style/common.css'
import '../style/contents.css'
import '../style/dbms.css'
/* ------------------------------------------- */

import { useState } from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import { getCopyright } from '../Tool'; // Tool.ts


import Home from '../Home';
import DbmsLayout from '../dbms/DbmsLayout'
import Landing from '../landing/Landing'


function AppDbms() {

  return (
    <BrowserRouter>
      <div id='allimio'>
        {/* 2조 React Frontend project */}
        <Routes>
          {/* <Route path='/' element={<Home />} /> */}
          
          <Route path="/dbms/*" element={<DbmsLayout />} />
        </Routes>

        {/* <div className='copyright'>{getCopyright()}</div>       */}
      </div>
    </BrowserRouter>


  )
}

export default AppDbms