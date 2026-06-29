import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initCapacitor } from './lib/capacitor'

// 在原生壳中初始化状态栏/启动屏/键盘；Web 端无副作用
initCapacitor().catch(() => { /* 忽略 */ })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
