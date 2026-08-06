const PORTUGUESE_MONTH_MAP: Record<string, string> = {
  jan: "01",
  janeiro: "01",
  fev: "02",
  fevereiro: "02",
  mar: "03",
  marco: "03",
  março: "03",
  abr: "04",
  abril: "04",
  mai: "05",
  maio: "05",
  jun: "06",
  junho: "06",
  jul: "07",
  julho: "07",
  ago: "08",
  agosto: "08",
  set: "09",
  setembro: "09",
  out: "10",
  outubro: "10",
  nov: "11",
  novembro: "11",
  dez: "12",
  dezembro: "12",
};

export const MONTH_NAMES_PT: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

/**
 * Parses any date string format (ISO, BR DD/MM/YYYY, MM/YYYY, YYYY-MM, YYYY/MM/DD, date with time, etc.)
 * into a normalized { month: "MM", year: "YYYY" } object.
 */
export function parseRecordMonthYear(dateStr?: string): { month: string; year: string } | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;

  // Extract date portion before space or T
  const datePart = s.split(/[ T]/)[0].replace(/,/g, "").trim();
  const normalized = datePart.replace(/\./g, "/");

  const separator = normalized.includes("-") ? "-" : normalized.includes("/") ? "/" : null;

  if (separator) {
    const parts = normalized.split(separator).map((p) => p.trim());

    // Case 1: Year first (e.g. 2026-07-15, 2026-07, 2026/07/15, 2026/07)
    if (/^\d{4}$/.test(parts[0])) {
      const year = parts[0];
      let month = parts[1] ? parts[1].padStart(2, "0") : "01";
      if (PORTUGUESE_MONTH_MAP[month.toLowerCase()]) {
        month = PORTUGUESE_MONTH_MAP[month.toLowerCase()];
      }
      if (/^\d{2}$/.test(month) && Number(month) >= 1 && Number(month) <= 12) {
        return { year, month };
      }
    }

    // Case 2: Year last (e.g. 15/07/2026, 07/2026, 15-07-2026, 07-2026, 15/07/26)
    const lastPart = parts[parts.length - 1];
    if (/^\d{2,4}$/.test(lastPart)) {
      let year = lastPart;
      if (year.length === 2) {
        year = Number(year) < 50 ? `20${year}` : `19${year}`;
      }
      if (year.length === 4) {
        let rawMonth = parts.length === 3 ? parts[1] : parts[0];
        let month = rawMonth.padStart(2, "0");
        if (PORTUGUESE_MONTH_MAP[rawMonth.toLowerCase()]) {
          month = PORTUGUESE_MONTH_MAP[rawMonth.toLowerCase()];
        }
        if (/^\d{2}$/.test(month) && Number(month) >= 1 && Number(month) <= 12) {
          return { year, month };
        }
      }
    }
  }

  // Case 3: Standard JS Date fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return { year, month };
  }

  return null;
}

/**
 * Checks if a record's date matches a period string (e.g. "07/2026", "m:07/2026", "30", "custom", "0").
 */
export function matchesPeriod(
  recordDateStr: string | undefined,
  selectedPeriod: string,
  customMonth?: string
): boolean {
  if (!selectedPeriod || selectedPeriod === "0") return true; // Todo o histórico

  const parsedRecord = parseRecordMonthYear(recordDateStr);

  // Custom month picker (e.g. customMonth = "2026-07")
  if (selectedPeriod === "custom" && customMonth) {
    const parsedCustom = parseRecordMonthYear(customMonth);
    if (!parsedCustom || !parsedRecord) return false;
    return parsedRecord.month === parsedCustom.month && parsedRecord.year === parsedCustom.year;
  }

  // Specific month string (e.g. "m:07/2026", "07/2026", "07-2026", "2026-07")
  if (
    selectedPeriod.startsWith("m:") ||
    selectedPeriod.includes("/") ||
    (selectedPeriod.includes("-") && selectedPeriod.length <= 7)
  ) {
    const monthStr = selectedPeriod.startsWith("m:") ? selectedPeriod.substring(2) : selectedPeriod;
    const parsedTarget = parseRecordMonthYear(monthStr);
    if (!parsedTarget || !parsedRecord) return false;
    return parsedRecord.month === parsedTarget.month && parsedRecord.year === parsedTarget.year;
  }

  // Specific year string (e.g. "y:2026" or "2026")
  if (
    selectedPeriod.startsWith("y:") ||
    (/^\d{4}$/.test(selectedPeriod) && Number(selectedPeriod) > 1900)
  ) {
    const targetYear = selectedPeriod.startsWith("y:") ? selectedPeriod.substring(2) : selectedPeriod;
    if (!parsedRecord) return false;
    return parsedRecord.year === targetYear;
  }

  // Relative days filter (e.g. "30", "60", "90", "365")
  const days = Number(selectedPeriod);
  if (!isNaN(days) && days > 0) {
    if (!recordDateStr) return false;
    if (parsedRecord) {
      const rDate = new Date(`${parsedRecord.year}-${parsedRecord.month}-01`).getTime();
      const now = new Date().getTime();
      const diffDays = (now - rDate) / (1000 * 3600 * 24);
      if (diffDays > days + 31) return false;
    } else {
      const rDate = new Date(recordDateStr).getTime();
      if (isNaN(rDate)) return false;
      const now = new Date().getTime();
      const diffDays = (now - rDate) / (1000 * 3600 * 24);
      if (diffDays > days) return false;
    }
  }

  return true;
}

/**
 * Returns a human-readable period label for headers and exports.
 */
export function getPeriodLabel(selectedPeriod: string, customMonth?: string): string {
  if (selectedPeriod === "custom") {
    if (!customMonth) return "Mês Selecionado";
    const parsed = parseRecordMonthYear(customMonth);
    if (!parsed) return customMonth;
    const name = MONTH_NAMES_PT[parsed.month] || parsed.month;
    return `Mês ${parsed.month}/${parsed.year} (${name})`;
  }
  if (
    selectedPeriod.startsWith("m:") ||
    selectedPeriod.includes("/") ||
    (selectedPeriod.includes("-") && selectedPeriod.length <= 7)
  ) {
    const my = selectedPeriod.startsWith("m:") ? selectedPeriod.substring(2) : selectedPeriod;
    const parsed = parseRecordMonthYear(my);
    if (parsed) {
      const name = MONTH_NAMES_PT[parsed.month] || parsed.month;
      return `Mês ${parsed.month}/${parsed.year} (${name})`;
    }
    return my;
  }
  const days = Number(selectedPeriod);
  if (days === 0) return "Todo o Histórico";
  if (days === 365) return "Este Ano (365d)";
  if (!isNaN(days) && days > 0) return `Últimos ${days} dias`;
  return selectedPeriod;
}
