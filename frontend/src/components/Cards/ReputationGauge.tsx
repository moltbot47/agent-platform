interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export default function ReputationGauge({ score, size = 'md' }: Props) {
  const sizes = {
    sm: { outer: 48, stroke: 4, text: 'text-xs' },
    md: { outer: 72, stroke: 5, text: 'text-lg' },
    lg: { outer: 96, stroke: 6, text: 'text-2xl' },
  }

  const { outer, stroke, text } = sizes[size]
  const radius = (outer - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  // Color based on score
  let color = '#f85149' // red
  if (score >= 70) color = '#3fb950' // green
  else if (score >= 50) color = '#d29922' // yellow
  else if (score >= 30) color = '#f0883e' // orange

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: outer, height: outer }}>
      <svg width={outer} height={outer} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke="#21262d"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className={`absolute font-mono font-bold ${text}`} style={{ color }}>
        {score}
      </span>
    </div>
  )
}
