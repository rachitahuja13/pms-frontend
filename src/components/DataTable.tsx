import { useMemo, useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  render?: (row: T) => ReactNode;
  /** Used for search filtering when the raw field isn't a plain string/number. */
  searchValue?: (row: T) => string | number | null | undefined;
  /** Used for sorting when the raw field isn't directly comparable. */
  sortValue?: (row: T) => string | number | null | undefined;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  emptyState?: ReactNode;
}

/**
 * Generic client-side data table with column sorting, free-text search, and pagination.
 */
export default function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Search…',
  pageSize = 8,
  loading = false,
  emptyState = null,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const value = col.searchValue ? col.searchValue(row) : (row as Record<string, unknown>)[col.key];
        return String(value ?? '').toLowerCase().includes(q);
      })
    );
  }, [rows, query, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : (a as Record<string, unknown>)[sortKey];
      const bv = col?.sortValue ? col.sortValue(b) : (b as Record<string, unknown>)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    if (sortDir === 'desc') copy.reverse();
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
    setPage(0);
  }

  return (
    <div>
      {searchable && (
        <div className="data-table__toolbar">
          <div className="data-table__search">
            <Search size={14} strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
            />
          </div>
          <div className="data-table__count">
            {sorted.length} {sorted.length === 1 ? 'result' : 'results'}
          </div>
        </div>
      )}

      <div className="data-table__scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, cursor: col.sortable ? 'pointer' : 'default' }}
                  onClick={() => toggleSort(col)}
                >
                  <span className="data-table__th">
                    {col.label}
                    {col.sortable &&
                      sortKey === col.key &&
                      (sortDir === 'asc' ? (
                        <ChevronUp size={12} strokeWidth={2.5} />
                      ) : (
                        <ChevronDown size={12} strokeWidth={2.5} />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Skeleton rows={pageSize} columns={columns.length} />
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0, borderBottom: 'none' }}>
                  {emptyState || <div className="empty-state">No results.</div>}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className={onRowClick ? 'clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length > pageSize && (
        <div className="data-table__pagination">
          <button
            className="btn btn--secondary btn--icon"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <span className="mono">
            Page {clampedPage + 1} of {totalPages}
          </span>
          <button
            className="btn btn--secondary btn--icon"
            disabled={clampedPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
