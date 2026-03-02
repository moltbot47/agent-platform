import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { OutcomeByType } from '../../api/charts'

interface Props {
  data: OutcomeByType[]
}

export default function OutcomeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-[#6B6F76] py-8">
        No outcome data available
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider mb-3">
        Outcomes by Type
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2C2E38" />
          <XAxis
            dataKey="event_type"
            tick={{ fill: '#9B9EA3', fontSize: 10 }}
            stroke="#2C2E38"
          />
          <YAxis tick={{ fill: '#9B9EA3', fontSize: 11 }} stroke="#2C2E38" />
          <Tooltip
            contentStyle={{ background: '#22242C', border: '1px solid #2C2E38', borderRadius: 8, fontSize: 12 }}
            cursor={{ fill: '#2C2E38' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9B9EA3' }} />
          <Bar dataKey="wins" stackId="a" fill="#77B96C" name="Wins" radius={[3, 3, 0, 0]} />
          <Bar dataKey="losses" stackId="a" fill="#F54E00" name="Losses" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
