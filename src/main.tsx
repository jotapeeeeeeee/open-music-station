import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .catch(error => {
      window.dispatchEvent(new CustomEvent('pwa-registration-error', { detail: error }))
    })
}
