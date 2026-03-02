import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'

export default function ErrorBoundary() {
  const error = useRouteError()

  let title = 'Something went wrong'
  let message = 'An unexpected error occurred.'

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    message = error.data?.message || 'The page you requested could not be found.'
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="min-h-screen bg-[#010409] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#e6edf3] mb-2">{title}</h1>
        <p className="text-sm text-[#7d8590] mb-6">{message}</p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-[#1f6feb] text-white text-sm rounded hover:bg-[#388bfd] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
