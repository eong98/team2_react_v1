import { useState } from 'react'
import './App.css'
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import { getCopyright } from '../Tool'; // Tool.ts

function App() {

  return (
    <BrowserRouter>
      <div style={{width: '100%'}}>
        2조 React Frontend project
        <Routes>
          {/* <Route path='/' element={} /> */}
        </Routes>

        <div className='copyright'>{getCopyright()}</div>      
      </div>
    </BrowserRouter>


  )
}

export default App