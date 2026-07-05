import {
  useGetDashboardStats, useGetSchedulerStatus, useTriggerFetch,
  useGetCategoryPieChart, useGetFaultTrend, useGetLocoChart
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, Activity, RefreshCw, Zap,
  TrendingUp, Train
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const COLORS = ["#ef4444", "#f97316", "#3b82f6", "#22c55e", "#a855f7", "#06b6d4"];

function StatCard({ title, value, subtitle, icon: Icon, colorClass = "text-primary" }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-muted/60 ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(undefined, { query: { refetchInterval: 30000 } });
  const { data: catData, isLoading: catLoading } = useGetCategoryPieChart(undefined, { query: { refetchInterval: 60000 } });
  const { data: trendData, isLoading: trendLoading } = useGetFaultTrend({ days: 30 }, { query: { refetchInterval: 60000 } });
  const { data: locoData, isLoading: locoLoading } = useGetLocoChart(undefined, { query: { refetchInterval: 60000 } });
  const { data: scheduler } = useGetSchedulerStatus({ query: { refetchInterval: 10000 } });
  const triggerFetch = useTriggerFetch();
  const { toast } = useToast();

  const handleManualFetch = async () => {
    try {
      const result = await triggerFetch.mutateAsync();
      toast({ title: "Fetch triggered", description: (result as { message?: string })?.message ?? "Data refresh started" });
    } catch {
      toast({ title: "Error", description: "Failed to trigger fetch", variant: "destructive" });
    }
  };

  const s = stats as Record<string, number> | undefined;
  const catArr = Array.isArray(catData) ? catData as Record<string, unknown>[] : [];
  const trendArr = Array.isArray(trendData) ? trendData as Record<string, unknown>[] : [];
  const locoArr = Array.isArray(locoData) ? locoData as Record<string, unknown>[] : [];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time LocoNet fault monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {scheduler && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {scheduler.lastRun ? `Last sync ${formatDistanceToNow(new Date(String(scheduler.lastRun)), { addSuffix: true })}` : "Never synced"}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleManualFetch} disabled={triggerFetch.isPending} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${triggerFetch.isPending ? "animate-spin" : ""}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard title="Total Faults" value={s?.totalFaults ?? 0} subtitle="All time records" icon={AlertTriangle} colorClass="text-amber-500" />
            <StatCard title="Active Faults" value={s?.activeFaults ?? 0} subtitle="Unresolved faults" icon={Zap} colorClass="text-red-500" />
            <StatCard title="Category A" value={s?.categoryA ?? 0} subtitle="Critical priority" icon={Train} colorClass="text-destructive" />
            <StatCard title="Recovered" value={s?.recovered ?? 0} subtitle="Resolved faults" icon={CheckCircle2} colorClass="text-green-500" />
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Unique Locos</p>
              <p className="text-2xl font-bold text-primary mt-1">{s?.uniqueLocos ?? 0}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Category B</p>
              <p className="text-2xl font-bold text-orange-500 mt-1">{s?.categoryB ?? 0}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Category C</p>
              <p className="text-2xl font-bold text-blue-500 mt-1">{s?.categoryC ?? 0}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Today's Faults</p>
              <p className="text-2xl font-bold mt-1">{s?.todayFaults ?? 0}</p>
            </CardContent></Card>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Faults by Category</CardTitle>
            <CardDescription>A / B / C breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {catLoading ? <Skeleton className="h-48 w-full" /> : catArr.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catArr} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    dataKey="count" nameKey="name"
                    label={({ name, percent }) => `${String(name)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {catArr.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fault Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Fault Trend (Last 30 Days)</CardTitle>
            <CardDescription>Daily fault count</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? <Skeleton className="h-48 w-full" /> : trendArr.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No trend data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendArr} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#areaGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Locos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Fault-Prone Locos</CardTitle>
            <CardDescription>Most faults recorded</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {locoLoading ? <Skeleton className="h-48 w-full" /> : locoArr.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={locoArr.slice(0, 8)} margin={{ top: 4, right: 4, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Bar dataKey="count" name="Faults" radius={[4, 4, 0, 0]}>
                      {locoArr.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {locoArr.slice(0, 5).map((loco: Record<string, unknown>, i: number) => {
                  const max = (locoArr[0] as Record<string, number>)?.count ?? 1;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-foreground">{String(loco.name ?? "Unknown")}</span>
                        <span className="text-muted-foreground">{Number(loco.count ?? 0)} faults</span>
                      </div>
                      <Progress value={(Number(loco.count ?? 0) / max) * 100} className="h-1.5" />
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>

        {/* Scheduler status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Scheduler & System Status</CardTitle>
            <CardDescription>Auto-fetch from LocoNet API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scheduler ? (
              <>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${scheduler.isRunning ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
                  <span className="text-sm font-medium">Scheduler</span>
                  <Badge variant={scheduler.isRunning ? "default" : "secondary"}>
                    {scheduler.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Interval</p>
                    <p className="font-medium">{scheduler.intervalMinutes} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Run</p>
                    <p className="font-medium">{scheduler.lastRun ? formatDistanceToNow(new Date(String(scheduler.lastRun)), { addSuffix: true }) : "Never"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Run</p>
                    <p className="font-medium">{scheduler.nextRun ? formatDistanceToNow(new Date(String(scheduler.nextRun)), { addSuffix: true }) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fetch Count</p>
                    <p className="font-medium">{(scheduler as Record<string, number>).fetchCount ?? 0}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Category A faults auto-alert WhatsApp group</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Manual send available per fault in Fault Data tab</span>
                  </div>
                </div>
              </>
            ) : <Skeleton className="h-32 w-full" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
