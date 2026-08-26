"use client";

import { useState } from "react";
import {
  FiEdit2,
  FiKey,
  FiMoreHorizontal,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiUserCheck,
  FiUserX,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessFormDialog } from "@/forms/team-access/access-form-dialog";
import { ResetTeamPasswordDialog } from "@/forms/team-access/reset-team-password-dialog";
import { TeamFormDialog } from "@/forms/team-access/team-form-dialog";
import {
  useActivateTeamMember,
  useDeactivateTeamMember,
  useDeleteAccess,
} from "@/hooks/mutations/use-team-access-mutations";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { useAccessOverview, useTeam } from "@/hooks/queries/use-team-access";
import { formatDateTime } from "@/lib/date";
import type { AccessModuleOption, AccessProfile, TeamMember } from "@/types/team-access";

function teamId(id: number) {
  return `TEAM-${String(id).padStart(4, "0")}`;
}

function MetricCard({ label, value, icon: Icon, iconClassName }: {
  label: string;
  value?: number;
  icon: IconType;
  iconClassName: string;
}) {
  return (
    <Card className="min-h-24 justify-center py-4">
      <CardContent className="flex items-center gap-4 px-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${iconClassName}`}><Icon aria-hidden className="size-5" /></span>
        <div>
          {value === undefined ? <Skeleton className="mb-1 h-6 w-10" /> : <p className="font-heading text-xl font-bold leading-none">{value}</p>}
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AccessCard({ access, modules, onEdit, onDelete }: {
  access: AccessProfile;
  modules: AccessModuleOption[];
  onEdit: (access: AccessProfile) => void;
  onDelete: (access: AccessProfile) => void;
}) {
  const labels = access.modules.map((key) => modules.find((module) => module.key === key)?.name ?? key);

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {access.name}
          <span className="rounded-full border px-2 py-0.5 font-sans text-[0.7rem] font-medium text-muted-foreground">
            {access.team_count} {access.team_count === 1 ? "account" : "accounts"}
          </span>
        </CardTitle>
        <CardDescription>Reusable Team Access profile.</CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${access.name}`} />}><FiMoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(access)}><FiEdit2 aria-hidden="true" />Edit Access</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={access.team_count > 0} onClick={() => onDelete(access)}><FiTrash2 aria-hidden="true" />Delete Access</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5" aria-label={`${access.name} modules`}>
          {labels.map((label) => <span key={label} className="rounded-full border border-primary/25 bg-primary/5 px-2 py-1 text-xs font-medium text-primary">{label}</span>)}
        </div>
        {access.team_count > 0 ? <p className="mt-3 text-xs text-muted-foreground">Reassign all Team members before deleting this Access.</p> : null}
      </CardContent>
    </Card>
  );
}

function TeamActions({ member, currentUserId, onEdit, onReset, onDeactivate, onActivate, activating }: {
  member: TeamMember;
  currentUserId?: number;
  onEdit: (member: TeamMember) => void;
  onReset: (member: TeamMember) => void;
  onDeactivate: (member: TeamMember) => void;
  onActivate: (member: TeamMember) => void;
  activating: boolean;
}) {
  const isCurrentAccount = member.id === currentUserId;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`} />}><FiMoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => onEdit(member)}><FiEdit2 aria-hidden="true" />Edit Team member</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onReset(member)}><FiKey aria-hidden="true" />Reset password</DropdownMenuItem>
        <DropdownMenuSeparator />
        {member.is_active ? (
          <DropdownMenuItem variant="destructive" disabled={isCurrentAccount} onClick={() => onDeactivate(member)}><FiUserX aria-hidden="true" />{isCurrentAccount ? "Current account" : "Deactivate"}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={activating} onClick={() => onActivate(member)}><FiRefreshCw aria-hidden="true" />Reactivate</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TeamAccessManagementView() {
  const [page, setPage] = useState(1);
  const [accessFormOpen, setAccessFormOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<AccessProfile | null>(null);
  const [deletingAccess, setDeletingAccess] = useState<AccessProfile | null>(null);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [resettingMember, setResettingMember] = useState<TeamMember | null>(null);
  const [deactivatingMember, setDeactivatingMember] = useState<TeamMember | null>(null);
  const accessQuery = useAccessOverview();
  const teamQuery = useTeam(page);
  const currentUser = useCurrentUser();
  const deleteAccessMutation = useDeleteAccess();
  const deactivateMutation = useDeactivateTeamMember();
  const activateMutation = useActivateTeamMember();
  const assignableAccesses = accessQuery.data?.accesses ?? [];

  function openCreateAccess() {
    setEditingAccess(null);
    setAccessFormOpen(true);
  }

  function openEditAccess(access: AccessProfile) {
    setEditingAccess(access);
    setAccessFormOpen(true);
  }

  function openCreateTeam() {
    setEditingMember(null);
    setTeamFormOpen(true);
  }

  function openEditTeam(member: TeamMember) {
    setEditingMember(member);
    setTeamFormOpen(true);
  }

  async function deleteSelectedAccess() {
    if (!deletingAccess) return;
    try {
      await deleteAccessMutation.mutateAsync(deletingAccess.id);
      setDeletingAccess(null);
    } catch {
      setDeletingAccess(null);
    }
  }

  async function deactivateSelectedMember() {
    if (!deactivatingMember) return;
    try {
      await deactivateMutation.mutateAsync(deactivatingMember.id);
      setDeactivatingMember(null);
    } catch {
      setDeactivatingMember(null);
    }
  }

  async function activateMember(member: TeamMember) {
    try {
      await activateMutation.mutateAsync(member.id);
    } catch {}
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Team & Access"
        description="Manage Team accounts and the module access assigned to each member."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10 px-4" onClick={openCreateAccess}><FiShield aria-hidden="true" />Add Access</Button>
            <Button className="h-10 px-4" disabled={assignableAccesses.length === 0} onClick={openCreateTeam}><FiUserPlus aria-hidden="true" />Add Team</Button>
          </div>
        }
      />

      <section aria-label="Team and Access summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Team" value={accessQuery.data?.summary.total_team} icon={FiUsers} iconClassName="bg-primary/10 text-primary" />
        <MetricCard label="Active" value={accessQuery.data?.summary.active_team} icon={FiUserCheck} iconClassName="bg-success/10 text-success" />
        <MetricCard label="Inactive" value={accessQuery.data?.summary.inactive_team} icon={FiUserX} iconClassName="bg-foreground/10 text-muted-foreground" />
        <MetricCard label="Access profiles" value={accessQuery.data?.summary.access_profiles} icon={FiShield} iconClassName="bg-energy/10 text-energy" />
      </section>

      {!accessQuery.isPending && !accessQuery.isError && assignableAccesses.length === 0 ? (
        <Alert><AlertDescription>Create at least one custom Access profile before adding a Team member.</AlertDescription></Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <caption className="sr-only">Team accounts and assigned Access profiles</caption>
            <thead className="border-b bg-muted/45 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Team ID</th>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">Contact number</th>
                <th scope="col" className="px-4 py-3">Access</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Last login</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {teamQuery.isPending ? (
                <tr><td colSpan={8}><LoadingState message="Loading Team members…" /></td></tr>
              ) : teamQuery.isError ? (
                <tr><td colSpan={8} className="p-4"><ErrorState title="We couldn't load the Team members." onRetry={() => void teamQuery.refetch()} /></td></tr>
              ) : teamQuery.data.data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center"><p className="font-medium">No Team accounts found.</p><p className="mt-1 text-sm text-muted-foreground">Add the first Team member after creating an Access profile.</p></td></tr>
              ) : teamQuery.data.data.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{teamId(member.id)}</td>
                  <td className="px-4 py-3 font-medium">{member.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{member.contact_number}</td>
                  <td className="px-4 py-3"><span className="rounded-full border px-2 py-1 text-xs font-medium">{member.access.name}</span></td>
                  <td className="px-4 py-3"><span className={member.is_active ? "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" : "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"}><span aria-hidden="true" className={member.is_active ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground"} />{member.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{member.last_login_at ? formatDateTime(member.last_login_at) : "Never"}</td>
                  <td className="px-4 py-3 text-right"><TeamActions member={member} currentUserId={currentUser.data?.id} onEdit={openEditTeam} onReset={setResettingMember} onDeactivate={setDeactivatingMember} onActivate={(item) => void activateMember(item)} activating={activateMutation.isPending} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!teamQuery.isPending && !teamQuery.isError && teamQuery.data.meta.last_page > 1 ? <div className="border-t p-3"><Pagination page={page} lastPage={teamQuery.data.meta.last_page} onChange={setPage} /></div> : null}
      </Card>

      <section aria-labelledby="access-profiles-title" className="grid gap-3">
        <div>
          <h2 id="access-profiles-title" className="font-heading text-lg font-semibold">Access profiles</h2>
          <p className="text-sm text-muted-foreground">Reusable module selections assigned to Team accounts.</p>
        </div>
        {accessQuery.isPending ? <LoadingState message="Loading Access profiles…" /> : accessQuery.isError ? <ErrorState title="We couldn't load the Access profiles." onRetry={() => void accessQuery.refetch()} /> : (
          <div className="grid items-start gap-3 lg:grid-cols-2">
            {accessQuery.data.accesses.map((access) => <AccessCard key={access.id} access={access} modules={accessQuery.data.modules} onEdit={openEditAccess} onDelete={setDeletingAccess} />)}
          </div>
        )}
      </section>

      {accessFormOpen && accessQuery.data ? <AccessFormDialog access={editingAccess} modules={accessQuery.data.modules} open onOpenChange={setAccessFormOpen} /> : null}
      {teamFormOpen && accessQuery.data ? <TeamFormDialog member={editingMember} accesses={assignableAccesses} open onOpenChange={setTeamFormOpen} /> : null}
      {resettingMember ? <ResetTeamPasswordDialog member={resettingMember} open onOpenChange={(open) => !open && setResettingMember(null)} /> : null}

      <Dialog open={Boolean(deletingAccess)} onOpenChange={(open) => !open && !deleteAccessMutation.isPending && setDeletingAccess(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {deletingAccess?.name} Access?</DialogTitle><DialogDescription>This permanently removes the unused Access profile. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><DialogClose render={<Button variant="outline" disabled={deleteAccessMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deleteAccessMutation.isPending} onClick={() => void deleteSelectedAccess()}>{deleteAccessMutation.isPending ? "Deleting…" : "Delete Access"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deactivatingMember)} onOpenChange={(open) => !open && !deactivateMutation.isPending && setDeactivatingMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deactivate {deactivatingMember?.name}?</DialogTitle><DialogDescription>The account will be signed out immediately and cannot log in until it is reactivated. Historical activity remains intact.</DialogDescription></DialogHeader>
          <DialogFooter><DialogClose render={<Button variant="outline" disabled={deactivateMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deactivateMutation.isPending} onClick={() => void deactivateSelectedMember()}>{deactivateMutation.isPending ? "Deactivating…" : "Deactivate Team member"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
