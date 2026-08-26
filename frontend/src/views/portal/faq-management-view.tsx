"use client";

import { useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiMoreHorizontal,
  FiMove,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaqFormDialog } from "@/forms/faq/faq-form-dialog";
import { useDeleteFaq, useUpdateFaqOrder } from "@/hooks/mutations/use-faq-mutations";
import { useManagementFaqs } from "@/hooks/queries/use-faqs";
import { cn } from "@/lib/utils";
import type { Faq } from "@/types/faq";

function moveFaq(faqs: Faq[], draggedId: number, targetId: number) {
  const from = faqs.findIndex(({ id }) => id === draggedId);
  const to = faqs.findIndex(({ id }) => id === targetId);
  if (from < 0 || to < 0 || from === to) return faqs;

  const next = [...faqs];
  const [dragged] = next.splice(from, 1);
  next.splice(to, 0, dragged);
  return next;
}

export function FaqManagementView() {
  const query = useManagementFaqs();
  const deleteMutation = useDeleteFaq();
  const orderMutation = useUpdateFaqOrder();
  const [dragOrder, setDragOrder] = useState<Faq[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<Faq | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const originalOrderRef = useRef<number[]>([]);
  const dragOrderRef = useRef<Faq[] | null>(null);
  const orderedFaqs = dragOrder ?? query.data ?? [];

  const openCreate = () => {
    setEditingFaq(null);
    setFormOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setFormOpen(true);
  };

  const persistOrder = async (nextFaqs: Faq[]) => {
    dragOrderRef.current = nextFaqs;
    setDragOrder(nextFaqs);
    try {
      await orderMutation.mutateAsync(nextFaqs.map(({ id }) => id));
      dragOrderRef.current = null;
      setDragOrder(null);
    } catch {
      dragOrderRef.current = null;
      setDragOrder(null);
    }
  };

  const moveByKeyboard = (faq: Faq, direction: -1 | 1) => {
    const index = orderedFaqs.findIndex(({ id }) => id === faq.id);
    const target = orderedFaqs[index + direction];
    if (!target || orderMutation.isPending) return;
    void persistOrder(moveFaq(orderedFaqs, faq.id, target.id));
  };

  const confirmDelete = async () => {
    if (!deletingFaq) return;
    try {
      await deleteMutation.mutateAsync(deletingFaq.id);
      setDeletingFaq(null);
    } catch {
      setDeletingFaq(null);
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        title="FAQs"
        description="Create helpful answers for players and arrange the cards in their public display order."
        actions={
          <Button className="h-10 px-4" onClick={openCreate}>
            <FiPlus aria-hidden="true" />
            Add FAQ
          </Button>
        }
      />

      <section aria-labelledby="faq-board-title" className="rounded-2xl border bg-muted/45 p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="faq-board-title" className="font-heading text-lg font-semibold">FAQ board</h2>
            <p className="mt-1 text-sm text-muted-foreground">Drag cards to reorder them. Changes are saved automatically.</p>
          </div>
          {orderedFaqs.length > 0 && (
            <p className="text-sm text-muted-foreground">{orderedFaqs.length} {orderedFaqs.length === 1 ? "card" : "cards"}</p>
          )}
        </div>

        {query.isPending ? (
          <LoadingState message="Loading FAQ cards…" />
        ) : query.isError ? (
          <ErrorState title="We couldn't load the FAQ board." onRetry={() => void query.refetch()} />
        ) : orderedFaqs.length === 0 ? (
          <EmptyState
            title="No FAQ cards yet."
            description="Create the first question and answer for the public FAQ page."
            action={<Button onClick={openCreate}><FiPlus aria-hidden="true" />Add FAQ</Button>}
          />
        ) : (
          <div className="grid gap-2.5" role="list" aria-label="FAQs in public display order">
            {orderedFaqs.map((faq, index) => (
              <Card
                key={faq.id}
                role="listitem"
                draggable={!orderMutation.isPending}
                aria-label={`FAQ ${index + 1}: ${faq.question}. Drag this card to reorder it.`}
                className={cn(
                  "relative cursor-grab gap-0 overflow-visible py-0 transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
                  draggedId === faq.id && "opacity-60 ring-2 ring-primary/40",
                )}
                onDragStart={(event) => {
                  const target = event.target;
                  if (target instanceof Element && target.closest("[data-faq-actions]")) {
                    event.preventDefault();
                    return;
                  }

                  originalOrderRef.current = orderedFaqs.map(({ id }) => id);
                  dragOrderRef.current = orderedFaqs;
                  setDragOrder(orderedFaqs);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(faq.id));
                  setDraggedId(faq.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!draggedId) return;

                  const nextOrder = moveFaq(dragOrderRef.current ?? query.data ?? [], draggedId, faq.id);
                  dragOrderRef.current = nextOrder;
                  setDragOrder(nextOrder);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                }}
                onDragEnd={() => {
                  const nextOrder = dragOrderRef.current ?? orderedFaqs;
                  if (draggedId && nextOrder.map(({ id }) => id).join() !== originalOrderRef.current.join()) {
                    void persistOrder(nextOrder);
                  }
                  dragOrderRef.current = null;
                  setDraggedId(null);
                }}
              >
                <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 px-3 py-3 sm:px-4 sm:py-3.5">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FiMove className="size-3.5" aria-hidden="true" />
                      <span>Position {index + 1}</span>
                    </div>
                    <h3 className="font-heading text-base font-bold leading-snug text-foreground">{faq.question}</h3>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-5 text-muted-foreground">{faq.answer}</p>
                  </div>

                  <div data-faq-actions>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" className="cursor-pointer" aria-label={`Actions for ${faq.question}`} />}
                    >
                      <FiMoreHorizontal aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      <DropdownMenuItem onClick={() => openEdit(faq)}>
                        <FiEdit2 aria-hidden="true" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={index === 0 || orderMutation.isPending} onClick={() => moveByKeyboard(faq, -1)}>
                        <FiArrowUp aria-hidden="true" />
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={index === orderedFaqs.length - 1 || orderMutation.isPending} onClick={() => moveByKeyboard(faq, 1)}>
                        <FiArrowDown aria-hidden="true" />
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeletingFaq(faq)}>
                        <FiTrash2 aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {formOpen && <FaqFormDialog faq={editingFaq} open onOpenChange={setFormOpen} />}

      <Dialog open={Boolean(deletingFaq)} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeletingFaq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this FAQ?</DialogTitle>
            <DialogDescription>
              This removes “{deletingFaq?.question}” from the board and public FAQ page. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleteMutation.isPending} />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => void confirmDelete()}>
              {deleteMutation.isPending ? "Deleting…" : "Delete FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
