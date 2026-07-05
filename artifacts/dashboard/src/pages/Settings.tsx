import { useState, useEffect, useCallback } from "react";
import { useGetSettings, useUpdateSettings, useGetSchedulerStatus, useTriggerFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, RefreshCw, Wifi, MessageSquare, Clock, Eye, EyeOff, QrCode, CheckCircle2, XCircle, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/api";

interface SettingsForm {
  loconet_api_url: string;
  loconet_api_key: string;
  whatsapp_group_id: string;
  alert_enabled: boolean;
  scheduler_interval_minutes: number;
  dashboard_link: string;
}

interface WaStatus {
  status: "disconnected" | "connecting" | "connected";
  qrCode: string | null;
}

interface WaGroup { id: string; name: string; }

function SettingSection({ title, description, icon: Icon, children }: {
  title: string; description?: string; icon?: React.ElementType; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const { data: scheduler } = useGetSchedulerStatus({ query: { refetchInterval: 10000 } });
  const updateSettings = useUpdateSettings();
  const triggerFetch = useTriggerFetch();
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [intervalVal, setIntervalVal] = useState(2);

  const [form, setForm] = useState<SettingsForm>({
    loconet_api_url: "",
    loconet_api_key: "",
    whatsapp_group_id: "",
    alert_enabled: true,
    scheduler_interval_minutes: 2,
    dashboard_link: "",
  });

  const [waStatus, setWaStatus] = useState<WaStatus>({ status: "disconnected", qrCode: null });
  const [waGroups, setWaGroups] = useState<WaGroup[]>([]);
  const [connectingWa, setConnectingWa] = useState(false);

  const fetchWaStatus = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/alerts/whatsapp-status", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setWaStatus(await res.json() as WaStatus);
    } catch { /* silent */ }
  }, []);

  const fetchWaGroups = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/alerts/whatsapp-groups", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setWaGroups(await res.json() as WaGroup[]);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchWaStatus();
    const id = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(id);
  }, [fetchWaStatus]);

  useEffect(() => {
    if (waStatus.status === "connected") fetchWaGroups();
  }, [waStatus.status, fetchWaGroups]);

  useEffect(() => {
    if (settings) {
      const s = settings as Record<string, string | boolean | number>;
      const intervalMin = Number(s.refreshInterval ?? 2);
      setForm({
        loconet_api_url: String(s.apiEndpoint ?? ""),
        loconet_api_key: String(s.apiKey ?? ""),
        whatsapp_group_id: String(s.whatsappGroupId ?? ""),
        alert_enabled: s.alert_enabled !== "false" && s.alert_enabled !== false,
        scheduler_interval_minutes: intervalMin,
        dashboard_link: String(s.dashboardLink ?? ""),
      });
      setIntervalVal(intervalMin);
    }
  }, [settings]);

  const set = (key: keyof SettingsForm, value: string | boolean | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ data: {
        apiEndpoint: form.loconet_api_url,
        apiKey: form.loconet_api_key,
        whatsappGroupId: form.whatsapp_group_id,
        alert_enabled: String(form.alert_enabled),
        refreshInterval: String(form.scheduler_interval_minutes),
        dashboardLink: form.dashboard_link,
      }});
      toast({ title: "Settings saved", description: "Configuration updated successfully" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const handleConnectWhatsApp = async () => {
    setConnectingWa(true);
    try {
      const token = getToken();
      await fetch("/api/alerts/whatsapp-connect", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "WhatsApp connecting", description: "QR code will appear below — scan with your phone" });
    } catch {
      toast({ title: "Failed to start WhatsApp", variant: "destructive" });
    } finally {
      setConnectingWa(false);
    }
  };

  const handleUpdateInterval = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/scheduler/interval", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ intervalMinutes: intervalVal }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Interval updated", description: `Fetch interval set to ${intervalVal} minutes` });
    } catch {
      toast({ title: "Failed to update interval", variant: "destructive" });
    }
  };

  const handleTrigger = async () => {
    try {
      await triggerFetch.mutateAsync();
      toast({ title: "Fetch triggered", description: "Manual data sync started" });
    } catch {
      toast({ title: "Trigger failed", variant: "destructive" });
    }
  };

  if (isLoading) return (
    <div className="p-6 space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
  );

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure API integrations, alerts, and scheduler</p>
      </div>

      {/* LocoNet API */}
      <SettingSection title="LocoNet API" description="Configure the LocoNet REST API endpoint" icon={Wifi}>
        <div className="space-y-1.5">
          <Label>API Endpoint URL</Label>
          <Input value={form.loconet_api_url} onChange={(e) => set("loconet_api_url", e.target.value)}
            placeholder="https://loconet.railways.gov.in/api/faults" />
          <p className="text-xs text-muted-foreground">Full URL of the LocoNet fault data REST API</p>
        </div>
        <div className="space-y-1.5">
          <Label>API Key / Token</Label>
          <div className="relative">
            <Input type={showSecret ? "text" : "password"} value={form.loconet_api_key}
              onChange={(e) => set("loconet_api_key", e.target.value)} placeholder="Your API key" className="pr-10" />
            <button type="button" onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Dashboard Link (optional)</Label>
          <Input value={form.dashboard_link} onChange={(e) => set("dashboard_link", e.target.value)}
            placeholder="https://your-domain.com" />
          <p className="text-xs text-muted-foreground">Included in WhatsApp alert messages</p>
        </div>
      </SettingSection>

      {/* WhatsApp Personal Number */}
      <SettingSection title="WhatsApp Group Alerts" description="Send alerts from your personal number to your group" icon={MessageSquare}>

        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {waStatus.status === "connected" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {waStatus.status === "connecting" && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
            {waStatus.status === "disconnected" && <XCircle className="w-4 h-4 text-red-500" />}
            <span className="text-sm font-medium">
              {waStatus.status === "connected" ? "Connected" : waStatus.status === "connecting" ? "Waiting for QR scan…" : "Not connected"}
            </span>
            <Badge variant={waStatus.status === "connected" ? "default" : waStatus.status === "connecting" ? "outline" : "destructive"} className="text-xs capitalize">
              {waStatus.status}
            </Badge>
          </div>
          {waStatus.status !== "connected" && (
            <Button size="sm" variant="outline" onClick={handleConnectWhatsApp} disabled={connectingWa || waStatus.status === "connecting"} className="gap-1.5">
              {connectingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
              {waStatus.status === "connecting" ? "Connecting…" : "Connect"}
            </Button>
          )}
        </div>

        {/* QR Code */}
        {waStatus.qrCode && (
          <div className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5">
            <p className="text-sm font-medium text-center">Scan this QR code with WhatsApp on your phone</p>
            <img src={waStatus.qrCode} alt="WhatsApp QR Code" className="w-52 h-52 rounded-lg" />
            <p className="text-xs text-muted-foreground text-center">
              Open WhatsApp → Linked Devices → Link a Device → scan this code
            </p>
          </div>
        )}

        {waStatus.status === "connected" && (
          <>
            {/* Group picker */}
            {waGroups.length > 0 && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Select Group</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.whatsapp_group_id}
                  onChange={(e) => set("whatsapp_group_id", e.target.value)}
                >
                  <option value="">— Choose a group —</option>
                  {waGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Only groups where you are admin are listed</p>
              </div>
            )}

            {/* Manual Group ID fallback */}
            <div className="space-y-1.5">
              <Label>Group ID (manual)</Label>
              <Input value={form.whatsapp_group_id}
                onChange={(e) => set("whatsapp_group_id", e.target.value)}
                placeholder="120363XXXXXXXXXXXX@g.us" />
              <p className="text-xs text-muted-foreground">Paste group ID manually if not shown in the picker above</p>
            </div>
          </>
        )}

        {waStatus.status === "disconnected" && (
          <div className="space-y-1.5">
            <Label>Group ID</Label>
            <Input value={form.whatsapp_group_id}
              onChange={(e) => set("whatsapp_group_id", e.target.value)}
              placeholder="120363XXXXXXXXXXXX@g.us" />
            <p className="text-xs text-muted-foreground">Connect WhatsApp above to use the group picker, or paste the group ID directly</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Alerts</p>
            <p className="text-xs text-muted-foreground">Auto-send to group for Category A faults</p>
          </div>
          <Switch checked={form.alert_enabled} onCheckedChange={(v) => set("alert_enabled", v)} />
        </div>
      </SettingSection>

      {/* Scheduler */}
      <SettingSection title="Data Scheduler" description="Auto-fetch interval and controls" icon={Clock}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${scheduler?.isRunning ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
          <span className="text-sm">Status:</span>
          <Badge variant={scheduler?.isRunning ? "default" : "secondary"} className="text-xs">
            {scheduler?.isRunning ? "Running" : "Stopped"}
          </Badge>
        </div>
        <div className="space-y-1.5">
          <Label>Fetch Interval (minutes)</Label>
          <div className="flex gap-2">
            <Input type="number" min={1} max={60} value={intervalVal}
              onChange={(e) => setIntervalVal(parseInt(e.target.value) || 2)} className="w-32" />
            <Button variant="outline" size="sm" onClick={handleUpdateInterval}>Apply</Button>
          </div>
          <p className="text-xs text-muted-foreground">Minimum 1 minute, maximum 60 minutes</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleTrigger} disabled={triggerFetch.isPending} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${triggerFetch.isPending ? "animate-spin" : ""}`} />
          Manual Sync Now
        </Button>
      </SettingSection>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2 min-w-32">
          <Save className="w-4 h-4" />
          {updateSettings.isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
