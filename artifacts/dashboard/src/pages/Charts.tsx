import {
  useGetCategoryPieChart, useGetLocoChart, useGetModuleChart, useGetFaultTrend,
  useGetLocationChart, useGetFaultCodeChart, useGetRecoveryTrend
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { BarChart3, PieChart as PieIcon, TrendingUp, Activity, Radar as RadarIcon, MapPin, Tag } from "lucide-react";

const COLORS = ["#ef4444", "#f97316", "#3b82f6", "#22c55e", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: Record<string, number> & { name: string }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>{`${(percent * 100).toFixed(0)}%`}</text>;
};

function ChartCard({ title, description, icon: Icon, children, isLoading }: {
  title: string; description?: string; icon?: React.ElementType;
  children: React.ReactNode; isLoading?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? <Skeleton className="h-56 w-full" /> : children}
      </CardContent>
    </Card>
  );
}

const ttStyle = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" },
  labelStyle: { color: "hsl(var(--foreground))" }
};

export default function Charts() {
  const { data: catData, isLoading: catLoading } = useGetCategoryPieChart(undefined, { query: { refetchInterval: 60000 } });
  const { data: locoData, isLoading: locoLoading } = useGetLocoChart(undefined, { query: { refetchInterval: 60000 } });
  const { data: moduleData, isLoading: moduleLoading } = useGetModuleChart(undefined, { query: { refetchInterval: 60000 } });
  const { data: trendData, isLoading: trendLoading } = useGetFaultTrend({ days: 30 }, { query: { refetchInterval: 60000 } });
  const { data: locationData, isLoading: locationLoading } = useGetLocationChart(undefined, { query: { refetchInterval: 60000 } });
  const { data: faultCodeData, isLoading: faultCodeLoading } = useGetFaultCodeChart(undefined, { query: { refetchInterval: 60000 } });
  const { data: recoveryData, isLoading: recoveryLoading } = useGetRecoveryTrend({ days: 30 }, { query: { refetchInterval: 60000 } });

  const catArr = Array.isArray(catData) ? catData as Record<string, unknown>[] : [];
  const locoArr = Array.isArray(locoData) ? locoData as Record<string, unknown>[] : [];
  const moduleArr = Array.isArray(moduleData) ? moduleData as Record<string, unknown>[] : [];
  const trendArr = Array.isArray(trendData) ? trendData as Record<string, unknown>[] : [];
  const locationArr = Array.isArray(locationData) ? locationData as Record<string, unknown>[] : [];
  const faultCodeArr = Array.isArray(faultCodeData) ? faultCodeData as Record<string, unknown>[] : [];
  const recoveryArr = Array.isArray(recoveryData) ? recoveryData as Record<string, unknown>[] : [];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">7 chart types • Real-time fault analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Pie - Category */}
        <ChartCard title="Fault Category Distribution" description="Pie chart — A / B / C breakdown" icon={PieIcon} isLoading={catLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={catArr} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="name" labelLine={false} label={renderCustomLabel}>
                {catArr.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...ttStyle} />
              <Legend formatter={(val) => <span style={{ fontSize: 12 }}>{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Donut - Location */}
        <ChartCard title="Faults by Location" description="Donut chart — location breakdown" icon={MapPin} isLoading={locationLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={locationArr} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="count" nameKey="name"
                label={({ name, percent }) => percent > 0.05 ? `${String(name).slice(0, 10)} ${(percent * 100).toFixed(0)}%` : ""} labelLine={false}>
                {locationArr.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...ttStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Horizontal Bar - Module */}
        <ChartCard title="Faults by Module" description="Horizontal bar — fault-prone modules" icon={Activity} isLoading={moduleLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={moduleArr.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip {...ttStyle} />
              <Bar dataKey="count" name="Faults" radius={[0, 4, 4, 0]}>
                {moduleArr.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Bar - Fault Codes */}
        <ChartCard title="Top Fault Codes" description="Bar chart — most common fault codes" icon={Tag} isLoading={faultCodeLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={faultCodeArr.slice(0, 8)} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip {...ttStyle} />
              <Bar dataKey="count" name="Occurrences" radius={[4, 4, 0, 0]}>
                {faultCodeArr.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Area - Trend */}
        <ChartCard title="30-Day Fault Trend" description="Area chart — daily fault counts" icon={TrendingUp} isLoading={trendLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendArr} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip {...ttStyle} />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#trendGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Line - Recovery Trend */}
        <ChartCard title="Recovery Trend" description="Line chart — new vs recovered faults" icon={TrendingUp} isLoading={recoveryLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={recoveryArr} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip {...ttStyle} />
              <Legend formatter={(val) => <span style={{ fontSize: 11 }}>{val}</span>} />
              <Line type="monotone" dataKey="active" stroke="#ef4444" strokeWidth={2} dot={false} name="Active" />
              <Line type="monotone" dataKey="recovered" stroke="#22c55e" strokeWidth={2} dot={false} name="Recovered" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 7. Radar - Top Locos */}
        <ChartCard title="Top Locos by Fault Count" description="Radar chart — fault distribution" icon={RadarIcon} isLoading={locoLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={locoArr.slice(0, 8)} cx="50%" cy="50%" outerRadius={85}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
              <Radar name="Faults" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              <Tooltip {...ttStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 8. Stacked Bar - Locos */}
        <ChartCard title="Top 10 Fault-Prone Locos" description="Bar chart — locomotives by fault count" icon={BarChart3} isLoading={locoLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={locoArr.slice(0, 10)} margin={{ top: 4, right: 4, left: -20, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip {...ttStyle} />
              <Bar dataKey="count" name="Faults" radius={[4, 4, 0, 0]}>
                {locoArr.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
