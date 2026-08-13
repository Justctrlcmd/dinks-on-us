import Link from "next/link";
import { FiArrowUpRight, FiHelpCircle } from "react-icons/fi";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { Button } from "@/components/ui/button";

const faqs = [
  { question: "Do I need an account to reserve?", answer: "No. Players can check availability and submit a reservation without creating a customer account." },
  { question: "Can I reserve more than one time slot?", answer: "Yes. A single reservation can include multiple one-hour slots, including non-consecutive times and different courts." },
  { question: "How are court rates calculated?", answer: "Rates are based on each one-hour court slot. The system calculates the final amount for your selected slots." },
  { question: "How do I pay?", answer: "You will select a configured e-wallet payment method, upload your receipt, and enter your payment reference for staff verification." },
  { question: "When is my reservation confirmed?", answer: "A reservation is confirmed after the required details are submitted and payment is manually reviewed by staff or a manager." },
] as const;

export function FaqView() {
  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <div className="mx-auto max-w-[76rem] px-6 pb-10 sm:px-10 sm:pb-12">
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-foreground sm:text-5xl">Everything you need before you play.</h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground sm:text-lg">Answers below reflect the current reservation workflow. Staff-managed FAQs will replace or extend this list.</p>
        </div>
        <section>
          <div className="mx-auto max-w-[76rem] px-6 pb-12 sm:px-10 ">
            <div className="grid gap-4">{faqs.map((faq) => <details key={faq.question} className="group rounded-2xl border border-border bg-card p-6 open:border-energy/55"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-heading text-lg font-extrabold tracking-[-.025em]"><span>{faq.question}</span><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-energy/15 text-energy transition-transform group-open:rotate-45">+</span></summary><p className="mt-5 max-w-3xl leading-7 text-muted-foreground">{faq.answer}</p></details>)}</div>
            <div className="mt-12 rounded-2xl border border-energy/40 bg-card p-7 text-card-foreground shadow-sm sm:p-9"><FiHelpCircle className="size-8 text-energy" aria-hidden="true" /><h2 className="mt-6 font-heading text-2xl font-extrabold">Still have a question?</h2><p className="mt-3 max-w-xl leading-7 text-muted-foreground">Official Messenger contact details will be published by Dinks on Us for direct questions and cancellation requests.</p><Button nativeButton={false} className="mt-7 h-12 rounded-full bg-energy px-5 font-extrabold text-energy-foreground hover:bg-energy/90" render={<Link href="#contact" />}>Contact details <span className="ml-1 flex size-7 items-center justify-center rounded-full bg-brand-surface text-white"><FiArrowUpRight className="size-3.5" aria-hidden="true" /></span></Button></div>
          </div>
        </section>
      </main>
    </PublicSiteFrame>
  );
}
