"use client";

import { useState } from "react";

type Props = {
  countries: string[];
  languages: string[];
  onChange: (filters: {
    access: "all" | "free" | "paid";
    country: string;
    language: string;
  }) => void;
};

export default function FiltersBar({ countries, languages, onChange }: Props) {
  const [access, setAccess] = useState<"all" | "free" | "paid">("all");
  const [country, setCountry] = useState("all");
  const [language, setLanguage] = useState("all");

  function updateFilters(newFilters: Partial<typeof state>) {
    const updated = {
      access,
      country,
      language,
      ...newFilters,
    };

    setAccess(updated.access);
    setCountry(updated.country);
    setLanguage(updated.language);

    onChange(updated);
  }

  const state = { access, country, language };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "20px",
        padding: "16px",
        background: "#111827",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* ACCESS FILTER */}
      <div style={{ display: "flex", gap: "8px" }}>
        {["all", "free", "paid"].map((value) => {
          const isActive = access === value;

          return (
            <button
              key={value}
              onClick={() =>
                updateFilters({ access: value as "all" | "free" | "paid" })
              }
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                background: isActive
                  ? value === "free"
                    ? "rgba(34,197,94,0.15)"
                    : value === "paid"
                    ? "rgba(245,158,11,0.15)"
                    : "#3B82F6"
                  : "rgba(255,255,255,0.05)",
                color: isActive
                  ? value === "free"
                    ? "#22C55E"
                    : value === "paid"
                    ? "#F59E0B"
                    : "#FFFFFF"
                  : "#CBD5E1",
              }}
            >
              {value.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* LANGUAGE FILTER */}
      <select
        value={language}
        onChange={(e) => updateFilters({ language: e.target.value })}
        style={{
          background: "#0F172A",
          color: "#FFFFFF",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          padding: "6px 10px",
          fontSize: "13px",
        }}
      >
        <option value="all">All languages</option>
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>

      {/* COUNTRY FILTER */}
      <select
        value={country}
        onChange={(e) => updateFilters({ country: e.target.value })}
        style={{
          background: "#0F172A",
          color: "#FFFFFF",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          padding: "6px 10px",
          fontSize: "13px",
        }}
      >
        <option value="all">All countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* RESET */}
      <button
        onClick={() => {
          setAccess("all");
          setCountry("all");
          setLanguage("all");
          onChange({
            access: "all",
            country: "all",
            language: "all",
          });
        }}
        style={{
          marginLeft: "auto",
          padding: "6px 12px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.05)",
          color: "#CBD5E1",
          border: "none",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        Reset
      </button>
    </div>
  );
}   