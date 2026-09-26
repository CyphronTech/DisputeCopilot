function level(confidence: number): 'high' | 'med' | 'low' {
  if (confidence >= 0.75) return 'high'
  if (confidence >= 0.5) return 'med'
  return 'low'
}

export function Confidence({ value, showLabel }: { value: number; showLabel?: boolean }) {
  const filled = Math.max(1, Math.round(value * 5))
  const lvl = level(value)
  return (
    <span className={`confidence ${lvl}`}>
      <span className="bars">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={i < filled ? 'on' : ''} />
        ))}
      </span>
      {showLabel && <span className="label">{lvl === 'high' ? 'High' : lvl === 'med' ? 'Medium' : 'Low'}</span>}
    </span>
  )
}
