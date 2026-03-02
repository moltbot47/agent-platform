import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#010409] text-[#e6edf3]">
      <Sidebar />
      <main className="ml-56 p-6">
        <Outlet />
      </main>
    </div>
  )
}
