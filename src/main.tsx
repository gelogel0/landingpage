import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Checklist from './Checklist.tsx'
import Privacy from './Privacy.tsx'
import Offer from './Offer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/offer" element={<Offer />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
