import Link from "next/link";
import type { CSSProperties } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

const navStyle: CSSProperties = {
  margin: "0 0 14px",
  color: "#94a3b8",
  fontSize: 13,
};

const listStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 7,
  margin: 0,
  padding: 0,
  listStyle: "none",
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `https://watchtvsport.com${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" style={navStyle}>
        <ol style={listStyle}>
          {items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              style={{ display: "inline-flex", gap: 7, alignItems: "center" }}
            >
              {index > 0 ? <span aria-hidden="true">›</span> : null}
              {item.href ? (
                <Link href={item.href} style={{ color: "#93c5fd", textDecoration: "none" }}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
