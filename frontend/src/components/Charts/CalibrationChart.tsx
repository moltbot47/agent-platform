import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { CalibrationBucket } from '../../api/charts'

interface Props {
  data: CalibrationBucket[]
  brierScore: number | null
}

export default function CalibrationChart({ data, brierScore }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-[#484f58] py-8">
        No calibration data available
      </div>
    )
  }

  const chartData = data.map((b) => ({
    predicted: b.predicted_confidence,
    actual: b.actual_win_rate,
    count: b.count,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#7d8590] uppercase tracking-wide">
          Confidence Calibration
        </h3>
        {brierScore != null && (
          <span className="text-xs font-mono text-[#484f58]">
            Brier: {brierScore.toFixed(4)}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
          <XAxis
            dataKey="predicted"
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: '#7d8590', fontSize: 11 }}
            stroke="#21262d"
            label={{ value: 'Predicted', position: 'bottom', fill: '#484f58', fontSize: 11 }}
          />
          <YAxis
            dataKey="actual"
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: '#7d8590', fontSize: 11 }}
            stroke="#21262d"
            label={{ value: 'Actual', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: '#e6edf3' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any, name: any) => {
              const v = Number(value ?? 0)
              if (name === 'actual') return [`${(v * 100).toFixed(1)}%`, 'Actual Win Rate']
              return [`${(v * 100).toFixed(1)}%`, 'Predicted Confidence']
            }) as any}
          />
          {/* Perfect calibration line */}
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
            stroke="#484f58"
            strokeDasharray="5 5"
          />
          <Scatter
            name="Calibration"
            data={chartData}
            fill="#1f6feb"
            r={6}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
