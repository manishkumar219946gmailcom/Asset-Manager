import { useState } from "react";
import { useListUsers, useCreateUser } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users as UsersIcon, Plus, Pencil, Trash2, RefreshCw, Shield, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { getToken } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface UserForm { username: string; email: string; password: string; role: string; }

export default function Users() {
  const { data, isLoading, refetch } = useListUsers();
  const createUser = useCreateUser();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>({ username: "", email: "", password: "", role: "user" });
  const [isBusy, setIsBusy] = useState(false);

  const users: Record<string, unknown>[] = Array.isArray(data) ? data as Record<string, unknown>[] : [];

  const resetForm = () => setForm({ username: "", email: "", password: "", role: "user" });

  const handleCreate = async () => {
    if (!form.username || !form.password) { toast({ title: "Username and password required", variant: "destructive" }); return; }
    try {
      await createUser.mutateAsync({ username: form.username, email: form.email, password: form.password, role: form.role });
      toast({ title: "User created", description: `${form.username} added successfully` });
      setCreateOpen(false);
      resetForm();
      refetch();
    } catch (e: unknown) {
      toast({ title: "Create failed", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setIsBusy(true);
    try {
      const token = getToken();
      const body: Record<string, string> = { role: form.role };
      if (form.email) body.email = form.email;
      if (form.password) body.password = form.password;
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ title: "User updated" });
      setEditUser(null);
      resetForm();
      await queryClient.invalidateQueries();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsBusy(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/users/${deleteTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "User deleted" });
      setDeleteTarget(null);
      await queryClient.invalidateQueries();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  };

  const openEdit = (user: Record<string, unknown>) => {
    setEditUser(user);
    setForm({ username: String(user.username ?? ""), email: String(user.email ?? ""), password: "", role: String(user.role ?? "user") });
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">{users.length} registered users</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          {currentUser?.role === "admin" && (
            <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add User
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Username</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Created</TableHead>
              {currentUser?.role === "admin" && <TableHead className="text-xs text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No users found</p>
                </TableCell>
              </TableRow>
            ) : users.map((u) => (
              <TableRow key={String(u.id)} className="text-sm hover:bg-muted/30">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    {String(u.username ?? "—")}
                    {String(u.id) === String(currentUser?.id) && <Badge variant="outline" className="text-xs">You</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{String(u.email ?? "—")}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs gap-1">
                    {u.role === "admin" && <Shield className="w-2.5 h-2.5" />}
                    {String(u.role ?? "user")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {u.createdAt ? format(new Date(String(u.createdAt)), "dd/MM/yyyy") : "—"}
                </TableCell>
                {currentUser?.role === "admin" && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {String(u.id) !== String(currentUser?.id) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(Number(u.id))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Username *</Label>
              <Input value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} placeholder="john.doe" /></div>
            <div className="space-y-1.5"><Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@railways.in" /></div>
            <div className="space-y-1.5"><Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" /></div>
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (read-only)</SelectItem>
                  <SelectItem value="admin">Admin (full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createUser.isPending}>{createUser.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update {editUser ? String(editUser.username) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>New Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" /></div>
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isBusy}>{isBusy ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete this account? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={isBusy}>
              {isBusy ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
