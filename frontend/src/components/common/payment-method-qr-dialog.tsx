"use client";

import * as React from "react";
import type { PublicPaymentMethod } from "@/types/payment-method";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PaymentMethodQrDialog({ method }: { method: PublicPaymentMethod | null }) {
  const [open, setOpen] = React.useState(false);

  if (!method) return null;

  return <>
    <button type="button" className="w-fit text-sm font-semibold text-primary underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" onClick={() => setOpen(true)}>
      Show QR for this e-wallet
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{method.name} QR code</DialogTitle>
          <DialogDescription>Scan this QR code to complete the payment, then enter the transaction reference and attach the receipt.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto flex w-full max-w-xs items-center justify-center rounded-xl border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={method.qr_image_url} alt={`${method.name} payment QR code`} className="aspect-square w-full object-contain" />
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
