import React from 'react';

interface MicroSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  min?: number;
  max?: number;
}

export const MicroSparkline: React.FC<MicroSparklineProps> = ({
  data,
  color = '#38bdf8',
  width = 64,
  height = 20,
  min: customMin,
  max: customMax,
}) => {
  if (!data || data.length < 2) {
    return <span className="text-slate-600 font-mono text-[10px]">—</span>;
  }

  const min = customMin !== undefined ? customMin : Math.min(...data);
  const max = customMax !== undefined ? customMax : Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;

  // Generate SVG path coordinates
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible inline-block align-middle">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sparkGrad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Latest point dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].split(',')[0]}
          cy={points[points.length - 1].split(',')[1]}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
};
