import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { OutcomeByType } from '../../api/charts'

interface Props {
  data: OutcomeByType[]
}

export default function OutcomeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-[#484f58] py-8">
        No outcome data available
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-[#7d8590] uppercase tracking-wide mb-3">
        Outcomes by Type
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
          <XAxis
            dataKey="event_type"
            tick={{ fill: '#7d8590', fontSize: 10 }}
            stroke="#21262d"
          />
          <YAxis tick={{ fill: '#7d8590', fontSize: 11 }} stroke="#21262d" />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, fontSize: 12 }}
            cursor={{ fill: '#161b22' }}
          />
          <Bar dataKey="wins" stackId="a" fill="#3fb950" name="Wins" />
          <Bar dataKey="losses" stackId="a" fill="#f85149" name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
