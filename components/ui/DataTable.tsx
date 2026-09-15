import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "Aucune donnée disponible",
  className = "",
}: DataTableProps<T>) {
  return (
    <>
      {/* Vue carte : informations lisibles et actions accessibles sur mobile. */}
      <div className={`md:hidden space-y-3 ${className}`}>
        {data.length === 0 ? (
          <div className="rounded-xl border border-[#101010]/5 bg-white px-4 py-10 text-center text-sm text-[#101010]/45">
            {emptyMessage}
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <article key={rowIndex} className="rounded-xl border border-[#101010]/6 bg-white p-4 shadow-sm">
              <dl className="space-y-3">
                {columns.map((col) => (
                  <div key={col.key} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 items-start">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#101010]/45">{col.header}</dt>
                    <dd className={`min-w-0 text-sm leading-relaxed text-right text-[#101010] ${col.className || ""}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))
        )}
      </div>

      {/* Vue dense : tableau classique dès la tablette. */}
      <div className={`hidden md:block overflow-x-auto overscroll-x-contain rounded-xl border border-[#101010]/5 ${className}`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#F5F5F3] border-b border-[#101010]/5">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101010]/5">
            {data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-[#101010]/40">{emptyMessage}</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="bg-white hover:bg-[#F5F5F3]/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-[#101010] ${col.className || ""}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
