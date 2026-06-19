import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function StrengthProgressChart({ data, isDark }) {
  const bgColor = isDark ? '#111827' : '#f9fafb';
  const textColor = isDark ? '#d1d5db' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data yet. Complete workouts to see progress.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
        <XAxis dataKey="date" stroke={textColor} fontSize={12} />
        <YAxis stroke={textColor} fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: bgColor,
            border: `1px solid ${gridColor}`,
            borderRadius: '8px',
            color: textColor,
          }}
          formatter={(value) => value.toFixed(1)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ fill: '#60a5fa', r: 4 }}
          activeDot={{ r: 6 }}
          fill="url(#colorWeight)"
          name="Weight (kg)"
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ConsistencyChart({ data, isDark }) {
  const bgColor = isDark ? '#111827' : '#f9fafb';
  const textColor = isDark ? '#d1d5db' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No consistency data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
        <XAxis dataKey="week" stroke={textColor} fontSize={12} />
        <YAxis stroke={textColor} fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: bgColor,
            border: `1px solid ${gridColor}`,
            borderRadius: '8px',
            color: textColor,
          }}
        />
        <Legend />
        <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[8, 8, 0, 0]} />
        <Bar dataKey="planned" fill="#f59e0b" name="Planned" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}