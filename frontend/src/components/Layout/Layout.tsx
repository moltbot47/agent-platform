import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#010409] text-[#e6edf3]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-[#1f6feb] focus:text-white">
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="ml-56 p-6" role="main">
        <Outlet />
      </main>
    </div>
  )
}
