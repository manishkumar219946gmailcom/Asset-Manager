import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useGetSchedulerStatus, useTriggerFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, RefreshCw, Wifi, MessageSquare, Clock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/api";

interface SettingsForm {
  loconet_api_url: string;
  loconet_api_key: string;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_recipient_phone: string;
  alert_enabled: boolean;
  scheduler_interval_minutes: number;
}

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
  const [showToken, setShowToken] = useState(false);
  const [intervalVal, setIntervalVal] = useState(2);

  const [form, setForm] = useState<SettingsForm>({
    loconet_api_url: "",
    loconet_api_key: "",
    whatsapp_phone_number_id: "",
    whatsapp_access_token: "",
    whatsapp_recipient_phone: "",
    alert_enabled: true,
    scheduler_interval_minutes: 2,
  });

  useEffect(() => {
    if (settings) {
      const s = settings as Record<string, string | boolean | number>;
      const intervalMin = Number(s.scheduler_interval_minutes ?? 2);
      setForm({
        loconet_api_url: String(s.loconet_api_url ?? ""),
        loconet_api_key: String(s.loconet_api_key ?? ""),
        whatsapp_phone_number_id: String(s.whatsapp_phone_number_id ?? ""),
        whatsapp_access_token: String(s.whatsapp_access_token ?? ""),
        whatsapp_recipient_phone: String(s.whatsapp_recipient_phone ?? ""),
        alert_enabled: s.alert_enabled !== "false" && s.alert_enabled !== false,
        scheduler_interval_minutes: intervalMin,
      });
      setIntervalVal(intervalMin);
    }
  }, [settings]);

  const set = (key: keyof SettingsForm, value: string | boolean | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ data: {
        loconet_api_url: form.loconet_api_url,
        loconet_api_key: form.loconet_api_key,
        whatsapp_phone_number_id: form.whatsapp_phone_number_id,
        whatsapp_access_token: form.whatsapp_access_token,
        whatsapp_recipient_phone: form.whatsapp_recipient_phone,
        alert_enabled: String(form.alert_enabled),
        scheduler_interval_minutes: String(form.scheduler_interval_minutes),
      }});
      toast({ title: "Settings saved", description: "Configuration updated successfully" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
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
      </SettingSection>

      {/* WhatsApp */}
      <SettingSection title="WhatsApp Cloud API" description="Category A fault alert notifications" icon={MessageSquare}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable WhatsApp Alerts</p>
            <p className="text-xs text-muted-foreground">Auto-send alerts for Category A faults</p>
          </div>
          <Switch checked={form.alert_enabled} onCheckedChange={(v) => set("alert_enabled", v)} />
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label>Phone Number ID</Label>
          <Input value={form.whatsapp_phone_number_id}
            onChange={(e) => set("whatsapp_phone_number_id", e.target.value)} placeholder="123456789012345" />
          <p className="text-xs text-muted-foreground">From Meta Business Suite → WhatsApp</p>
        </div>
        <div className="space-y-1.5">
          <Label>Access Token</Label>
          <div className="relative">
            <Input type={showToken ? "text" : "password"} value={form.whatsapp_access_token}
              onChange={(e) => set("whatsapp_access_token", e.target.value)}
              placeholder="EAAxxxxxxxxxxxxxxxxxxxxx" className="pr-10" />
            <button type="button" onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Recipient Phone</Label>
          <Input value={form.whatsapp_recipient_phone}
            onChange={(e) => set("whatsapp_recipient_phone", e.target.value)} placeholder="+91XXXXXXXXXX" />
          <p className="text-xs text-muted-foreground">With country code, e.g. +91XXXXXXXXXX</p>
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
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
