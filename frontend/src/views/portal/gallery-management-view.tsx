"use client";

import { useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GalleryImageFormDialog } from "@/forms/gallery/gallery-image-form-dialog";
import { GalleryTabFormDialog } from "@/forms/gallery/gallery-tab-form-dialog";
import {
  useDeleteGalleryImage,
  useDeleteGalleryTab,
  useUpdateGalleryImageOrder,
  useUpdateGalleryTabOrder,
} from "@/hooks/mutations/use-gallery-mutations";
import { useGalleryImages, useGalleryTabs } from "@/hooks/queries/use-gallery";
import { cn } from "@/lib/utils";
import type { GalleryImage, GalleryTab } from "@/types/gallery";

function moveItem<T extends { id: number }>(items: T[], draggedId: number, targetId: number) {
  const from = items.findIndex(({ id }) => id === draggedId);
  const to = items.findIndex(({ id }) => id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [dragged] = next.splice(from, 1);
  next.splice(to, 0, dragged);
  return next;
}

export function GalleryManagementView() {
  const tabsQuery = useGalleryTabs();
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const tabOrderMutation = useUpdateGalleryTabOrder();
  const deleteTabMutation = useDeleteGalleryTab();
  const deleteImageMutation = useDeleteGalleryImage();

  const [tabOrder, setTabOrder] = useState<GalleryTab[] | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null);
  const tabOrderRef = useRef<GalleryTab[] | null>(null);
  const originalTabOrderRef = useRef<number[]>([]);
  const orderedTabs = tabOrder ?? tabsQuery.data ?? [];
  const activeTabId = orderedTabs.some(({ id }) => id === selectedTabId)
    ? selectedTabId
    : orderedTabs[0]?.id ?? null;
  const imagesQuery = useGalleryImages(activeTabId);
  const imageOrderMutation = useUpdateGalleryImageOrder(activeTabId ?? 0);

  const [imageOrder, setImageOrder] = useState<{ tabId: number; items: GalleryImage[] } | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<number | null>(null);
  const imageOrderRef = useRef<GalleryImage[] | null>(null);
  const originalImageOrderRef = useRef<number[]>([]);
  const orderedImages = imageOrder?.tabId === activeTabId ? imageOrder.items : imagesQuery.data ?? [];

  const [tabFormOpen, setTabFormOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<GalleryTab | null>(null);
  const [imageFormOpen, setImageFormOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [deletingTab, setDeletingTab] = useState<GalleryTab | null>(null);
  const [deletingImage, setDeletingImage] = useState<GalleryImage | null>(null);

  const selectTab = (tabId: number) => {
    setSelectedTabId(tabId);
    setImageOrder(null);
    imageOrderRef.current = null;
    setDraggedImageId(null);
  };

  const selectedTab = orderedTabs.find(({ id }) => id === activeTabId) ?? null;

  const openCreateTab = () => {
    setEditingTab(null);
    setTabFormOpen(true);
  };

  const openEditTab = (tab: GalleryTab) => {
    setEditingTab(tab);
    setTabFormOpen(true);
  };

  const openCreateImage = () => {
    if (!activeTabId) return;
    setEditingImage(null);
    setImageFormOpen(true);
  };

  const openEditImage = (image: GalleryImage) => {
    setEditingImage(image);
    setImageFormOpen(true);
  };

  const persistTabOrder = async (nextTabs: GalleryTab[]) => {
    tabOrderRef.current = nextTabs;
    setTabOrder(nextTabs);
    try {
      await tabOrderMutation.mutateAsync(nextTabs.map(({ id }) => id));
    } catch {
    } finally {
      tabOrderRef.current = null;
      setTabOrder(null);
    }
  };

  const persistImageOrder = async (nextImages: GalleryImage[]) => {
    if (!activeTabId) return;
    imageOrderRef.current = nextImages;
    setImageOrder({ tabId: activeTabId, items: nextImages });
    try {
      await imageOrderMutation.mutateAsync(nextImages.map(({ id }) => id));
    } catch {
    } finally {
      imageOrderRef.current = null;
      setImageOrder(null);
    }
  };

  const moveTabByKeyboard = (tab: GalleryTab, direction: -1 | 1) => {
    const index = orderedTabs.findIndex(({ id }) => id === tab.id);
    const target = orderedTabs[index + direction];
    if (!target || tabOrderMutation.isPending) return;
    void persistTabOrder(moveItem(orderedTabs, tab.id, target.id));
  };

  const moveImageByKeyboard = (image: GalleryImage, direction: -1 | 1) => {
    const index = orderedImages.findIndex(({ id }) => id === image.id);
    const target = orderedImages[index + direction];
    if (!target || imageOrderMutation.isPending) return;
    void persistImageOrder(moveItem(orderedImages, image.id, target.id));
  };

  const confirmDeleteTab = async () => {
    if (!deletingTab) return;
    try {
      await deleteTabMutation.mutateAsync(deletingTab.id);
      setDeletingTab(null);
    } catch {
      setDeletingTab(null);
    }
  };

  const confirmDeleteImage = async () => {
    if (!deletingImage) return;
    try {
      await deleteImageMutation.mutateAsync(deletingImage.id);
      setDeletingImage(null);
    } catch {
      setDeletingImage(null);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Landing Gallery"
        description="Create categories and arrange the images displayed in the landing-page gallery."
      />

      <section aria-labelledby="gallery-categories-title" className="rounded-2xl border bg-card p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="gallery-categories-title" className="font-heading text-lg font-semibold">Categories</h2>
            <p className="mt-1 text-sm text-muted-foreground">Drag category tabs to update their public order. Changes save automatically.</p>
            {orderedTabs.length > 0 ? <p className="mt-1 text-xs text-muted-foreground">{orderedTabs.length} {orderedTabs.length === 1 ? "category" : "categories"}</p> : null}
          </div>
          <Button variant="outline" className="h-9 self-start" onClick={openCreateTab}>
            <FiPlus aria-hidden="true" />
            Add category
          </Button>
        </div>

        {tabsQuery.isPending ? (
          <LoadingState message="Loading gallery categories…" />
        ) : tabsQuery.isError ? (
          <ErrorState title="We couldn't load the gallery categories." onRetry={() => void tabsQuery.refetch()} />
        ) : orderedTabs.length === 0 ? (
          <EmptyState
            title="No gallery categories yet."
            description="Add the first category before uploading landing-page images."
            action={<Button onClick={openCreateTab}><FiPlus aria-hidden="true" />Add category</Button>}
          />
        ) : (
          <div role="tablist" aria-label="Gallery categories" className="flex gap-2 overflow-x-auto pb-1">
            {orderedTabs.map((tab, index) => (
              <div
                key={tab.id}
                draggable={!tabOrderMutation.isPending}
                className={cn(
                  "flex shrink-0 cursor-grab items-center rounded-full border bg-background transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
                  activeTabId === tab.id && "border-primary bg-primary text-primary-foreground",
                  draggedTabId === tab.id && "opacity-60 ring-2 ring-primary/40",
                )}
                onDragStart={(event) => {
                  const target = event.target;
                  if (target instanceof Element && target.closest("[data-gallery-tab-actions]")) {
                    event.preventDefault();
                    return;
                  }
                  originalTabOrderRef.current = orderedTabs.map(({ id }) => id);
                  tabOrderRef.current = orderedTabs;
                  setTabOrder(orderedTabs);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(tab.id));
                  setDraggedTabId(tab.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!draggedTabId) return;
                  const next = moveItem(tabOrderRef.current ?? tabsQuery.data ?? [], draggedTabId, tab.id);
                  tabOrderRef.current = next;
                  setTabOrder(next);
                }}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={() => {
                  const next = tabOrderRef.current ?? orderedTabs;
                  if (draggedTabId && next.map(({ id }) => id).join() !== originalTabOrderRef.current.join()) {
                    void persistTabOrder(next);
                  }
                  tabOrderRef.current = null;
                  setDraggedTabId(null);
                }}
              >
                <button
                  id={`gallery-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTabId === tab.id}
                  aria-controls="gallery-tab-panel"
                  className="flex h-10 items-center gap-2 rounded-l-full px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => selectTab(tab.id)}
                >
                  <FiMove className="size-3.5 opacity-70" aria-hidden="true" />
                  {tab.name}
                  <span className={cn("text-xs", activeTabId === tab.id ? "text-primary-foreground/75" : "text-muted-foreground")}>({tab.image_count})</span>
                </button>
                <div data-gallery-tab-actions className="pr-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" className={cn("rounded-full", activeTabId === tab.id && "hover:bg-primary-foreground/15 hover:text-primary-foreground")} aria-label={`Actions for ${tab.name}`} />}
                    >
                      <FiMoreHorizontal aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-42">
                      <DropdownMenuItem onClick={() => openEditTab(tab)}><FiEdit2 aria-hidden="true" />Edit</DropdownMenuItem>
                      <DropdownMenuItem disabled={index === 0 || tabOrderMutation.isPending} onClick={() => moveTabByKeyboard(tab, -1)}><FiArrowLeft aria-hidden="true" />Move left</DropdownMenuItem>
                      <DropdownMenuItem disabled={index === orderedTabs.length - 1 || tabOrderMutation.isPending} onClick={() => moveTabByKeyboard(tab, 1)}><FiArrowRight aria-hidden="true" />Move right</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeletingTab(tab)}><FiTrash2 aria-hidden="true" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedTab ? (
        <section id="gallery-tab-panel" role="tabpanel" aria-labelledby={`gallery-tab-${selectedTab.id}`} className="rounded-2xl border bg-muted/35 p-3 sm:p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">{selectedTab.name} images</h2>
              <p className="mt-1 text-sm text-muted-foreground">Drag image cards to arrange them. Use Edit to replace an image or move it to another category.</p>
            </div>
            <Button variant="outline" className="h-9 self-start" onClick={openCreateImage}><FiPlus aria-hidden="true" />Add image</Button>
          </div>

          {imagesQuery.isPending ? (
            <LoadingState message={`Loading ${selectedTab.name} images…`} />
          ) : imagesQuery.isError ? (
            <ErrorState title="We couldn't load the gallery images." onRetry={() => void imagesQuery.refetch()} />
          ) : orderedImages.length === 0 ? (
            <EmptyState
              title={`No images in ${selectedTab.name}.`}
              description="Upload the first image for this landing-page category."
              action={<Button onClick={openCreateImage}><FiPlus aria-hidden="true" />Add image</Button>}
            />
          ) : (
            <div role="list" aria-label={`${selectedTab.name} images in public display order`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {orderedImages.map((image, index) => (
                <Card
                  key={image.id}
                  role="listitem"
                  draggable={!imageOrderMutation.isPending}
                  aria-label={`Image ${index + 1}: ${image.alt_text}. Drag this card to reorder it.`}
                  className={cn(
                    "group relative cursor-grab gap-0 overflow-hidden py-0 transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
                    draggedImageId === image.id && "opacity-60 ring-2 ring-primary/40",
                  )}
                  onDragStart={(event) => {
                    const target = event.target;
                    if (target instanceof Element && target.closest("[data-gallery-image-actions]")) {
                      event.preventDefault();
                      return;
                    }
                    originalImageOrderRef.current = orderedImages.map(({ id }) => id);
                    imageOrderRef.current = orderedImages;
                    if (activeTabId) setImageOrder({ tabId: activeTabId, items: orderedImages });
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(image.id));
                    setDraggedImageId(image.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!draggedImageId) return;
                    const next = moveItem(imageOrderRef.current ?? imagesQuery.data ?? [], draggedImageId, image.id);
                    imageOrderRef.current = next;
                    if (activeTabId) setImageOrder({ tabId: activeTabId, items: next });
                  }}
                  onDrop={(event) => event.preventDefault()}
                  onDragEnd={() => {
                    const next = imageOrderRef.current ?? orderedImages;
                    if (draggedImageId && next.map(({ id }) => id).join() !== originalImageOrderRef.current.join()) {
                      void persistImageOrder(next);
                    }
                    imageOrderRef.current = null;
                    setDraggedImageId(null);
                  }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden border-b bg-muted">
                    {/* Staff-managed public storage assets may use the configured API host. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.image_url} alt="" className="size-full object-cover" />
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white">
                      <FiMove aria-hidden="true" />
                      {index + 1}
                    </span>
                    <div data-gallery-image-actions className="absolute right-2 top-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="icon-sm" variant="secondary" className="rounded-full shadow-sm" aria-label={`Actions for image ${index + 1}`} />}>
                          <FiMoreHorizontal aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-42">
                          <DropdownMenuItem onClick={() => openEditImage(image)}><FiEdit2 aria-hidden="true" />Edit</DropdownMenuItem>
                          <DropdownMenuItem disabled={index === 0 || imageOrderMutation.isPending} onClick={() => moveImageByKeyboard(image, -1)}><FiArrowUp aria-hidden="true" />Move earlier</DropdownMenuItem>
                          <DropdownMenuItem disabled={index === orderedImages.length - 1 || imageOrderMutation.isPending} onClick={() => moveImageByKeyboard(image, 1)}><FiArrowDown aria-hidden="true" />Move later</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingImage(image)}><FiTrash2 aria-hidden="true" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{image.alt_text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tabFormOpen ? <GalleryTabFormDialog tab={editingTab} open onOpenChange={setTabFormOpen} /> : null}
      {imageFormOpen && activeTabId ? (
        <GalleryImageFormDialog image={editingImage} tabs={orderedTabs} initialTabId={activeTabId} open onOpenChange={setImageFormOpen} />
      ) : null}

      <Dialog open={Boolean(deletingTab)} onOpenChange={(open) => !open && !deleteTabMutation.isPending && setDeletingTab(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deletingTab?.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the category and {deletingTab?.image_count ?? 0} {(deletingTab?.image_count ?? 0) === 1 ? "image" : "images"} inside it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleteTabMutation.isPending} />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={deleteTabMutation.isPending} onClick={() => void confirmDeleteTab()}>
              {deleteTabMutation.isPending ? "Deleting…" : "Delete category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingImage)} onOpenChange={(open) => !open && !deleteImageMutation.isPending && setDeletingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this gallery image?</DialogTitle>
            <DialogDescription>The image will be permanently removed from the admin portal and landing page.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleteImageMutation.isPending} />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={deleteImageMutation.isPending} onClick={() => void confirmDeleteImage()}>
              {deleteImageMutation.isPending ? "Deleting…" : "Delete image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
