import { StrictMode } from 'react'
import { createRoot } from 'react-source/react-dom/client.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)