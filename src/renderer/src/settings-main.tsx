import React from 'react'
import ReactDOM from 'react-dom/client'
import { SettingsApp } from './settings/SettingsApp'
import '@fontsource/press-start-2p'
import './settings/settings.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
)
