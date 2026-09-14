"use client";

import { useState } from "react";
import {
  FiEdit2,
  FiKey,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiUsers,
} from "react-icons/fi";
import { ErrorState } from "@/components/common/error-state";
import { CurrentPasswordConfirmationDialog } from "@/components/common/current-password-confirmation-dialog";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import { Pagination } from "@/components/common/pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AccessFormDialog } from "@/forms/team-access/access-form-dialog";
import { ResetTeamPasswordDialog } from "@/forms/team-access/reset-team-password-dialog";
import { TeamFormDialog } from "@/forms/team-access/team-form-dialog";
import {
  useActivateTeamMember,
  useDeactivateTeamMember,
  useDeleteAccess,
  useDeleteTeamMember,
} from "@/hooks/mutations/use-team-access-mutations";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { useAccessOverview, useTeam } from "@/hooks/queries/use-team-access";
import { formatDateTime } from "@/lib/date";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { AccessModuleOption, AccessProfile, TeamMember } from "@/types/team-access";

function teamId(id: number) {
  return `TEAM-${String(id).padStart(4, "0")}`;
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

function TeamActions({ member, currentUserId, onEdit, onReset, onDeactivate, onActivate, onDelete, activating, activationLabel }: {
  member: TeamMember;
  currentUserId?: number;
  onEdit: (member: TeamMember) => void;
  onReset: (member: TeamMember) => void;
  onDeactivate: (member: TeamMember) => void;
  onActivate: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
  activating: boolean;
  activationLabel: string;
}) {
  const isCurrentAccount = member.id === currentUserId;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`} />}><FiMoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem disabled={isCurrentAccount} onClick={() => onEdit(member)}><FiEdit2 aria-hidden="true" />Edit Team member</DropdownMenuItem>
        <DropdownMenuItem disabled={isCurrentAccount} onClick={() => onReset(member)}><FiKey aria-hidden="true" />Reset password</DropdownMenuItem>
        <DropdownMenuSeparator />
        {member.is_active ? (
          <DropdownMenuItem variant="destructive" disabled={isCurrentAccount} onClick={() => onDeactivate(member)}><FiUserX aria-hidden="true" />{isCurrentAccount ? "Current account" : "Deactivate"}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={activating} onClick={() => onActivate(member)}><FiRefreshCw aria-hidden="true" />{activationLabel}</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isCurrentAccount} onClick={() => onDelete(member)}><FiTrash2 aria-hidden="true" />{isCurrentAccount ? "Current account" : "Delete"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TeamMemberCard({ member, currentUserId, onEdit, onReset, onDeactivate, onActivate, onDelete, activating, activationLabel }: {
  member: TeamMember;
  currentUserId?: number;
  onEdit: (member: TeamMember) => void;
  onReset: (member: TeamMember) => void;
  onDeactivate: (member: TeamMember) => void;
  onActivate: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
  activating: boolean;
  activationLabel: string;
}) {
  return (
    <article className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-primary">{teamId(member.id)}</p>
          <h3 className="mt-1 truncate font-semibold">{member.name}</h3>
          <p className="break-all text-sm text-muted-foreground">{member.email}</p>
        </div>
        <TeamActions
          member={member}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onReset={onReset}
          onDeactivate={onDeactivate}
          onActivate={onActivate}
          onDelete={onDelete}
          activating={activating}
          activationLabel={activationLabel}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Contact</dt>
          <dd className="font-mono text-xs">{member.contact_number}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Access</dt>
          <dd><span className="rounded-full border px-2 py-1 text-xs font-medium">{member.access.name}</span></dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd><span className={member.is_active ? "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" : "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"}><span aria-hidden="true" className={member.is_active ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground"} />{member.is_active ? "Active" : "Inactive"}</span></dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Last login</dt>
          <dd className="text-xs text-muted-foreground">{member.last_login_at ? formatDateTime(member.last_login_at) : "Never"}</dd>
        </div>
      </dl>
    </article>
  );
}

export function TeamAccessManagementView() {
  const [page, setPage] = useState(1);
  const [accessFormOpen, setAccessFormOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<AccessProfile | null>(null);
  const [deletingAccess, setDeletingAccess] = useState<AccessProfile | null>(null);
  const [deletePasswordOpen, setDeletePasswordOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [resettingMember, setResettingMember] = useState<TeamMember | null>(null);
  const [deactivatingMember, setDeactivatingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [deleteTeamPasswordOpen, setDeleteTeamPasswordOpen] = useState(false);
  const accessQuery = useAccessOverview();
  const teamQuery = useTeam(page);
  const currentUser = useCurrentUser();
  const deleteAccessMutation = useDeleteAccess();
  const deleteTeamMutation = useDeleteTeamMember();
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

  async function deleteSelectedAccess(currentPassword: string) {
    if (!deletingAccess) return;
    await deleteAccessMutation.mutateAsync({ id: deletingAccess.id, current_password: currentPassword });
    setDeletePasswordOpen(false);
    setDeletingAccess(null);
  }

  function openDeleteAccess(access: AccessProfile) {
    setDeletePasswordOpen(false);
    setDeletingAccess(access);
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

  async function deleteSelectedMember(currentPassword: string) {
    if (!deletingMember) return;
    await deleteTeamMutation.mutateAsync({ id: deletingMember.id, current_password: currentPassword });
    setDeleteTeamPasswordOpen(false);
    setDeletingMember(null);
  }

  function openDeleteMember(member: TeamMember) {
    setDeleteTeamPasswordOpen(false);
    setDeletingMember(member);
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
        actionsClassName="absolute right-0 top-0"
        actions={
          <div className="flex gap-1.5 sm:gap-2">
            <Button variant="outline" className="h-8 gap-1 px-1.5 text-[0.625rem] sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm [&_svg:not([class*='size-'])]:size-3 sm:[&_svg:not([class*='size-'])]:size-4" onClick={openCreateAccess}>
              <FiPlus aria-hidden="true" />
              <span className="sm:hidden">Access</span>
              <span className="hidden sm:inline">Add Access</span>
            </Button>
            <Button className="h-8 gap-1 px-1.5 text-[0.625rem] sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm [&_svg:not([class*='size-'])]:size-3 sm:[&_svg:not([class*='size-'])]:size-4" disabled={assignableAccesses.length === 0} onClick={openCreateTeam}>
              <FiPlus aria-hidden="true" />
              <span className="sm:hidden">Team</span>
              <span className="hidden sm:inline">Add Team</span>
            </Button>
          </div>
        }
      />

      <section aria-label="Team and Access summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <PortalMetricCard label="Total Team" value={accessQuery.data?.summary.total_team} icon={FiUsers} iconClassName="bg-primary/10 text-primary" />
        <PortalMetricCard label="Active" value={accessQuery.data?.summary.active_team} icon={FiUserCheck} iconClassName="bg-success/10 text-success" />
        <PortalMetricCard label="Inactive" value={accessQuery.data?.summary.inactive_team} icon={FiUserX} iconClassName="bg-foreground/10 text-muted-foreground" />
        <PortalMetricCard label="Access profiles" value={accessQuery.data?.summary.access_profiles} icon={FiShield} iconClassName="bg-energy/10 text-energy" />
      </section>

      {!accessQuery.isPending && !accessQuery.isError && assignableAccesses.length === 0 ? (
        <Alert><AlertDescription>Create at least one custom Access profile before adding a Team member.</AlertDescription></Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <div className="hidden overflow-x-auto md:block">
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
                  <td className="px-4 py-3 text-right"><TeamActions member={member} currentUserId={currentUser.data?.id} onEdit={openEditTeam} onReset={setResettingMember} onDeactivate={setDeactivatingMember} onActivate={(item) => void activateMember(item)} onDelete={openDeleteMember} activating={activateMutation.isPending || isMutationRateLimited(activateMutation)} activationLabel={mutationButtonLabel("Reactivating…", "Reactivate", activateMutation)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {teamQuery.isPending ? (
            <LoadingState message="Loading Team members…" />
          ) : teamQuery.isError ? (
            <ErrorState title="We couldn't load the Team members." onRetry={() => void teamQuery.refetch()} />
          ) : teamQuery.data.data.length === 0 ? (
            <div className="px-1 py-5 text-center"><p className="font-medium">No Team accounts found.</p><p className="mt-1 text-sm text-muted-foreground">Add the first Team member after creating an Access profile.</p></div>
          ) : teamQuery.data.data.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              currentUserId={currentUser.data?.id}
              onEdit={openEditTeam}
              onReset={setResettingMember}
              onDeactivate={setDeactivatingMember}
              onActivate={(item) => void activateMember(item)}
              onDelete={openDeleteMember}
              activating={activateMutation.isPending || isMutationRateLimited(activateMutation)}
              activationLabel={mutationButtonLabel("Reactivating…", "Reactivate", activateMutation)}
            />
          ))}
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
            {accessQuery.data.accesses.map((access) => <AccessCard key={access.id} access={access} modules={accessQuery.data.modules} onEdit={openEditAccess} onDelete={openDeleteAccess} />)}
          </div>
        )}
      </section>

      {accessFormOpen && accessQuery.data ? <AccessFormDialog access={editingAccess} modules={accessQuery.data.modules} open onOpenChange={setAccessFormOpen} /> : null}
      {teamFormOpen && accessQuery.data ? <TeamFormDialog member={editingMember} accesses={assignableAccesses} open onOpenChange={setTeamFormOpen} /> : null}
      {resettingMember ? <ResetTeamPasswordDialog member={resettingMember} open onOpenChange={(open) => !open && setResettingMember(null)} /> : null}

      <Dialog open={Boolean(deletingAccess) && !deletePasswordOpen} onOpenChange={(open) => { if (!open && !deleteAccessMutation.isPending && !deletePasswordOpen) setDeletingAccess(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {deletingAccess?.name} Access?</DialogTitle><DialogDescription>This permanently removes the unused Access profile. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><DialogClose render={<Button variant="outline" disabled={deleteAccessMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deleteAccessMutation.isPending || isMutationRateLimited(deleteAccessMutation)} onClick={() => setDeletePasswordOpen(true)}>{mutationButtonLabel("Deleting…", "Continue", deleteAccessMutation)}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <CurrentPasswordConfirmationDialog
        open={Boolean(deletingAccess) && deletePasswordOpen}
        onOpenChange={setDeletePasswordOpen}
        title={`Confirm deletion of ${deletingAccess?.name ?? "Access"}`}
        description="Enter your current password to permanently delete this unused Access profile."
        destructive
        pending={deleteAccessMutation.isPending}
        disabled={isMutationRateLimited(deleteAccessMutation)}
        confirmLabel={mutationButtonLabel("Deleting…", "Delete Access", deleteAccessMutation)}
        onConfirm={deleteSelectedAccess}
      />

      <Dialog open={Boolean(deletingMember) && !deleteTeamPasswordOpen} onOpenChange={(open) => { if (!open && !deleteTeamMutation.isPending && !deleteTeamPasswordOpen) setDeletingMember(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {deletingMember?.name}?</DialogTitle><DialogDescription>This soft-deletes the Team account so it can no longer sign in or appear in Team Access. Historical reservations, activity, and audit logs remain intact.</DialogDescription></DialogHeader>
          <DialogFooter><DialogClose render={<Button variant="outline" disabled={deleteTeamMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deleteTeamMutation.isPending || isMutationRateLimited(deleteTeamMutation)} onClick={() => setDeleteTeamPasswordOpen(true)}>{mutationButtonLabel("Deleting…", "Continue", deleteTeamMutation)}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <CurrentPasswordConfirmationDialog
        open={Boolean(deletingMember) && deleteTeamPasswordOpen}
        onOpenChange={setDeleteTeamPasswordOpen}
        title={"Confirm deletion of " + (deletingMember?.name ?? "Team account")}
        description="Enter your current password to soft-delete this Team account. Historical records will remain available."
        destructive
        pending={deleteTeamMutation.isPending}
        disabled={isMutationRateLimited(deleteTeamMutation)}
        confirmLabel={mutationButtonLabel("Deleting…", "Delete Team account", deleteTeamMutation)}
        onConfirm={deleteSelectedMember}
      />

      <Dialog open={Boolean(deactivatingMember)} onOpenChange={(open) => !open && !deactivateMutation.isPending && setDeactivatingMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deactivate {deactivatingMember?.name}?</DialogTitle><DialogDescription>The account will be signed out immediately and cannot log in until it is reactivated. Historical activity remains intact.</DialogDescription></DialogHeader>
          <DialogFooter><DialogClose render={<Button variant="outline" disabled={deactivateMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deactivateMutation.isPending || isMutationRateLimited(deactivateMutation)} onClick={() => void deactivateSelectedMember()}>{mutationButtonLabel("Deactivating…", "Deactivate Team member", deactivateMutation)}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
