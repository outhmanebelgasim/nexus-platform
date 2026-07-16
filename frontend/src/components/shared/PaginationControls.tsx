import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  label?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  isLoading = false,
  label = "results",
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const currentPage = totalPages === 0 ? 0 : Math.min(page + 1, totalPages);
  const start = totalItems === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p>
          Showing {start.toLocaleString()}-{end.toLocaleString()} of {totalItems.toLocaleString()} {label}
        </p>
        <p>
          Page {currentPage} of {totalPages}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Rows per page"
          className="h-9 w-24"
          value={pageSize}
          disabled={isLoading}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} / page
            </option>
          ))}
        </Select>
        <Button type="button" variant="outline" size="sm" disabled={page === 0 || isLoading} onClick={() => onPageChange(Math.max(page - 1, 0))}>
          Previous
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isLoading || page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
