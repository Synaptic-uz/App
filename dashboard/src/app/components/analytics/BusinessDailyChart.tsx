import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
} from 'recharts';

const CHART_LINE = '#0026e6';
const CHART_FILL_ID = 'chartFillBlue';

type DailyPoint = { day: string; clicks: number; impressions: number };

export default function BusinessDailyChart({ data }: { data: DailyPoint[] }) {
  const tooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(17,17,17,0.12)',
    borderRadius: '12px',
    boxShadow: '0 8px 28px rgba(17,17,17,0.08)',
  };

  return (
    <div className="h-72 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id={CHART_FILL_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e8ebf2" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#e8ebf2" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
          <XAxis dataKey="day" stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="impressions"
            stroke={CHART_LINE}
            strokeWidth={2}
            fill={`url(#${CHART_FILL_ID})`}
            name="Ko‘rinishlar"
          />
          <Bar dataKey="clicks" fill="#001cff" name="Bosishlar" radius={[4, 4, 0, 0]} barSize={20} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
