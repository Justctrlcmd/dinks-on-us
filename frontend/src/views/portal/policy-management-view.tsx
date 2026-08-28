"use client";

import { useRef, useState } from "react";
import { FiArrowDown, FiArrowUp, FiEdit2, FiMoreHorizontal, FiMove, FiPlus, FiTrash2 } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { PolicyRuleFormDialog } from "@/forms/policy/policy-rule-form-dialog";
import { PolicySubheaderFormDialog } from "@/forms/policy/policy-subheader-form-dialog";
import { useDeletePolicyRule, useDeletePolicySubheader, useUpdatePolicyRuleOrder, useUpdatePolicySubheaderOrder } from "@/hooks/mutations/use-policy-mutations";
import { useManagementPolicies } from "@/hooks/queries/use-policies";
import { cn } from "@/lib/utils";
import type { PolicyRule, PolicySection, PolicySubheader } from "@/types/policy";

function moveItem<T extends { id: number }>(items: T[], draggedId: number, targetId: number) {
  const from = items.findIndex(({ id }) => id === draggedId);
  const to = items.findIndex(({ id }) => id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [dragged] = next.splice(from, 1);
  next.splice(to, 0, dragged);
  return next;
}

function withRuleOrder(section: PolicySection, subheaderId: number, rules: PolicyRule[]) {
  return { ...section, subheaders: section.subheaders.map((subheader) => subheader.id === subheaderId ? { ...subheader, rules } : subheader) };
}

function PolicyBoard({ section }: { section: PolicySection }) {
  const deleteSubheader = useDeletePolicySubheader();
  const deleteRule = useDeletePolicyRule();
  const subheaderOrder = useUpdatePolicySubheaderOrder();
  const ruleOrder = useUpdatePolicyRuleOrder();
  const [current, setCurrent] = useState(section);
  const [subheaderForm, setSubheaderForm] = useState<PolicySubheader | "create" | null>(null);
  const [ruleForm, setRuleForm] = useState<PolicyRule | "create" | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "subheader"; item: PolicySubheader } | { kind: "rule"; item: PolicyRule } | null>(null);
  const [draggedSubheaderId, setDraggedSubheaderId] = useState<number | null>(null);
  const [draggedRule, setDraggedRule] = useState<{ subheaderId: number; ruleId: number } | null>(null);
  const originalOrder = useRef<number[]>([]);
  const originalRuleOrder = useRef<number[]>([]);

  const persistSubheaderOrder = async (subheaders: PolicySubheader[]) => {
    setCurrent((value) => ({ ...value, subheaders }));
    try {
      await subheaderOrder.mutateAsync({ sectionId: current.id, ids: subheaders.map(({ id }) => id) });
    } catch {
      setCurrent(section);
    }
  };

  const persistRuleOrder = async (subheaderId: number, rules: PolicyRule[]) => {
    setCurrent((value) => withRuleOrder(value, subheaderId, rules));
    try {
      await ruleOrder.mutateAsync({ subheaderId, ids: rules.map(({ id }) => id) });
    } catch {
      setCurrent(section);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      if (deleting.kind === "subheader") await deleteSubheader.mutateAsync(deleting.item.id);
      else await deleteRule.mutateAsync(deleting.item.id);
    } catch {
      // The shared mutation cache presents the safe result message.
    } finally {
      setDeleting(null);
    }
  };

  const isDeleting = deleteSubheader.isPending || deleteRule.isPending;
  const ruleFormItem = ruleForm === "create" ? null : ruleForm;
  const subheaderFormItem = subheaderForm === "create" ? null : subheaderForm;

  return (
    <section aria-labelledby={`policy-section-${section.id}`} className="min-w-0 overflow-x-clip rounded-2xl border bg-muted/45 p-3 sm:p-4">
      <div className="relative mb-4">
        <div className="pr-40 sm:pr-56">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Policy section</p>
          <h2 id={`policy-section-${section.id}`} className="mt-1 font-heading text-lg font-semibold">{section.name}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{current.subheaders.reduce((count, item) => count + item.rules.length, 0)} {current.subheaders.reduce((count, item) => count + item.rules.length, 0) === 1 ? "rule" : "rules"}. Drag sub-headers or rules to update the public order.</p>
        <div className="absolute right-0 top-0 flex gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => setSubheaderForm("create")}>
            <FiPlus aria-hidden="true" />
            <span className="sm:hidden">Sub-header</span>
            <span className="hidden sm:inline">Add sub-header</span>
          </Button>
          <Button size="sm" onClick={() => setRuleForm("create")}>
            <FiPlus aria-hidden="true" />
            <span className="sm:hidden">Rule</span>
            <span className="hidden sm:inline">Add rule</span>
          </Button>
        </div>
      </div>

      {current.subheaders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background p-6 text-center"><p className="font-medium">No sub-headers yet.</p><p className="mt-1 text-sm text-muted-foreground">Create a sub-header to begin adding policy rules.</p></div>
      ) : (
        <div className="grid gap-3" role="list" aria-label={`${section.name} sub-headers`}>
          {current.subheaders.map((subheader, subheaderIndex) => {
            const rules = subheader.rules;
            return (
              <div key={subheader.id} role="listitem" className="grid min-w-0 gap-2">
                <Card
                  draggable={!subheaderOrder.isPending}
                  className={cn(
                    "cursor-grab gap-0 overflow-visible py-0 transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
                    draggedSubheaderId === subheader.id && "opacity-60 ring-2 ring-primary/40",
                  )}
                  onDragStart={(event) => {
                    const target = event.target;
                    if (target instanceof Element && target.closest("[data-policy-actions]")) {
                      event.preventDefault();
                      return;
                    }
                    originalOrder.current = current.subheaders.map(({ id }) => id);
                    setDraggedSubheaderId(subheader.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(subheader.id));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!draggedSubheaderId) return;
                    setCurrent((value) => ({ ...value, subheaders: moveItem(value.subheaders, draggedSubheaderId, subheader.id) }));
                  }}
                  onDragEnd={() => {
                    const next = current.subheaders;
                    if (draggedSubheaderId && next.map(({ id }) => id).join() !== originalOrder.current.join()) void persistSubheaderOrder(next);
                    setDraggedSubheaderId(null);
                  }}
                >
                  <CardContent className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <FiMove className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <h3 className="truncate font-heading font-bold">{subheader.title}</h3>
                      <span className="shrink-0 text-xs text-muted-foreground">{rules.length} {rules.length === 1 ? "rule" : "rules"}</span>
                    </div>
                    <div data-policy-actions>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="cursor-pointer" aria-label={`Actions for ${subheader.title}`} />}>
                          <FiMoreHorizontal aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem onClick={() => setSubheaderForm(subheader)}>
                            <FiEdit2 aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={subheaderIndex === 0 || subheaderOrder.isPending} onClick={() => void persistSubheaderOrder(moveItem(current.subheaders, subheader.id, current.subheaders[subheaderIndex - 1].id))}>
                            <FiArrowUp aria-hidden="true" />
                            Move up
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={subheaderIndex === current.subheaders.length - 1 || subheaderOrder.isPending} onClick={() => void persistSubheaderOrder(moveItem(current.subheaders, subheader.id, current.subheaders[subheaderIndex + 1].id))}>
                            <FiArrowDown aria-hidden="true" />
                            Move down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ kind: "subheader", item: subheader })}>
                            <FiTrash2 aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>

                {rules.length === 0 ? (
                  <p className="rounded-lg border border-dashed bg-background px-3 py-2.5 text-sm text-muted-foreground">No rules in this sub-header yet.</p>
                ) : (
                  <div className="grid gap-2 sm:pl-6" role="list" aria-label={`Rules under ${subheader.title}`}>
                    {rules.map((rule, ruleIndex) => (
                      <div
                        key={rule.id}
                        data-policy-rule
                        role="listitem"
                        draggable={!ruleOrder.isPending}
                        className={cn(
                          "grid cursor-grab grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 rounded-lg border bg-background px-3 py-2.5 transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
                          draggedRule?.ruleId === rule.id && "opacity-60 ring-2 ring-primary/40",
                        )}
                        onDragStart={(event) => {
                          const target = event.target;
                          if (target instanceof Element && target.closest("[data-policy-actions]")) {
                            event.preventDefault();
                            return;
                          }
                          originalRuleOrder.current = rules.map(({ id }) => id);
                          setDraggedRule({ subheaderId: subheader.id, ruleId: rule.id });
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(rule.id));
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggedRule?.subheaderId !== subheader.id) return;
                          setCurrent((value) => withRuleOrder(value, subheader.id, moveItem(value.subheaders.find(({ id }) => id === subheader.id)?.rules ?? [], draggedRule.ruleId, rule.id)));
                        }}
                        onDragEnd={() => {
                          const latest = current.subheaders.find(({ id }) => id === subheader.id)?.rules ?? rules;
                          if (draggedRule?.subheaderId === subheader.id && latest.map(({ id }) => id).join() !== originalRuleOrder.current.join()) void persistRuleOrder(subheader.id, latest);
                          setDraggedRule(null);
                        }}
                      >
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <FiMove className="size-3.5" aria-hidden="true" />
                            <span>Position {ruleIndex + 1}</span>
                          </div>
                          <p className="whitespace-pre-line text-sm leading-5 text-muted-foreground">{rule.content}</p>
                        </div>
                        <div data-policy-actions>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="cursor-pointer" aria-label={`Actions for rule ${ruleIndex + 1}`} />}>
                              <FiMoreHorizontal aria-hidden="true" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              <DropdownMenuItem onClick={() => setRuleForm(rule)}>
                                <FiEdit2 aria-hidden="true" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={ruleIndex === 0 || ruleOrder.isPending} onClick={() => void persistRuleOrder(subheader.id, moveItem(rules, rule.id, rules[ruleIndex - 1].id))}>
                                <FiArrowUp aria-hidden="true" />
                                Move up
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={ruleIndex === rules.length - 1 || ruleOrder.isPending} onClick={() => void persistRuleOrder(subheader.id, moveItem(rules, rule.id, rules[ruleIndex + 1].id))}>
                                <FiArrowDown aria-hidden="true" />
                                Move down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ kind: "rule", item: rule })}>
                                <FiTrash2 aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subheaderForm && <PolicySubheaderFormDialog section={current} subheader={subheaderFormItem} open onOpenChange={(open) => !open && setSubheaderForm(null)} />}
      {ruleForm && <PolicyRuleFormDialog section={current} rule={ruleFormItem} open onOpenChange={(open) => !open && setRuleForm(null)} />}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>{deleting?.kind === "subheader" ? "Delete this sub-header?" : "Delete this rule?"}</DialogTitle><DialogDescription>{deleting?.kind === "subheader" ? `Delete “${deleting.item.title}”? Empty sub-headers can be removed permanently.` : "This rule will be permanently removed from the public policy. This action cannot be undone."}</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={isDeleting} />}>Cancel</DialogClose><Button variant="destructive" disabled={isDeleting} onClick={() => void confirmDelete()}>{isDeleting ? "Deleting…" : deleting?.kind === "subheader" ? "Delete sub-header" : "Delete rule"}</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}

export function PolicyManagementView() {
  const query = useManagementPolicies();
  return <div className="grid gap-8"><PageHeader title="Rules & Policies" description="Manage the policies displayed to customers and control their public display order." />{query.isPending ? <LoadingState message="Loading policy boards…" /> : query.isError ? <ErrorState title="We couldn't load the policy boards." onRetry={() => void query.refetch()} /> : query.data.map((section) => <PolicyBoard key={`${section.id}-${section.updated_at}-${section.subheaders.map((subheader) => `${subheader.id}-${subheader.updated_at}-${subheader.rules.map((rule) => `${rule.id}-${rule.updated_at}`).join(",")}`).join("|")}`} section={section} />)}</div>;
}
