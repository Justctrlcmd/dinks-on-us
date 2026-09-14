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
import { useCreateCourt, useDeleteCourt, useDeleteRentalEquipment, useUpdateRentalEquipment } from "@/hooks/mutations/use-court-pricing-mutations";
import { useCourtPricingManagement } from "@/hooks/queries/use-court-pricing";
import { formatDateTime } from "@/lib/date";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import { formatHourRange } from "@/lib/time";
import type { Court, CourtConfiguration, RatePeriod, RentalEquipment } from "@/types/court-pricing";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });

function RateSummary({ title, periods }: { title: string; periods: RatePeriod[] }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-3 sm:p-4">
      <h3 className="font-heading text-sm font-bold">{title}</h3>
      <dl className="mt-2 grid gap-1.5">
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
    <Card className="relative gap-0">
      <CardHeader className="pr-14 pb-3 sm:pb-4">
        <div>
          <CardTitle className="text-lg font-bold">Court configuration</CardTitle>
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
          <div className="grid gap-3 sm:gap-4">
            <dl className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5"><dt className="text-[0.65rem] font-bold uppercase tracking-[.12em] text-muted-foreground">Operating hours</dt><dd className="mt-1 font-heading text-sm font-bold sm:text-base">{formatHourRange(configuration.opening_hour, configuration.closing_hour)}</dd></div>
              <div className="rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5"><dt className="text-[0.65rem] font-bold uppercase tracking-[.12em] text-muted-foreground">Players included</dt><dd className="mt-1 font-heading text-sm font-bold sm:text-base">{configuration.included_players_per_court} per court</dd></div>
              <div className="rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5"><dt className="text-[0.65rem] font-bold uppercase tracking-[.12em] text-muted-foreground">Additional player</dt><dd className="mt-1 font-heading text-sm font-bold sm:text-base">{currency.format(configuration.additional_player_price)} each</dd></div>
            </dl>
            <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
              <RateSummary title="Weekday · Mon–Thu" periods={configuration.weekday_rates} />
              <RateSummary title="Weekend · Fri–Sun" periods={configuration.weekend_rates} />
            </div>
            <p className="flex items-center gap-2 border-t border-border/80 pt-3 text-xs text-muted-foreground"><FiClock aria-hidden="true" />Last modified {formatDateTime(configuration.updated_at)}</p>
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
  const updateEquipmentMutation = useUpdateRentalEquipment();
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

  async function toggleEquipment(item: RentalEquipment) {
    try {
      await updateEquipmentMutation.mutateAsync({
        id: item.id,
        input: { name: item.name, price: item.price, total_quantity: item.total_quantity, is_active: !item.is_active },
      });
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
        <Card size="sm" className="gap-0">
          <CardHeader className="pb-3">
            <CardTitle id="courts-title">Number of courts</CardTitle>
            <CardDescription>Adding a court restores the lowest inactive court before assigning a new number.</CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => setAddCourtOpen(true)}><FiPlus aria-hidden="true" />Add court</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {courts.length === 0 ? <EmptyState title="No active courts." description="Use Add court to make configured time slots available." /> : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {courts.map((court) => (
                  <li key={court.id} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
                    <h3 className="min-w-0 truncate font-heading text-sm font-bold">{court.name}</h3>
                    <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Delete ${court.name}`} onClick={() => setDeletingCourt(court)}><FiTrash2 aria-hidden="true" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="equipment-title">
        <Card size="sm" className="gap-0">
          <CardHeader className="pb-3">
            <CardTitle id="equipment-title">Equipment rental</CardTitle>
            <CardDescription>Prices apply once per unit for the whole reservation.</CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => { setEditingEquipment(null); setEquipmentFormOpen(true); }}><FiPlus aria-hidden="true" />Add equipment</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {equipment.length === 0 ? <EmptyState title="No rental equipment." description="Use Add equipment to offer items during public reservation." /> : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {equipment.map((item) => (
                  <li key={item.id} className={`flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-3 ${item.is_active ? "border-border/80 bg-muted/20" : "border-dashed border-border bg-muted/40 opacity-75"}`}>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="min-w-0 truncate font-heading text-sm font-bold">{item.name}</h3>
                        <span className={item.is_active ? "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary" : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground"}>{item.is_active ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-heading text-sm font-extrabold text-primary">{currency.format(item.price)}</span>
                        <span className="text-muted-foreground">{item.total_quantity} in stock</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.name}`} />}><FiMoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingEquipment(item); setEquipmentFormOpen(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {item.is_active ? <DropdownMenuItem variant="destructive" onClick={() => setDeletingEquipment(item)}>Set inactive</DropdownMenuItem> : <DropdownMenuItem disabled={updateEquipmentMutation.isPending || isMutationRateLimited(updateEquipmentMutation)} onClick={() => void toggleEquipment(item)}>{mutationButtonLabel("Updating…", "Set active", updateEquipmentMutation)}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {configurationOpen ? <CourtConfigurationFormDialog configuration={configuration} open onOpenChange={setConfigurationOpen} /> : null}
      {equipmentFormOpen ? <RentalEquipmentFormDialog equipment={editingEquipment} open onOpenChange={setEquipmentFormOpen} /> : null}

      <Dialog open={addCourtOpen} onOpenChange={(open) => !createCourtMutation.isPending && setAddCourtOpen(open)}>
        <DialogContent><DialogHeader><DialogTitle>{nextCourtIsReactivation ? "Reactivate" : "Add"} Court {nextCourtNumber}?</DialogTitle><DialogDescription>{nextCourtIsReactivation ? "This inactive court will become available again using the shared hours, prices, and player rules." : "The new court will immediately use the shared hours, prices, and player rules."}</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={createCourtMutation.isPending} />}>Cancel</DialogClose><Button disabled={createCourtMutation.isPending || isMutationRateLimited(createCourtMutation)} onClick={() => void createCourt()}>{mutationButtonLabel(nextCourtIsReactivation ? "Reactivating…" : "Adding…", `${nextCourtIsReactivation ? "Reactivate" : "Add"} Court ${nextCourtNumber}`, createCourtMutation)}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingCourt)} onOpenChange={(open) => !open && !deleteCourtMutation.isPending && setDeletingCourt(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete {deletingCourt?.name}?</DialogTitle><DialogDescription>This removes the court from future reservations. Add court can reactivate it later, and historical references remain intact.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={deleteCourtMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deleteCourtMutation.isPending || isMutationRateLimited(deleteCourtMutation)} onClick={() => void deleteCourt()}>{mutationButtonLabel("Deleting…", "Delete court", deleteCourtMutation)}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingEquipment)} onOpenChange={(open) => !open && !deleteEquipmentMutation.isPending && setDeletingEquipment(null)}>
        <DialogContent><DialogHeader><DialogTitle>Set {deletingEquipment?.name} inactive?</DialogTitle><DialogDescription>This hides the item from all new reservation flows. Existing reservation snapshots remain available for history.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={deleteEquipmentMutation.isPending} />}>Cancel</DialogClose><Button variant="destructive" disabled={deleteEquipmentMutation.isPending || isMutationRateLimited(deleteEquipmentMutation)} onClick={() => void deleteEquipment()}>{mutationButtonLabel("Updating…", "Set inactive", deleteEquipmentMutation)}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
