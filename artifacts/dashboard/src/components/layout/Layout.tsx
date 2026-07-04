import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, AlertTriangle, BarChart3, MessageSquare,
  ClipboardList, Settings, Users, Sun, Moon, LogOut,
  Train, Menu, X, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faults", label: "Fault Data", icon: AlertTriangle },
  { href: "/charts", label: "Analytics", icon: BarChart3 },
  { href: "/alerts", label: "WhatsApp Alerts", icon: MessageSquare },
  { href: "/audit", label: "Audit Logs", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "Users", icon: Users },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border h-16">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <Train className="w-4 h-4 text-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-sidebar-foreground text-sm leading-tight">LocoNet</p>
              <p className="text-xs text-muted-foreground leading-tight">Fault Monitor</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <a className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                  {sidebarOpen && active && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
          {sidebarOpen && user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user.username}</p>
              <Badge variant="outline" className="text-xs mt-0.5 capitalize">{user.role}</Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-16 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500 font-medium">Live</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
