interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function StatCard({ label, value, subtext, trend }: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'text-[#77B96C]' : trend === 'down' ? 'text-[#F54E00]' : 'text-[#9B9EA3]'

  return (
    <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 hover:border-[#3C3E48] transition-colors">
      <p className="text-[11px] text-[#9B9EA3] uppercase tracking-wider font-medium">{label}</p>
      <p className="text-2xl font-bold text-[#EEEEEE] mt-1.5">{value}</p>
      {subtext && <p className={`text-xs mt-1.5 ${trendColor}`}>{subtext}</p>}
    </div>
  )
}
