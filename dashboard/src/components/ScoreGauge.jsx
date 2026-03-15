const COLORS = {
  CLEAR: '#22c55e',
  UNDER_REVIEW: '#eab308',
  SUSPICIOUS: '#f97316',
  FLAGGED: '#ef4444',
};

export default function ScoreGauge({ score, verdict }) {
  const color = COLORS[verdict] || '#22c55e';
  const r = 38;
  const circ = 2 * Math.PI * r;
  const safeScore = Math.max(0, Math.min(100, score ?? 100));
  const dash = (safeScore / 100) * circ;
  const gapDash = circ - dash;

  return (
    <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx="48" cy="48" r={r}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
          fill="none"
        />
        {/* Glow effect */}
        <circle
          cx="48" cy="48" r={r}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeOpacity="0.15"
          strokeDasharray={`${circ}`}
        />
        {/* Score arc */}
        <circle
          cx="48" cy="48" r={r}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${gapDash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }}
        />
      </svg>
      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 22, fontWeight: 800, color,
          lineHeight: 1,
          textShadow: `0 0 12px ${color}66`,
        }}>
          {safeScore}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', marginTop: 2 }}>
          SCORE
        </span>
      </div>
    </div>
  );
}
