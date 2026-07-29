import { Users, Server, Database, Eye, Activity, HardDrive } from 'lucide-react'

interface Stats {
  usersOnline: number
  totalUsers: number
  totalHosts: number
  totalReports: number
  pageviews: number
}

export function StatsSidebar({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Users Online', value: stats.usersOnline, icon: Activity, color: '#39ff14' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#00d4ff' },
    { label: 'Total Hosts', value: stats.totalHosts, icon: Server, color: '#00d4ff' },
    { label: 'Total Reports', value: stats.totalReports, icon: Database, color: '#00d4ff' },
    { label: 'Page Views', value: stats.pageviews, icon: Eye, color: '#00d4ff' },
  ]

  return (
    <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
        <HardDrive className="h-4 w-4" />
        Project Stats
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                {item.label}
              </span>
              <span className="font-semibold" style={{ color: item.color }}>
                {item.value.toLocaleString('en-US')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
