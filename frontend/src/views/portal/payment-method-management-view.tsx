"use client";

import { useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentMethodFormDialog } from "@/forms/payment-method/payment-method-form-dialog";
import { useDeletePaymentMethod } from "@/hooks/mutations/use-payment-method-mutations";
import { usePaymentMethods } from "@/hooks/queries/use-payment-methods";
import type { PaymentMethod } from "@/types/payment-method";

export function PaymentMethodManagementView() {
  const query = usePaymentMethods();
  const deleteMutation = useDeletePaymentMethod();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);

  const openCreate = () => {
    setEditingMethod(null);
    setFormOpen(true);
  };

  const openEdit = (paymentMethod: PaymentMethod) => {
    setEditingMethod(paymentMethod);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingMethod) return;
    try {
      await deleteMutation.mutateAsync(deletingMethod.id);
      setDeletingMethod(null);
    } catch {
      setDeletingMethod(null);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payment Methods"
        description="Manage the e-wallets and bank accounts players can use for manual payments."
        actionsClassName="absolute right-0 top-0"
        actions={
          <Button className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm" onClick={openCreate}>
            <FiPlus aria-hidden="true" />
            Add Method
          </Button>
        }
      />

      {query.isPending ? (
        <LoadingState message="Loading payment methods…" />
      ) : query.isError ? (
        <ErrorState title="We couldn't load the payment methods." onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No payment methods yet."
          description="Add the first e-wallet or bank account and its QR image."
          action={<Button onClick={openCreate}><FiPlus aria-hidden="true" />Add payment method</Button>}
        />
      ) : (
        <section aria-label="Configured payment methods" className="grid gap-4 lg:grid-cols-3">
          {query.data.map((paymentMethod) => (
            <Card key={paymentMethod.id} className="h-[26rem] w-full gap-0 py-0">
              <CardHeader className="shrink-0 border-b py-2.5 text-center">
                <CardTitle className="text-lg font-bold">{paymentMethod.name}</CardTitle>
              </CardHeader>

              <div className="flex h-52 w-full shrink-0 items-center justify-center border-b bg-muted/35 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentMethod.qr_image_url}
                  alt={`${paymentMethod.name} payment QR code`}
                  className="size-full rounded-md object-contain"
                />
              </div>

              <CardContent className="min-h-0 flex-1 overflow-hidden py-2.5">
                <dl className="grid gap-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 font-medium text-muted-foreground">Account name:</dt>
                    <dd className="min-w-0 text-right font-medium break-words">{paymentMethod.account_name}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 font-medium text-muted-foreground">Account number:</dt>
                    <dd className="min-w-0 text-right font-mono break-all">{paymentMethod.account_number}</dd>
                  </div>
                </dl>
              </CardContent>

              <CardFooter className="mt-auto grid shrink-0 grid-cols-2 gap-2 p-2.5">
                <Button variant="outline" onClick={() => openEdit(paymentMethod)}>
                  <FiEdit2 aria-hidden="true" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => setDeletingMethod(paymentMethod)}>
                  <FiTrash2 aria-hidden="true" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      )}

      {formOpen && (
        <PaymentMethodFormDialog paymentMethod={editingMethod} open onOpenChange={setFormOpen} />
      )}

      <Dialog open={Boolean(deletingMethod)} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeletingMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deletingMethod?.name}?</DialogTitle>
            <DialogDescription>
              This removes the method from future payment choices. Historical payment references remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleteMutation.isPending} />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => void confirmDelete()}>
              {deleteMutation.isPending ? "Deleting…" : "Delete payment method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
