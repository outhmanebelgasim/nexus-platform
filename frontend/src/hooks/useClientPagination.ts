import { useMemo, useState } from "react";

export function useClientPagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(items.length / pageSize);
  const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);

  const paginatedItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, pageSize, safePage],
  );

  return {
    page: safePage,
    pageSize,
    totalItems: items.length,
    totalPages,
    paginatedItems,
    setPage,
    resetPage: () => setPage(0),
    setPageSize: (nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPage(0);
    },
  };
}
