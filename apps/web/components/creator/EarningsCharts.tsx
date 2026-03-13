'use client';

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNaira } from '@foleio/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StreamRow = {
  type: string;
  amount: number;
  label: string;
  percent: number;
  color: string;
};

export function EarningsCharts({
  monthlyEarnings,
  streamRows,
}: {
  monthlyEarnings: Array<{ month: string; amount: number }>;
  streamRows: StreamRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Last 6 months earnings</CardTitle>
        </CardHeader>
        <CardContent className="h-72 rounded-xl bg-[#FFF8EE] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyEarnings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#F97316" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={streamRows} dataKey="amount" nameKey="label" outerRadius={76}>
                  {streamRows.map((item) => (
                    <Cell key={item.type} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {streamRows.map((row) => (
            <div key={row.type} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                <span>{row.label}</span>
              </div>
              <span className="text-muted-foreground">
                {formatNaira(row.amount / 100)} ({row.percent}%)
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
