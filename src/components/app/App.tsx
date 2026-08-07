/* --------------- css import --------------- */
import '../style/normalize.css'
import '../style/common.css'
import '../style/contents.css'
/* ------------------------------------------- */

import { useState } from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import { getCopyright } from '../Tool'; // Tool.ts

/* 메인페이지 import */
import MainLayout from '../main/MainLayout'
import Home from '../Home';
import Login from '../Login'
/* // 메인페이지 import */

import UserLayout from '../user/UserLayout'
import DbmsLayout from '../dbms/DbmsLayout'


function App() {
  {/* 2조 React Frontend project */}

  return (
    <BrowserRouter>
      <div id='allimio'>
        <Routes>
          <Route element={<MainLayout />}>
            {/* 메인페이지 */}
            <Route path='/' element={<Home />} />
            <Route path='/login' element={<Login />} />
          </Route>
          
          <Route path="/user/*" element={<UserLayout />} />
          <Route path="/dbms/*" element={<DbmsLayout />} />
        </Routes>
      </div>
    </BrowserRouter>


  )
}

export default App