interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function StatCard({ label, value, subtext, trend }: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'text-[#3fb950]' : trend === 'down' ? 'text-[#f85149]' : 'text-[#7d8590]'

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
      <p className="text-[11px] text-[#7d8590] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[#e6edf3] mt-1">{value}</p>
      {subtext && <p className={`text-xs mt-1 ${trendColor}`}>{subtext}</p>}
    </div>
  )
}
