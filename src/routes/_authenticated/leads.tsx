import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ExternalLink,
  Trash2,
  LogOut,
  Plus,
  MessageCircle,
  X,
  Check,
  Archive,
  ArchiveRestore,
  RotateCcw,
  Search,
  Globe,
  LayoutDashboard,
  ShieldCheck,
  Users,
  ArrowUpRight,
  Layers,

} from "lucide-react";
import { TeamBrand } from "@/components/team-brand";
import { DEFAULT_LEAD_VIEW, LeadStatus } from "@/components/lead-status";
import { signOutThisDevice } from "@/lib/account-session";
import { boundedRequest, recoveryQueryOptions } from "@/lib/request-recovery";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Lead = {
  id: string;
  serial: number;
  phone: string | null;
  facebook_link: string;
  verified: boolean;
  archived: boolean;
  deleted_at: string | null;
  created_at: string;
};

type Collected = {
  facebook_link: string;
  canonical_link: string;
  created_at: string;
  mine: boolean;
};


export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Lead Workspace — TEAM SHAHIN" },
      {
        name: "description",
        content: "Manage, verify, search and archive your leads in the TEAM SHAHIN workspace.",
      },
      { property: "og:title", content: "Lead Workspace — TEAM SHAHIN" },
      { property: "og:description", content: "Your TEAM SHAHIN lead collection, organised and verified." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [link, setLink] = useState("");
  const [phone, setPhone] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "archived" | "trash" | "collected">(DEFAULT_LEAD_VIEW);
  const [selected, setSelected] = useState<string[]>([]);

  const {
    data: leads = [],
    isLoading,
    isError: leadsError,
    refetch: refetchLeads,
  } = useQuery({
    ...recoveryQueryOptions,
    queryKey: ["leads"],
    queryFn: async ({ signal }): Promise<Lead[]> => {
      const uid = user.id;

      // 30 din er purono trash auto delete — background-e, fail korleo page atkabe na.
      void boundedRequest(s => supabase.rpc("purge_old_trash").abortSignal(s)).catch(() => undefined);

      // 1000 row er limit er jonno page by page sob lead ana hoy.
      const PAGE = 1000;
      const all: Lead[] = [];
      for (let start = 0; ; start += PAGE) {
        const { data, error } = await boundedRequest(s => supabase
          .from("leads")
          .select("id, serial, phone, facebook_link, verified, archived, deleted_at, created_at")
          .eq("user_id", uid)
          .order("serial", { ascending: false })
          .range(start, start + PAGE - 1).abortSignal(s), undefined, signal);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
  });

  const { data: isAdmin = false } = useQuery({
    ...recoveryQueryOptions,
    queryKey: ["admin-role"],
    queryFn: async ({ signal }) => {
      const result = await boundedRequest(s => supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).abortSignal(s), undefined, signal);
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const { data: collected = [], isLoading: collectedLoading, isError: previousError, refetch: refetchPrevious } = useQuery({
    ...recoveryQueryOptions,
    queryKey: ["previous-version-leads"],
    enabled: view === "collected",
    queryFn: async ({ signal }): Promise<Collected[]> => {
      const all: Collected[] = [];
      for (let start = 0; ; start += 1000) {
        const { data, error } = await boundedRequest(s => supabase.rpc("previous_version_leads").range(start, start + 999).abortSignal(s), undefined, signal);
        if (error) throw error;
        all.push(...(data ?? []).map(row => ({ ...row, canonical_link: row.id, mine: false })));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  // Link normalize: shesher slash / space remove — jeno same link onno bhabe dileo duplicate dhore
  const normalizeLink = (url: string) => url.trim().replace(/\/+$/, "");
  const linkKey = (url: string) => normalizeLink(url).toLowerCase();

  const addLead = useMutation({
    mutationFn: async () => {
      const trimmedLink = normalizeLink(link);
      const trimmedPhone = phone.trim().slice(0, 30) || null;
      if (!/^https?:\/\/.+/i.test(trimmedLink)) throw new Error("Ekta valid link din (https://...)");
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error("Session shesh hoye geche, abar login korun.");

      const linkLower = linkKey(trimmedLink);
      const duplicateLink = leads.find((l) => linkKey(l.facebook_link) === linkLower);
      if (duplicateLink) throw new Error("Ei Facebook link already add kora ache.");



      if (trimmedPhone) {
        const phoneDigits = trimmedPhone.replace(/\D/g, "");
        const duplicatePhone = leads.find(
          (l) => l.phone && l.phone.replace(/\D/g, "") === phoneDigits,
        );
        if (duplicatePhone) throw new Error("Ei phone number already add kora ache.");
      }

      const { error } = await supabase.from("leads").insert({
        user_id: uid,
        facebook_link: trimmedLink.slice(0, 500),
        // The database trigger replaces this with the authoritative canonical value.
        canonical_link: trimmedLink.slice(0, 500),
        phone: trimmedPhone,
        serial: 0,
      });
      if (error) {
        if (error.code === "23505")
          throw new Error("Ei link onno ekta account e already add kora ache.");
        throw error;
      }
    },
    onSuccess: () => {
      setLink("");
      setPhone("");
      toast.success("Lead add hoyeche");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["previous-version-leads"] });

    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBulk = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error("Session shesh hoye geche, abar login korun.");

      const existingLinks = new Set(leads.map((l) => linkKey(l.facebook_link)));
      const rows: {
        user_id: string;
        facebook_link: string;
        canonical_link: string;
        serial: number;
      }[] = [];
      const seen = new Set<string>();
      let skipped = 0;

      for (const line of bulkText.split("\n")) {
        const match = line.match(/https?:\/\/\S+/i);
        if (!match) continue;
        const url = normalizeLink(match[0].replace(/[),.;]+$/, "")).slice(0, 500);
        const key = linkKey(url);
        if (seen.has(key) || existingLinks.has(key)) {
          skipped++;
          continue;
        }
        seen.add(key);

        rows.push({ user_id: uid, facebook_link: url, canonical_link: url, serial: 0 });
      }

      if (rows.length === 0)
        throw new Error(skipped > 0 ? "Shob link already add kora ache." : "Kono valid link pawa jayni.");

      // Row by row insert — onno account e thaka link (global duplicate) skip hobe
      let added = 0;
      let globalSkipped = 0;
      for (const row of rows) {
        const { error } = await supabase.from("leads").insert(row);
        if (error) {
          if (error.code === "23505") {
            globalSkipped++;
            continue;
          }
          throw error;
        }
        added++;
      }
      if (added === 0)
        throw new Error("Shob link already add kora ache (onno account eo thakte pare).");
      return { added, skipped: skipped + globalSkipped };
    },
    onSuccess: ({ added, skipped }) => {
      setBulkText("");
      setShowBulk(false);
      toast.success(
        skipped > 0 ? `${added} ta lead add hoyeche (${skipped} ta duplicate skip)` : `${added} ta lead add hoyeche`,
      );
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["previous-version-leads"] });

    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("leads")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected([]);
      toast.success("Trash-e pathano hoyeche (30 din thakbe)");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreLead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("leads").update({ deleted_at: null }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected([]);
      toast.success("Restore kora hoyeche");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purgeLead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("leads").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected([]);
      toast.success("Permanently delete hoyeche");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setArchived = useMutation({
    mutationFn: async ({ ids, archived }: { ids: string[]; archived: boolean }) => {
      const { error } = await supabase.from("leads").update({ archived }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      setSelected([]);
      toast.success(v.archived ? "Archive kora hoyeche" : "Unarchive kora hoyeche");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("leads").update({ verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (view === "collected") return [];
    return leads.filter((l) => {
      if (view === "trash") {
        if (!l.deleted_at) return false;
      } else {
        if (l.deleted_at) return false;
        if (l.archived !== (view === "archived")) return false;
      }
      if (q) {
        const match =
          String(l.serial) === q ||
          String(l.serial).includes(q) ||
          l.facebook_link.toLowerCase().includes(q) ||
          (l.phone ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      const d = new Date(l.created_at);
      if (from && d < new Date(`${from}T00:00:00`)) return false;
      if (to && d > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [leads, from, to, view, search]);

  const filteredCollected = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collected
      .filter((c) => {
        if (q && !c.facebook_link.toLowerCase().includes(q)) return false;
        const d = new Date(c.created_at);
        if (from && d < new Date(`${from}T00:00:00`)) return false;
        if (to && d > new Date(`${to}T23:59:59`)) return false;
        return true;
      })
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [collected, from, to, search]);


  useEffect(() => {
    setSelected([]);
  }, [view]);

  const visibleIds = filtered.map((l) => l.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOutThisDevice();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="workspace-page min-h-screen">
      <header className="workspace-header px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <TeamBrand />
          <div className="flex flex-wrap items-center gap-2">
          {isAdmin && <Button variant="outline" size="sm" asChild><Link to="/admin"><LayoutDashboard className="size-4" /> Admin</Link></Button>}
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 size-4" /> Logout
          </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><LayoutDashboard className="size-3.5" /> YOUR WORKSPACE</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Lead collection<span className="text-primary">.</span></h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchLeads(); qc.invalidateQueries({ queryKey: ["previous-version-leads"] }); }}>
            <RotateCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
        <Card className="workspace-panel collection-composer">
          <CardHeader className="flex-row items-center gap-3">
            <span className="composer-icon"><Plus className="size-5" /></span>
            <CardTitle className="text-xl">Add a lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-5 sm:grid-cols-[1.5fr_1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                addLead.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="link">Facebook link</Label>
                <Input
                  id="link"
                  required
                  maxLength={500}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number (optional)</Label>
                <Input
                  id="phone"
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="8801XXXXXXXXX"
                />
              </div>
              <Button type="submit" className="h-11 sm:self-end" disabled={addLead.isPending}>
                <Plus className="mr-2 size-4" /> Add lead
              </Button>
            </form>
          </CardContent>
        </Card>

        {!showBulk ? (
          <Button variant="outline" onClick={() => setShowBulk(true)}>
            <Plus className="mr-2 size-4" /> Bulk Add
          </Button>
        ) : (
          <Card className="workspace-panel bulk-composer">
            <CardHeader>
              <CardTitle className="text-lg">Bulk Add — onek lead ek sathe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Prottek line-e ekta kore Facebook link din (number/serial thakleo hobe — shudhu link
                niya hobe). Duplicate link auto skip hobe.
              </p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                placeholder={
                  "429. https://www.facebook.com/example1\n430. https://www.facebook.com/example2\nhttps://www.facebook.com/example3"
                }
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => addBulk.mutate()}
                  disabled={addBulk.isPending || !bulkText.trim()}
                >
                  <Plus className="mr-2 size-4" />
                  {addBulk.isPending ? "Adding…" : "Shob add korun"}
                </Button>
                <Button variant="ghost" onClick={() => setShowBulk(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="workspace-panel lead-register" id="lead-register">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <CardTitle className="text-lg">
                {view === "active"
                  ? "Leads"
                  : view === "archived"
                    ? "Archive"
                    : view === "trash"
                      ? "Trash"
                      : "Previous Version Leads"}{" "}
                <span className="text-muted-foreground">
                  ({view === "collected" ? filteredCollected.length : filtered.length})
                </span>
              </CardTitle>


            </div>
            <div className="lead-filters flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="search" className="text-xs">
                  Search (serial / link / number)
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                  className="w-full min-w-40 pl-8 sm:w-48"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search leads…"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="from" className="text-xs">
                  From
                </Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to" className="text-xs">
                  To
                </Label>
                <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setSearch("");
                }}
              >
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(view === "collected" ? previousError && collected.length > 0 : leadsError && leads.length > 0) && <p role="status" className="mb-4 text-sm text-muted-foreground">Update load hoyni; ager leads dekhano hocche.</p>}
            {view === "collected" ? (
              <>
                {previousError && collected.length === 0 ? <div className="py-8"><p>Previous leads load hoyni.</p><Button variant="outline" onClick={() => refetchPrevious()}>Retry</Button></div> : collectedLoading ? (
                  <p className="empty-leads py-12 text-center text-sm text-muted-foreground">Loading…</p>
                ) : filteredCollected.length === 0 ? (
                  <p className="empty-leads py-12 text-center text-sm text-muted-foreground">
                    Ekhono kono link collect kora hoyni.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facebook link</TableHead>

                        <TableHead className="w-32">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCollected.map((c) => (
                        <TableRow key={c.canonical_link}>
                          <TableCell className="max-w-[380px] truncate">
                            <a
                              href={c.facebook_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {c.facebook_link}
                              <ExternalLink className="size-3 shrink-0" />
                            </a>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            ) : (
              <>
            {view === "trash" && (

              <p className="mb-4 text-sm text-muted-foreground">
                Trash-er lead gulo 30 din por automatic permanently delete hoye jabe. Chaile ekhoni
                permanently delete ba restore korte paren.
              </p>
            )}
            {selectedVisible.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                <span className="text-sm font-medium">{selectedVisible.length} selected</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  {view === "trash" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoreLead.isPending}
                        onClick={() => restoreLead.mutate(selectedVisible)}
                      >
                        <RotateCcw className="mr-2 size-4" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={purgeLead.isPending}
                        onClick={() => purgeLead.mutate(selectedVisible)}
                      >
                        <Trash2 className="mr-2 size-4" /> Delete forever
                      </Button>
                    </>
                  ) : (
                    <>
                      {view === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setArchived.isPending}
                          onClick={() => setArchived.mutate({ ids: selectedVisible, archived: true })}
                        >
                          <Archive className="mr-2 size-4" /> Archive
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setArchived.isPending}
                          onClick={() =>
                            setArchived.mutate({ ids: selectedVisible, archived: false })
                          }
                        >
                          <ArchiveRestore className="mr-2 size-4" /> Unarchive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={removeLead.isPending}
                        onClick={() => removeLead.mutate(selectedVisible)}
                      >
                        <Trash2 className="mr-2 size-4" /> Remove
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {isLoading ? (
              <p className="empty-leads py-12 text-center text-sm text-muted-foreground">Loading…</p>
            ) : leadsError && leads.length === 0 ? (
              <div className="empty-leads py-12 text-center text-sm text-muted-foreground">
                <p>Leads load hoyni — internet check korun.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => refetchLeads()}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Abar try korun
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="empty-leads py-12 text-center text-sm text-muted-foreground">
                {view === "active"
                  ? "Kono lead nei. Upore link add korun."
                  : view === "archived"
                    ? "Archive khali ache."
                    : "Trash khali ache."}
              </p>

            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(c) => setSelected(c ? visibleIds : [])}
                        aria-label="Select all leads"
                      />
                    </TableHead>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Facebook link</TableHead>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id} data-state={selected.includes(lead.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(lead.id)}
                          onCheckedChange={(c) =>
                            setSelected((prev) =>
                              c ? [...prev, lead.id] : prev.filter((id) => id !== lead.id),
                            )
                          }
                          aria-label={`Select lead ${lead.serial}`}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">{lead.serial}</TableCell>
                      <TableCell className="text-center">
                        <LeadStatus verified={lead.verified} pending={toggleVerified.isPending}
                          onChange={verified => toggleVerified.mutate({ id: lead.id, verified })} />
                      </TableCell>
                      <TableCell>
                        {lead.phone ? (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                          >
                            <MessageCircle className="size-3" />
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">No number</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        <a
                          href={lead.facebook_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {lead.facebook_link}
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {view === "trash" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => restoreLead.mutate([lead.id])}
                                aria-label="Restore lead"
                              >
                                <RotateCcw className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => purgeLead.mutate([lead.id])}
                                aria-label="Delete lead forever"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setArchived.mutate({ ids: [lead.id], archived: !lead.archived })
                                }
                                aria-label={lead.archived ? "Unarchive lead" : "Archive lead"}
                              >
                                {lead.archived ? (
                                  <ArchiveRestore className="size-4" />
                                ) : (
                                  <Archive className="size-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLead.mutate([lead.id])}
                                aria-label="Move lead to trash"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
              </>
            )}

          </CardContent>
        </Card>
        <section className="workspace-tools" aria-label="Workspace features">
          <div className="mb-5 flex items-center gap-3"><Layers className="size-5 text-primary" /><h2 className="text-xl font-semibold">Workspace overview</h2></div>
        <div className="grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">
          {[
            { name: "Active leads", count: leads.filter(l => !l.archived && !l.deleted_at).length, icon: Users },
            { name: "Verified", count: leads.filter(l => l.verified && !l.deleted_at).length, icon: ShieldCheck },
            { name: "Archived", count: leads.filter(l => l.archived && !l.deleted_at).length, icon: Archive },
            { name: "Total leads", count: leads.length, icon: Globe },
          ].map(item => <div key={item.name} className="px-1"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><item.icon className="size-4" />{item.name}</div><div className="font-display text-2xl font-semibold tabular-nums">{isLoading || collectedLoading ? "—" : item.count.toLocaleString()}</div></div>)}
        </div>
          <div className="feature-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              { key: "active", name: "Active leads", icon: Users, count: leads.filter(l => !l.archived && !l.deleted_at).length },
              { key: "archived", name: "Archive", icon: Archive, count: leads.filter(l => l.archived && !l.deleted_at).length },
              { key: "trash", name: "Trash", icon: Trash2, count: leads.filter(l => l.deleted_at).length },
              { key: "collected", name: "Previous Version Leads", icon: Globe, count: null },
            ] as const).map(item => <Button key={item.key} variant="outline" aria-pressed={view === item.key} className={`feature-tile ${view === item.key ? 'border-primary bg-primary/10' : ''}`} onClick={() => { setView(item.key); document.getElementById("lead-register")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); }}>
              <span className="feature-icon"><item.icon className="size-5" /></span>
              <ArrowUpRight className="feature-arrow size-4" />
              <span className="feature-name">{item.name}</span>
              <span className="feature-count">{item.count === null ? "Previous collection" : `${item.count.toLocaleString()} leads`}</span>
            </Button>)}
          </div>
        </section>
        <footer className="workspace-footer"><span>TEAM SHAHIN</span><span>Private workspace</span></footer>
      </div>
    </main>
  );
}
