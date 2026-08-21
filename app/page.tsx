import DashboardPage from './dashboard/page'

export const dynamic = 'force-dynamic'

function page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <DashboardPage />
    </div>
  )
}

export default page
