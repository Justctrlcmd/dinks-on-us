import { Button } from "@/components/ui/button";
export function Pagination({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (page: number) => void }) {
  return <nav aria-label="Pagination" className="flex items-center justify-between gap-4"><Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {lastPage}</span><Button variant="outline" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>Next</Button></nav>;
}
