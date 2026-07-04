import { useState, useCallback } from "react";
import { useListFaults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, RefreshCw, AlertTriangle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/api";

const PAGE_SIZE = 20;

function CategoryBadge({ cat }: { cat: string }) {
  const variants: Record<string, string> = {
    A: "bg-red-500/15 text-red-500 border-red-500/30",
    B: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    C: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  };
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold border ${variants[cat] ?? "bg-muted text-muted-foreground"}`}>{cat}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const isRecovered = status?.toLowerCase() === "recovered";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${isRecovered ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
      {status ?? "Active"}
    </span>
  );
}

export default function Faults() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [zone, setZone] = useState("");
  const [status, setStatus] = useState("");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useListFaults(
    { page, pageSize: PAGE_SIZE, ...(debouncedSearch && { search: debouncedSearch }), ...(category && { category }), ...(zone && { zone }), ...(status && { recoveryStatus: status }) },
    { query: { refetchInterval: 60000 } }
  );

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    const t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, []);

  const handleExport = async (fmt: "csv" | "excel" | "pdf") => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ format: fmt, ...(debouncedSearch && { search: debouncedSearch }), ...(category && { category }), ...(zone && { zone }), ...(status && { recoveryStatus: status }) });
      const res = await fetch(`/api/faults/export?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faults-${new Date().toISOString().slice(0, 10)}.${fmt === "excel" ? "xlsx" : fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: `Faults exported as ${fmt.toUpperCase()}` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const clearFilters = () => { setCategory(""); setZone(""); setStatus(""); setDebouncedSearch(""); setSearch(""); setPage(1); };
  const hasFilters = category || zone || status || debouncedSearch;

  const faultData = data as Record<string, unknown> | undefined;
  const faults = Array.isArray(faultData?.data) ? faultData.data as Record<string, unknown>[] : [];
  const total = Number(faultData?.total ?? 0);
  const totalPages = Number(faultData?.totalPages ?? 1);

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fault Data</h1>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} records</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("csv")} className="gap-2">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")} className="gap-2">
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} className="gap-2">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search loco, fault code..." value={search}
                onChange={(e) => handleSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="A">Category A</SelectItem>
                <SelectItem value="B">Category B</SelectItem>
                <SelectItem value="C">Category C</SelectItem>
              </SelectContent>
            </Select>
            <Select value={zone} onValueChange={(v) => { setZone(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Zone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {["CR", "WR", "NR", "SR", "ER", "SCR", "NER", "ECR", "NCR", "SER", "ECoR"].map(z => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Recovered">Recovered</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs whitespace-nowrap w-8">Cat</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Loco No</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Fault Code</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Description</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Zone</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Shed</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Module</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Location</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Coach</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Loco Type</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Basic Unit</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Alert Type</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Download</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Logged At</TableHead>
                <TableHead className="text-xs whitespace-nowrap">API Ts</TableHead>
                <TableHead className="text-xs whitespace-nowrap">DB Ts</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Created</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Fault ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 19 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : faults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={19} className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No fault records found</p>
                    {hasFilters && <p className="text-xs mt-1">Try clearing the filters</p>}
                  </TableCell>
                </TableRow>
              ) : faults.map((f) => (
                <TableRow key={String(f.id)} className="text-xs hover:bg-muted/30">
                  <TableCell><CategoryBadge cat={String(f.category ?? "")} /></TableCell>
                  <TableCell className="font-mono font-medium whitespace-nowrap">{String(f.locoNo ?? "—")}</TableCell>
                  <TableCell className="font-mono whitespace-nowrap">{String(f.faultCode ?? "—")}</TableCell>
                  <TableCell className="max-w-48 truncate" title={String(f.faultDescription ?? "")}>{String(f.faultDescription ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap"><Badge variant="outline" className="text-xs">{String(f.zone ?? "—")}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap">{String(f.shed ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap">{String(f.moduleName ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap">{String(f.location ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono">{String(f.coachNumber ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap">{String(f.locoType ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap">{String(f.basicUnit ?? "—")}</TableCell>
                  <TableCell><StatusBadge status={String(f.recoveryStatus ?? "Active")} /></TableCell>
                  <TableCell className="whitespace-nowrap">{String(f.alertType ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap">{String(f.downloadStatus ?? "—")}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {f.loggedTimestamp ? format(new Date(String(f.loggedTimestamp)), "dd/MM HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {f.apiTimestamp ? format(new Date(String(f.apiTimestamp)), "dd/MM HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {f.dbTimestamp ? format(new Date(String(f.dbTimestamp)), "dd/MM HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {f.createdAt ? format(new Date(String(f.createdAt)), "dd/MM HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs max-w-32 truncate" title={String(f.uniqueFaultId ?? "")}>
                    {String(f.uniqueFaultId ?? "—")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} records
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
