import Link from 'next/link'
import { auth } from '@/auth'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { Button } from '@/components/ui/button'
import { givenName } from '@/lib/names'

export default async function DashboardPage() {
  const session   = await auth()
  const firstName = givenName(session?.user?.name) ?? 'there'
  const role      = session?.user?.role ?? '—'

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's an overview of your research activity and quick ways to get started."
        actions={
          <Button asChild className="btn-glow gap-2 rounded-xl shadow-md">
            <Link href="/projects">
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
        }
      />
      <DashboardStats role={role} />
    </PageContainer>
  )
}