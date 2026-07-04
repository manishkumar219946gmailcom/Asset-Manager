import { useState } from "react";
import { useListApiLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Search, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 25;

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/15 text-blue-500",
  POST: "bg-green-500/15 text-green-500",
  PUT: "bg-amber-500/15 text-amber-500",
  PATCH: "bg-orange-500/15 text-orange-500",
  DELETE: "bg-red-500/15 text-red-500",
};

export default function Audit() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useListApiLogs({ page, pageSize: PAGE_SIZE }, { query: { refetchInterval: 30000 } });

  const logData = data as Record<string, unknown> | undefined;
  const allLogs = Array.isArray(logData?.data) ? logData.data as Record<string, unknown>[] : [];
  const total = Number(logData?.total ?? 0);
  const totalPages = Number(logData?.totalPages ?? 1);

  const logs = search
    ? allLogs.filter((l) =>
      String(l.userId ?? "").includes(search) ||
      String(l.method ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(l.path ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(l.ipAddress ?? "").includes(search))
    : allLogs;

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} API calls logged</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2 self-start">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search user, path, IP..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            {search && (
              <Button size="sm" variant="ghost" onClick={() => setSearch("")} className="h-9 gap-1.5 text-muted-foreground">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs w-32">Time</TableHead>
              <TableHead className="text-xs">User ID</TableHead>
              <TableHead className="text-xs">Method</TableHead>
              <TableHead className="text-xs">Path</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">IP</TableHead>
              <TableHead className="text-xs">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No audit logs found</p>
                </TableCell>
              </TableRow>
            ) : logs.map((log) => {
              const status = Number(log.statusCode ?? 200);
              return (
                <TableRow key={String(log.id)} className="text-xs hover:bg-muted/30">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <div>{log.createdAt ? format(new Date(String(log.createdAt)), "dd/MM HH:mm:ss") : "—"}</div>
                    <div className="text-xs opacity-60">{log.createdAt ? formatDistanceToNow(new Date(String(log.createdAt)), { addSuffix: true }) : ""}</div>
                  </TableCell>
                  <TableCell className="font-medium">{String(log.userId ?? "—")}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${METHOD_COLORS[String(log.method ?? "GET")] ?? "bg-muted text-muted-foreground"}`}>
                      {String(log.method ?? "—")}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground max-w-64 truncate">{String(log.path ?? "—")}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${status < 300 ? "bg-green-500/15 text-green-500" : status < 400 ? "bg-blue-500/15 text-blue-500" : status < 500 ? "bg-amber-500/15 text-amber-500" : "bg-red-500/15 text-red-500"}`}>
                      {status}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{String(log.ipAddress ?? "—")}</TableCell>
                  <TableCell className="text-muted-foreground">{log.durationMs ? `${log.durationMs}ms` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages} • {total.toLocaleString()} total</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
