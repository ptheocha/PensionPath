import React from 'react'
import ReactDOM from 'react-dom/client'
import PensionPath from './App.jsx'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PensionPath />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
)
