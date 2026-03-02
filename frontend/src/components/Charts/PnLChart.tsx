import { useId } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { PnLPoint } from '../../api/charts'

interface Props {
  data: PnLPoint[]
}

export default function PnLChart({ data }: Props) {
  const gradientId = `pnlGradient-${useId()}`
  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-[#6B6F76] py-8">
        No PnL data available
      </div>
    )
  }

  const finalPnL = data[data.length - 1]?.cumulative_pnl ?? 0
  const isPositive = finalPnL >= 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider">
          Cumulative PnL
        </h3>
        <span className={`text-sm font-mono ${isPositive ? 'text-[#77B96C]' : 'text-[#F54E00]'}`}>
          ${finalPnL.toFixed(2)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#77B96C' : '#F54E00'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#77B96C' : '#F54E00'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2C2E38" />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: '#9B9EA3', fontSize: 10 }}
            stroke="#2C2E38"
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <YAxis
            tick={{ fill: '#9B9EA3', fontSize: 11 }}
            stroke="#2C2E38"
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{ background: '#22242C', border: '1px solid #2C2E38', borderRadius: 8, fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={((v: any) => new Date(String(v)).toLocaleString()) as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any, name: any) => {
              const v = Number(value ?? 0)
              if (name === 'cumulative_pnl') return [`$${v.toFixed(2)}`, 'Cumulative PnL']
              return [`$${v.toFixed(2)}`, 'Trade PnL']
            }) as any}
          />
          <ReferenceLine y={0} stroke="#6B6F76" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="cumulative_pnl"
            stroke={isPositive ? '#77B96C' : '#F54E00'}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
