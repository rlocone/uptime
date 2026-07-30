type TeamHealthCounts = {
  totalHosts: number
  upCount: number
  degradedCount: number
  downCount: number
}

function segmentWidth(value: number, total: number) {
  if (!total) return '0%'
  return `${(value / total) * 100}%`
}

export function TeamHealthBar({ counts, compact = false }: { counts: TeamHealthCounts; compact?: boolean }) {
  const total = Math.max(0, counts.totalHosts)
  const up = Math.max(0, counts.upCount)
  const degraded = Math.max(0, counts.degradedCount)
  const down = Math.max(0, counts.downCount)

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>Health mix</span>
        <span>{up + degraded + down}/{total || 0} hosts</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/40 flex">
        <div style={{ width: segmentWidth(up, total) }} className="bg-[#39ff14]" />
        <div style={{ width: segmentWidth(degraded, total) }} className="bg-amber-400" />
        <div style={{ width: segmentWidth(down, total) }} className="bg-red-400" />
      </div>
      <div className={compact ? 'grid grid-cols-3 gap-2 text-[10px]' : 'grid grid-cols-3 gap-3 text-xs'}>
        <LegendDot label="Up" value={up} colorClass="bg-[#39ff14]" />
        <LegendDot label="Degraded" value={degraded} colorClass="bg-amber-400" />
        <LegendDot label="Down" value={down} colorClass="bg-red-400" />
      </div>
    </div>
  )
}

function LegendDot({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <span className="truncate">
        {label} {value}
      </span>
    </div>
  )
}
