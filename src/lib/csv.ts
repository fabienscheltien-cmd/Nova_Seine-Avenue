type Cell = string | number | null | undefined;

/**
 * CSV pour Excel en français : point-virgule, BOM UTF-8, retours Windows.
 * Les valeurs commençant par = + - @ sont neutralisées pour qu'Excel ne les exécute pas comme formules
 * (un occupant contrôle son prénom, son entreprise…).
 */
export function toCsv(rows: Cell[][]): string {
  const esc = (v: Cell) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}
