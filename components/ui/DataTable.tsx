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
      <div className={`md:hidden space-y-3 ${className}`}>
        {data.length === 0 ? (
          <div className="rounded-[18px] border border-[#101010]/8 bg-white px-5 py-12 text-center text-sm text-[#101010]/45 shadow-[0_8px_24px_rgba(16,16,16,0.04)]">
            {emptyMessage}
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <article
              key={rowIndex}
              className="overflow-hidden rounded-[18px] border border-[#101010]/8 bg-white p-5 shadow-[0_8px_26px_rgba(16,16,16,0.045)]"
            >
              <dl className="divide-y divide-[#101010]/6">
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] items-start gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#101010]/42">
                      {col.header}
                    </dt>
                    <dd className={`min-w-0 text-right text-sm font-medium leading-relaxed text-[#101010] ${col.className || ""}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))
        )}
      </div>

      <div className={`nx-table-shell hidden md:block overflow-x-auto overscroll-x-contain ${className}`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#101010]/7 bg-[#F5F5F3]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#101010]/48 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101010]/6 bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-14 text-center text-[#101010]/40">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-[#EFFBDD]/45">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-4 text-[#101010] ${col.className || ""}`}>
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
