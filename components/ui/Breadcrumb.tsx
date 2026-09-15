import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className={`flex items-center gap-1.5 text-sm ${className}`}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-[#101010]/30" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-[#101010]/50 hover:text-[#101010] transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#101010] font-medium">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
