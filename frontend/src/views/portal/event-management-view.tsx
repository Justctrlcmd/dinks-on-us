"use client";

import { useState } from "react";
import { FiCalendar, FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventFormDialog } from "@/forms/event/event-form-dialog";
import { useArchiveEvent } from "@/hooks/mutations/use-event-mutations";
import { useManagementEvents } from "@/hooks/queries/use-events";
import { formatDateOnly } from "@/lib/date";
import type { EventRecord } from "@/types/event";

export function EventManagementView() {
  const [page, setPage] = useState(1);
  const query = useManagementEvents(page);
  const archiveMutation = useArchiveEvent();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [archivingEvent, setArchivingEvent] = useState<EventRecord | null>(null);

  function openCreate() {
    setEditingEvent(null);
    setFormOpen(true);
  }

  function openEdit(event: EventRecord) {
    setEditingEvent(event);
    setFormOpen(true);
  }

  async function confirmArchive() {
    if (!archivingEvent) return;
    try {
      await archiveMutation.mutateAsync(archivingEvent.id);
      setArchivingEvent(null);
      if (query.data?.data.length === 1 && page > 1) setPage((current) => current - 1);
    } catch {
      setArchivingEvent(null);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Events"
        description="Publish and maintain the events players see on the public website."
        actions={
          <Button className="h-10 px-4" onClick={openCreate}>
            <FiPlus aria-hidden="true" />
            Add event
          </Button>
        }
      />

      {query.isPending ? (
        <LoadingState message="Loading events…" />
      ) : query.isError ? (
        <ErrorState title="We couldn't load the events." onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title="No events yet."
          description="Add the first event to publish it on the website."
          action={<Button onClick={openCreate}><FiPlus aria-hidden="true" />Add event</Button>}
        />
      ) : (
        <>
          <section aria-label="Published events" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.data.map((event) => (
              <Card key={event.id} className="flex h-[26rem] w-full gap-0 overflow-hidden py-0">
                <CardHeader className="flex shrink-0 flex-row items-center justify-center gap-2 border-b px-4 py-2 text-base font-bold text-foreground">
                  <FiCalendar className="size-4 text-primary" aria-hidden="true" />
                  <time dateTime={event.event_date}>{formatDateOnly(event.event_date)}</time>
                </CardHeader>

                <div className="h-40 shrink-0 border-b bg-muted/35">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.image_url} alt="" className="size-full object-cover" />
                </div>

                <CardContent className="min-h-0 flex-1 overflow-hidden p-4">
                  <h2 className="line-clamp-2 font-heading text-lg font-extrabold leading-6 tracking-[-.025em]">{event.header}</h2>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{event.description}</p>
                </CardContent>

                <CardFooter className="mt-auto grid shrink-0 grid-cols-2 gap-2 border-t p-3">
                  <Button variant="outline" onClick={() => openEdit(event)}>
                    <FiEdit2 aria-hidden="true" />
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => setArchivingEvent(event)}>
                    <FiTrash2 aria-hidden="true" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </section>
          {query.data.meta.last_page > 1 ? (
            <Pagination page={page} lastPage={query.data.meta.last_page} onChange={setPage} />
          ) : null}
        </>
      )}

      {formOpen ? <EventFormDialog event={editingEvent} open onOpenChange={setFormOpen} /> : null}

      <Dialog open={Boolean(archivingEvent)} onOpenChange={(open) => !open && !archiveMutation.isPending && setArchivingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>
              “{archivingEvent?.header}” will be removed from the public website. Its record is retained for history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={archiveMutation.isPending} />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={archiveMutation.isPending} onClick={() => void confirmArchive()}>
              {archiveMutation.isPending ? "Deleting…" : "Delete event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
