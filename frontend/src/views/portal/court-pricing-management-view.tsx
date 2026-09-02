"use client";

import { useState } from "react";
import { FiClock, FiMoreHorizontal, FiPlus, FiSettings, FiTrash2 } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CourtConfigurationFormDialog } from "@/forms/court-pricing/court-configuration-form-dialog";
import { RentalEquipmentFormDialog } from "@/forms/court-pricing/rental-equipment-form-dialog";
import { useCreateCourt, useDeleteCourt, useDeleteRentalEquipment } from "@/hooks/mutations/use-court-pricing-mutations";
import { useCourtPricingManagement } from "@/hooks/queries/use-court-pricing";
import { formatDateTime } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import type { Court, CourtConfiguration, RatePeriod, RentalEquipment } from "@/types/court-pricing";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });

function RateSummary({ title, periods }: { title: string; periods: RatePeriod[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h3 className="font-heading text-sm font-bold">{title}</h3>
      <dl className="mt-3 grid gap-2">
        {periods.map((period) => (
          <div key={`${period.start_hour}-${period.end_hour}`} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{formatHourRange(period.start_hour, period.end_hour)}</dt>
            <dd className="font-bold text-foreground">{currency.format(period.price)}/hour</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ConfigurationSummary({ configuration, onConfigure }: { configuration: CourtConfiguration | null; onConfigure: () => void }) {
  return (
    <Card className="relative">
      <CardHeader className="pr-14">
        <div>
          <CardTitle>Court configuration</CardTitle>
          <CardDescription className="mt-1">One schedule and player policy shared by every court.</CardDescription>
        </div>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="absolute top-5 right-5" onClick={onConfigure} aria-label="Open court configuration settings" />}>
            <FiSettings aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Configure courts</TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent>
        {!configuration ? (
          <EmptyState title="Court rules are not configured yet." description="Set operating hours, rates, and player pricing before accepting reservations." action={<Button onClick={onConfigure}><FiSettings aria-hidden="true" />Configure courts</Button>} />
        ) : (
          <div className="grid gap-5">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/40 p-4"><dt className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Operating hours</dt><dd className="mt-2 font-heading text-base font-bold">{formatHourRange(configuration.opening_hour, configuration.closing_hour)}</dd></div>
              <div className="rounded-xl border border-border bg-muted/40 p-4"><dt className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Players included</dt><dd className="mt-2 font-heading text-base font-bold">{configuration.included_players_per_court} per court</dd></div>
              <div className="rounded-xl border border-border bg-muted/40 p-4"><dt className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Additional player</dt><dd className="mt-2 font-heading text-base font-bold">{currency.format(configuration.additional_player_price)} each</dd></div>
            </dl>
            <div className="grid gap-4 lg:grid-cols-2">
              <RateSummary title="Weekday Price Rate (Monday to Friday)" periods={configuration.weekday_rates} />
              <RateSummary title="Weekend Price Rate (Saturday and Sunday)" periods={configuration.weekend_rates} />
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><FiClock aria-hidden="true" />Last modified {formatDateTime(configuration.updated_at)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CourtPricingManagementView() {
  const query = useCourtPricingManagement();
  const createCourtMutation = useCreateCourt();
  const deleteCourtMutation = useDeleteCourt();
  const deleteEquipmentMutation = useDeleteRentalEquipment();
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [addCourtOpen, setAddCourtOpen] = useState(false);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [equipmentFormOpen, setEquipmentFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<RentalEquipment | null>(null);
  const [deletingEquipment, setDeletingEquipment] = useState<RentalEquipment | null>(null);

  async function createCourt() {
    try {
      await createCourtMutation.mutateAsync();
      setAddCourtOpen(false);
    } catch {}
  }

  async function deleteCourt() {
    if (!deletingCourt) return;
    try {
      await deleteCourtMutation.mutateAsync(deletingCourt.id);
      setDeletingCourt(null);
    } catch {}
  }

  async function deleteEquipment() {
    if (!deletingEquipment) return;
    try {
      await deleteEquipmentMutation.mutateAsync(deletingEquipment.id);
      setDeletingEquipment(null);
    } catch {}
  }

  if (query.isPending) return <LoadingState message="Loading courts and pricing…" />;
  if (query.isError) return <ErrorState title="We couldn't load courts and pricing." onRetry={() => void query.refetch()} />;

  const { configuration, courts, nextCourtNumber, nextCourtIsReactivation, equipment } = query.data;

  return (
    <div className="grid gap-6">
      <PageHeader title="Courts & Pricing" description="Manage the shared court rules, physical courts, and equipment offered during reservation." />
      <ConfigurationSummary configuration={configuration} onConfigure={() => setConfigurationOpen(true)} />

      <section aria-labelledby="courts-title">
        <Card size="sm">
          <CardHeader>
            <CardTitle id="courts-title">Number of courts</CardTitle>
            <CardDescription>Adding a court restores the lowest inactive court before assigning a new number.</CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => setAddCourtOpen(true)}><FiPlus aria-hidden="true" />Add court</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {courts.length === 0 ? <EmptyState title="No active courts." description="Use Add court to make configured time slots available." /> : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {courts.map((court) => (
                  <Card key={court.id} size="sm" className="relative gap-0 py-0">
                    <CardContent className="flex min-h-12 items-center px-3 py-2 pr-10"><h3 className="font-heading text-sm font-bold">{court.name}</h3></CardContent>
                    <Button variant="ghost" size="icon-sm" className="absolute top-1/2 right-2 -translate-y-1/2" aria-label={`Delete ${court.name}`} onClick={() => setDeletingCourt(court)}><FiTrash2 aria-hidden="true" /></Button>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="equipment-title">
        <Card size="sm">
          <CardHeader>
            <CardTitle id="equipment-title">Equipment rental</CardTitle>
            <CardDescription>Prices apply once per unit for the whole reservation.</CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => { setEditingEquipment(null); setEquipmentFormOpen(true); }}><FiPlus aria-hidden="true" />Add equipment</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {equipment.length === 0 ? <EmptyState title="No rental equipment." description="Use Add equipment to offer items during public reservation." /> : (
              <div className="grid gap-2">
                {equipment.map((item) => (
                  <Card key={item.id} size="sm" className="gap-0 py-0">
                    <CardContent className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-3">
                          <h3 className="min-w-0 flex-1 truncate font-heading text-sm font-bold">{item.name}</h3>
                          <p className="shrink-0 border-l border-border pl-3 text-xs text-muted-foreground">{item.total_quantity} in stock</p>
                        </div>
                        <p className="mt-0.5 font-heading text-base font-extrabold text-primary">{currency.format(item.price)}</p>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.name}`} />}><FiMoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingEquipment(item); setEquipmentFormOpen(true); }}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeletingEquipment(item)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {configurationOpen ? <CourtConfigurationFormDialog configuration={configuration} open onOpenChange={setConfigurationOpen} /> : null}
      {equipmentFormOpen ? <RentalEquipmentFormDialog equipment={editingEquipment} open onOpenChange={setEquipmentFormOpen} /> : null}

      <Dialog open={addCourtOpen} onOpenChange={(open) => !createCourtMutation.isPending && setAddCourtOpen(open)}>
        <DialogContent><DialogHeader><DialogTitle>{nextCourtIsReactivation ? "Reactivate" : "Add"} Court {nextCourtNumber}?</DialogTitle><DialogDescription>{nextCourtIsReactivation ? "This inactive court will become available again using the shared hours, prices, and player rules." : "The new court will immediately use the shared hours, prices, and player rules."}</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={createCourtMutation.isPending} />}>Cancel</DialogClose><Button disabled={createCourtMutation.isPending} onClick={() => void createCourt()}>{createCourtMutation.isPending ? (nextCourtIsReactivation ? "Reactivating…" : "Adding…") : `${nextCourtIsReactivation ? "Reactivate" : "Add"} Court ${nextCourtNumber}`}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingCourt)} onOpenChange={(open) => !open && !deleteCourtMutation.isPending && setDeletingCourt(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete {deletingCourt?.name}?</DialogTitle><DialogDescription>This removes the court from future reservations. Add court can reactivate it later, and historical references remain intact.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={deleteCourtMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deleteCourtMutation.isPending} onClick={() => void deleteCourt()}>{deleteCourtMutation.isPending ? "Deleting…" : "Delete court"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingEquipment)} onOpenChange={(open) => !open && !deleteEquipmentMutation.isPending && setDeletingEquipment(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete {deletingEquipment?.name}?</DialogTitle><DialogDescription>This removes the item from new reservations. Existing reservation snapshots remain meaningful.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={deleteEquipmentMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deleteEquipmentMutation.isPending} onClick={() => void deleteEquipment()}>{deleteEquipmentMutation.isPending ? "Deleting…" : "Delete equipment"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
