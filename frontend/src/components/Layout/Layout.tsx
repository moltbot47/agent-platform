import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#1D1F27] text-[#EEEEEE]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-[#1D4AFF] focus:text-white">
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="ml-[240px] p-8" role="main">
        <Outlet />
      </main>
    </div>
  )
}
