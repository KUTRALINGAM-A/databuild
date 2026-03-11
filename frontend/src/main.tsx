import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Newform } from '@/pages/Newform'
import { SupplyRelationships } from '@/pages/Supply_Relationships'
import { Products } from '@/pages/Products'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/newform" element={<Newform />} />
        <Route path="/supply-relationships" element={<SupplyRelationships />} />
        <Route path="/products" element={<Products />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
