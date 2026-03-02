import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import AgentRegistry from './pages/AgentRegistry'
import AgentDetail from './pages/AgentDetail'
import EventExplorer from './pages/EventExplorer'
import Marketplace from './pages/Marketplace'
import Register from './pages/Register'
import Settings from './pages/Settings'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/agents', element: <AgentRegistry /> },
      { path: '/agents/:id', element: <AgentDetail /> },
      { path: '/events', element: <EventExplorer /> },
      { path: '/marketplace', element: <Marketplace /> },
      { path: '/register', element: <Register /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
