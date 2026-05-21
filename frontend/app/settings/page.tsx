"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAppSettings, useUpdateAppSettings, useUploadCompanyLogo, useCurrentUserPermissions, useUserPermissions, useUpdateUserPermissions } from "@/hooks/use-settings";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import { Role, UserPermission, DocumentControl, DocumentType } from "@/types";
import api from "@/lib/api";
import { applyPrimaryColor } from "@/lib/theme";
import { Image as ImageIcon, Building2, Palette, Save, Settings as SettingsIcon, Users as UsersIcon, FileBadge, Trash2, Pencil, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

const PRIMARY_PRESETS = ["#0d6efd", "#16a34a", "#7c3aed", "#dc2626", "#ea580c", "#0891b2", "#db2777", "#475569"];

export default function SettingsPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const isAdmin = permissions?.accessSettings;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure software profile, users, permissions and document numbering.</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Software Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="documents">Document Control</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile"><SoftwareProfileTab /></TabsContent>
        {isAdmin && <TabsContent value="users"><UsersTab /></TabsContent>}
        {isAdmin && <TabsContent value="documents"><DocumentControlTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────── Profile

function SoftwareProfileTab() {
  const { data: settings } = useAppSettings();
  const update = useUpdateAppSettings();
  const uploadLogo = useUploadCompanyLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d6efd");
  const [address, setAddress] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!settings) return;
    setCompanyName(settings.companyName ?? "");
    setSoftwareName(settings.softwareName ?? "");
    setPrimaryColor(settings.primaryColor ?? "#0d6efd");
    setAddress(settings.address ?? "");
    setGstNo(settings.gstNo ?? "");
    setContactNumber(settings.contactNumber ?? "");
    setEmail(settings.email ?? "");
  }, [settings]);

  useEffect(() => { applyPrimaryColor(primaryColor); }, [primaryColor]);

  const onSave = () => {
    update.mutate({
      companyName, softwareName, primaryColor, address, gstNo, contactNumber, email,
    } as any, {
      onSuccess: () => { window.dispatchEvent(new CustomEvent('appSettingsUpdated')); }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      <Card className="p-6 space-y-5">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Building2 className="w-5 h-5 text-primary-600" /> Identity</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Aira Euro Automation Pvt Ltd" />
          </div>
          <div className="space-y-2">
            <Label>Software Name</Label>
            <Input value={softwareName} onChange={(e) => setSoftwareName(e.target.value)} placeholder="Project Order Tracking" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input value={gstNo} onChange={(e) => setGstNo(e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+91 …" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Full address" />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5 text-primary-600" /> Branding</h3>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo.mutate(f); }} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload Logo</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Primary Color</Label>
          <div className="flex items-center gap-3 flex-wrap">
            {PRIMARY_PRESETS.map(c => (
              <button key={c} type="button"
                onClick={() => setPrimaryColor(c)}
                style={{ background: c }}
                className={`w-9 h-9 rounded-lg border-2 ${primaryColor.toLowerCase() === c.toLowerCase() ? 'border-foreground ring-2 ring-offset-2 ring-primary' : 'border-transparent'}`}
                aria-label={c}
              />
            ))}
            <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-9 p-0.5 cursor-pointer" />
            <span className="text-sm text-muted-foreground font-mono">{primaryColor.toUpperCase()}</span>
          </div>
          <p className="text-xs text-muted-foreground">Theme color drives accents across the application (light + dark mode).</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={update.isPending}>
            <Save className="w-4 h-4 mr-2" />{update.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────── Users

interface UserRow {
  id: number; username: string; firstName: string; lastName: string;
  role: Role; isActive: boolean; mobileNumber?: string | null; email?: string | null; avatar?: string | null;
}

function UsersTab() {
  const [search, setSearch] = useState("");
  const { data, refetch } = useUsers({ search });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [permFor, setPermFor] = useState<UserRow | null>(null);
  const del = useDeleteUser();

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input className="max-w-xs" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Add User</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-2 px-3">User</th>
              <th className="text-left py-2 px-3">Username</th>
              <th className="text-left py-2 px-3">Role</th>
              <th className="text-left py-2 px-3">Mobile</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map(u => (
              <tr key={u.id} className="border-t border-border/60 hover:bg-muted/30">
                <td className="py-2 px-3">
                  <div className="font-medium">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="py-2 px-3">{u.username}</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">{u.role}</span></td>
                <td className="py-2 px-3">{u.mobileNumber || "—"}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setPermFor(u)}><ShieldCheck className="w-4 h-4 mr-1" /> Permissions</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(u); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete user ${u.username}?`)) del.mutate(u.id, { onSuccess: () => refetch() }); }}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                </td>
              </tr>
            ))}
            {!data?.data?.length && (<tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No users yet.</td></tr>)}
          </tbody>
        </table>
      </Card>

      <UserDialog open={open} onClose={() => setOpen(false)} user={editing as any} />
      <PermissionDialog open={!!permFor} onClose={() => setPermFor(null)} user={permFor as any} />
    </div>
  );
}

function UserDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user?: UserRow | null }) {
  const isEdit = !!user;
  const create = useCreateUser();
  const update = useUpdateUser();
  const [form, setForm] = useState({
    username: "", password: "", firstName: "", lastName: "", role: Role.USER as Role, isActive: true,
    mobileNumber: "", email: "",
  });

  useEffect(() => {
    if (open && user) {
      setForm({ username: user.username, password: "", firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive, mobileNumber: user.mobileNumber || "", email: user.email || "" });
    } else if (open && !user) {
      setForm({ username: "", password: "", firstName: "", lastName: "", role: Role.USER, isActive: true, mobileNumber: "", email: "" });
    }
  }, [open, user]);

  const handleSubmit = () => {
    if (!form.username || (!isEdit && !form.password)) { toast.error("Username and password are required."); return; }
    if (isEdit) {
      update.mutate({ id: user!.id, data: { ...form, password: form.password || undefined } }, { onSuccess: () => onClose() });
    } else {
      create.mutate(form as any, { onSuccess: () => onClose() });
    }
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={isEdit ? "Edit User" : "New User"} size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
        <div className="space-y-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Username *</Label><Input value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} disabled={isEdit} /></div>
        <div className="space-y-2"><Label>{isEdit ? "Password (leave blank to keep)" : "Password *"}</Label><Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Role</Label>
          <select className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value as Role }))}>
            <option value={Role.USER}>USER</option>
            <option value={Role.MANAGER}>MANAGER</option>
            <option value={Role.ADMIN}>ADMIN</option>
          </select>
        </div>
        <div className="space-y-2"><Label>Mobile</Label><Input value={form.mobileNumber} onChange={(e) => setForm(f => ({ ...f, mobileNumber: e.target.value }))} /></div>
        <div className="space-y-2 col-span-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div className="space-y-2 col-span-2 flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(c) => setForm(f => ({ ...f, isActive: c }))} /><Label>Active</Label></div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
          <Save className="w-4 h-4 mr-2" />{isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </Dialog>
  );
}

function PermissionDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user?: UserRow | null }) {
  const { data: meta } = useUserPermissions(user?.id);
  const update = useUpdateUserPermissions(user?.id);
  const [perms, setPerms] = useState<UserPermission | null>(null);
  useEffect(() => { if (open) setPerms((meta?.permissions ?? null) as any); }, [open, meta]);

  const onSave = () => {
    if (!user || !perms) return;
    update.mutate({ userId: user.id, permissions: perms }, { onSuccess: () => onClose() });
  };

  const set = (key: keyof UserPermission, value: any) => setPerms(p => p ? ({ ...p, [key]: value }) : p);

  const sections: { title: string; keys: (keyof UserPermission)[] }[] = [
    { title: "Dashboard",          keys: ["viewDashboard", "exportDashboard"] },
    { title: "Master Data",         keys: ["viewMaster", "addMaster", "editMaster", "importMaster", "exportMaster"] },
    { title: "Master Modules",      keys: ["manageParty", "manageProduct", "manageItem", "manageProcess", "manageBom", "manageItemType", "manageItemCategory", "manageItemGroup", "manageProductCategory", "manageMaterial", "manageUnit"] },
    { title: "Orders",              keys: ["viewOrder", "createOrder", "editOrder", "approveOrder"] },
    { title: "Purchase Indent",     keys: ["viewPI", "createPI", "editPI", "approvePI"] },
    { title: "Purchase Order",      keys: ["viewPO", "createPO", "editPO", "approvePO"] },
    { title: "Inward",              keys: ["viewInward", "createInward", "editInward"] },
    { title: "Quality Check",       keys: ["viewQC", "createQC", "editQC", "approveQC"] },
    { title: "Job Work",            keys: ["viewJobWork", "createJobWork", "editJobWork"] },
    { title: "Production",          keys: ["viewProduction", "createProduction", "editProduction"] },
    { title: "Delivery",            keys: ["viewDelivery", "createDelivery", "editDelivery"] },
    { title: "Reports & Settings",  keys: ["viewReports", "viewTraceability", "accessSettings", "manageUsers", "manageDocumentControl"] },
  ];

  return (
    <Dialog isOpen={open} onClose={onClose} title={`Permissions — ${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size="3xl">
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
        {sections.map(sec => (
          <Card key={sec.title} className="p-4">
            <h4 className="text-sm font-semibold mb-3">{sec.title}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sec.keys.map(k => (
                <label key={String(k)} className="flex items-center gap-2">
                  <Switch checked={!!perms?.[k]} onCheckedChange={(c) => set(k, c)} />
                  <span className="text-sm text-foreground capitalize">{String(k).replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} disabled={update.isPending}><Save className="w-4 h-4 mr-2" />Save Permissions</Button>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────── Document Control

function DocumentControlTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['document-controls'],
    queryFn: async (): Promise<DocumentControl[]> => {
      const r = await api.get('/document-controls');
      return r.data.data ?? [];
    },
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentControl | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, DocumentControl[]>();
    (data ?? []).forEach(d => {
      const k = d.documentType;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(d);
    });
    return Array.from(map.entries());
  }, [data]);

  const apply = async (id: number) => {
    await api.post(`/document-controls/${id}/apply`);
    qc.invalidateQueries({ queryKey: ['document-controls'] });
    toast.success('Revision applied');
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage document numbering / revision metadata used on PI, PO, JW and Delivery Challan prints.</p>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><FileBadge className="w-4 h-4 mr-2" />+ New Revision</Button>
      </div>
      {grouped.map(([type, list]) => (
        <Card key={type} className="p-4">
          <h4 className="font-semibold mb-3">{type}</h4>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="text-left py-1.5">Document No</th><th className="text-left py-1.5">Revision</th><th className="text-left py-1.5">Date</th><th className="text-left py-1.5">Applied?</th><th className="text-right py-1.5">Actions</th></tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.id} className="border-t border-border/60">
                  <td className="py-2">{d.documentNo}</td>
                  <td className="py-2">{d.revisionNo}</td>
                  <td className="py-2">{formatDate(d.revisionDate)}</td>
                  <td className="py-2">{d.isApplied ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">Applied</span> : <span className="text-muted-foreground text-xs">—</span>}</td>
                  <td className="py-2 text-right space-x-2">
                    {!d.isApplied && <Button size="sm" variant="outline" onClick={() => apply(d.id)}>Apply</Button>}
                    <Button size="sm" variant="outline" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
      <DocumentControlDialog open={open} onClose={() => setOpen(false)} editing={editing} />
    </div>
  );
}

function DocumentControlDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: DocumentControl | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ documentType: DocumentType; documentNo: string; revisionNo: string; revisionDate: string }>({
    documentType: DocumentType.PurchaseIndent, documentNo: '', revisionNo: '00', revisionDate: new Date().toISOString().slice(0, 10),
  });
  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ documentType: editing.documentType, documentNo: editing.documentNo, revisionNo: editing.revisionNo, revisionDate: (editing.revisionDate || '').slice(0, 10) });
      } else {
        setForm({ documentType: DocumentType.PurchaseIndent, documentNo: '', revisionNo: '00', revisionDate: new Date().toISOString().slice(0, 10) });
      }
    }
  }, [open, editing]);

  const onSubmit = async () => {
    try {
      if (editing) await api.put(`/document-controls/${editing.id}`, { documentNo: form.documentNo, revisionNo: form.revisionNo, revisionDate: form.revisionDate });
      else await api.post(`/document-controls`, form);
      qc.invalidateQueries({ queryKey: ['document-controls'] });
      toast.success('Saved');
      onClose();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={editing ? 'Edit Revision' : 'New Revision'} size="md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
        <div className="space-y-2">
          <Label>Document Type</Label>
          <select className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm" value={form.documentType} disabled={!!editing} onChange={(e) => setForm(f => ({ ...f, documentType: e.target.value as DocumentType }))}>
            <option value={DocumentType.PurchaseIndent}>Purchase Indent</option>
            <option value={DocumentType.PurchaseOrder}>Purchase Order</option>
            <option value={DocumentType.JobWork}>Job Work</option>
            <option value={DocumentType.DeliveryChallan}>Delivery Challan</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Document No</Label>
          <Input value={form.documentNo} onChange={(e) => setForm(f => ({ ...f, documentNo: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Revision No</Label>
          <Input value={form.revisionNo} onChange={(e) => setForm(f => ({ ...f, revisionNo: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Revision Date</Label>
          <Input type="date" value={form.revisionDate} onChange={(e) => setForm(f => ({ ...f, revisionDate: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit}><Save className="w-4 h-4 mr-2" />Save</Button>
      </div>
    </Dialog>
  );
}
