import { useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, CheckCircle2, XCircle, AlertTriangle, Send, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/api";

export default function Alerts() {
  const { data, isLoading, refetch } = useListAlerts({ page: 1, pageSize: 50 }, { query: { refetchInterval: 30000 } });
  const { toast } = useToast();

  const handleTest = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/alerts/test", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const result = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(result.error ?? "Failed to send test alert");
      toast({ title: "Test alert sent", description: result.message ?? "WhatsApp alert dispatched" });
      setTimeout(() => refetch(), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send test alert";
      toast({ title: "Alert failed", description: msg, variant: "destructive" });
    }
  };

  const alertData = data as Record<string, unknown> | undefined;
  const alerts = Array.isArray(alertData?.data) ? alertData.data as Record<string, unknown>[] : [];
  const stats = {
    total: Number(alertData?.total ?? 0),
    sent: alerts.filter((a) => a.status === "sent").length,
    failed: alerts.filter((a) => a.status === "failed").length,
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Alerts</h1>
          <p className="text-muted-foreground text-sm">Category A fault notifications via WhatsApp Cloud API</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={handleTest} className="gap-2">
            <Send className="w-3.5 h-3.5" /> Send Test Alert
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-green-500">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><XCircle className="w-4 h-4 text-red-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-500">WhatsApp Configuration Required</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Configure your WhatsApp Cloud API credentials in Settings → WhatsApp section. Alerts fire automatically for Category A faults. Use "Send Test Alert" to verify connectivity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alert Log</CardTitle>
          <CardDescription>History of WhatsApp notifications sent</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Fault ID</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Message Preview</TableHead>
                <TableHead className="text-xs">Response</TableHead>
                <TableHead className="text-xs">Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No alerts sent yet</p>
                    <p className="text-xs mt-1">Category A faults trigger automatic alerts</p>
                  </TableCell>
                </TableRow>
              ) : alerts.map((alert) => (
                <TableRow key={String(alert.id)} className="text-xs">
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {alert.status === "sent"
                        ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Sent</span></>
                        : <><XCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">Failed</span></>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{String(alert.faultId ?? "—")}</TableCell>
                  <TableCell className="font-mono">{String(alert.recipientPhone ?? "—")}</TableCell>
                  <TableCell className="max-w-64 truncate" title={String(alert.messageContent ?? "")}>{String(alert.messageContent ?? "—")}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">{String(alert.apiResponse ?? "—")}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {alert.createdAt ? format(new Date(String(alert.createdAt)), "dd/MM/yy HH:mm") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
