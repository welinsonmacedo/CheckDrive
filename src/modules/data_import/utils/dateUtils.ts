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

export const MONTH_SHORT_PT: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Abr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
};

export interface ParsedRecordDate {
  year: string;        // "2026"
  month: string;       // "07"
  day: string;         // "15"
  monthName: string;   // "Julho"
  monthShort: string;  // "Jul"
  isoDate: string;     // "2026-07-15"
  formattedBr: string; // "15/07/2026"
  formattedDayMonth: string; // "15/07"
  monthYear: string;   // "07/2026"
  yearMonth: string;   // "2026-07"
  weekNum: number;     // 28
  weekKey: string;     // "2026-W28"
  weekLabel: string;   // "Sem 28/2026"
  quinzenaKey: string; // "2026-07-Q1" | "2026-07-Q2"
  quinzenaLabel: string; // "1ª Quinzena Jul/26"
  timestamp: number;
  dateObj: Date;
}

export function getWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
}

/**
 * Extracts a complete ParsedRecordDate with year, month, day, week, quinzena, and iso formats.
 */
export function parseRecordFullDate(dateVal?: any): ParsedRecordDate | null {
  if (!dateVal) return null;

  let y = "";
  let m = "";
  let d = "";

  // 1. Handle Date instance
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    y = String(dateVal.getFullYear());
    m = String(dateVal.getMonth() + 1).padStart(2, "0");
    d = String(dateVal.getDate()).padStart(2, "0");
  } else {
    const s = String(dateVal).trim();
    if (!s || s === "undefined" || s === "null" || s === "-") return null;

    // 2. Handle pure numbers: Excel serial number or Unix timestamp
    if (/^\d+(\.\d+)?$/.test(s)) {
      const num = Number(s);
      if (num > 25000 && num < 70000) {
        const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(dateObj.getTime())) {
          y = String(dateObj.getUTCFullYear());
          m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
          d = String(dateObj.getUTCDate()).padStart(2, "0");
        }
      } else if (num > 1000000000000) {
        const dateObj = new Date(num);
        if (!isNaN(dateObj.getTime())) {
          y = String(dateObj.getFullYear());
          m = String(dateObj.getMonth() + 1).padStart(2, "0");
          d = String(dateObj.getDate()).padStart(2, "0");
        }
      } else if (num > 1000000000 && num < 3000000000) {
        const dateObj = new Date(num * 1000);
        if (!isNaN(dateObj.getTime())) {
          y = String(dateObj.getFullYear());
          m = String(dateObj.getMonth() + 1).padStart(2, "0");
          d = String(dateObj.getDate()).padStart(2, "0");
        }
      }
    }

    if (!y || !m) {
      // Clean string
      const datePart = s.split(/[ T,]/)[0].trim();
      const normalized = datePart.replace(/\./g, "/");
      const separator = normalized.includes("-") ? "-" : normalized.includes("/") ? "/" : null;

      if (separator) {
        const parts = normalized.split(separator).map((p) => p.trim()).filter(Boolean);

        // Case A: Year first (e.g. 2026-07-15, 2026-07, 2026/07/15)
        if (/^\d{4}$/.test(parts[0])) {
          y = parts[0];
          let rawMonth = parts[1] ? parts[1] : "01";
          m = rawMonth.padStart(2, "0");
          if (PORTUGUESE_MONTH_MAP[rawMonth.toLowerCase()]) {
            m = PORTUGUESE_MONTH_MAP[rawMonth.toLowerCase()];
          }
          d = parts[2] ? parts[2].padStart(2, "0") : "01";
        }

        // Case B: Year last (e.g. 15/07/2026, 07/2026, 15-07-2026, 15/07/26)
        const lastPart = parts[parts.length - 1];
        if (!y && /^\d{2,4}$/.test(lastPart)) {
          let yearCandidate = lastPart;
          if (yearCandidate.length === 2) {
            yearCandidate = Number(yearCandidate) < 50 ? `20${yearCandidate}` : `19${yearCandidate}`;
          }
          if (yearCandidate.length === 4) {
            y = yearCandidate;
            if (parts.length === 3) {
              d = parts[0].padStart(2, "0");
              let rawMonth = parts[1];
              m = (rawMonth || "01").padStart(2, "0");
              if (PORTUGUESE_MONTH_MAP[rawMonth?.toLowerCase()]) {
                m = PORTUGUESE_MONTH_MAP[rawMonth.toLowerCase()];
              }
            } else if (parts.length === 2) {
              d = "01";
              let rawMonth = parts[0];
              m = (rawMonth || "01").padStart(2, "0");
              if (PORTUGUESE_MONTH_MAP[rawMonth?.toLowerCase()]) {
                m = PORTUGUESE_MONTH_MAP[rawMonth.toLowerCase()];
              }
            }
          }
        }
      }

      // Case C: Standard JS Date fallback
      if (!y || !m) {
        const dateObj = new Date(s);
        if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() > 1990 && dateObj.getFullYear() < 2100) {
          y = String(dateObj.getFullYear());
          m = String(dateObj.getMonth() + 1).padStart(2, "0");
          d = String(dateObj.getDate()).padStart(2, "0");
        }
      }
    }
  }

  if (!y || !m || Number(m) < 1 || Number(m) > 12) return null;
  d = d ? d.padStart(2, "0") : "01";
  if (Number(d) < 1 || Number(d) > 31) d = "01";

  const isoDate = `${y}-${m}-${d}`;
  const dateObj = new Date(`${isoDate}T12:00:00.000Z`);
  const monthName = MONTH_NAMES_PT[m] || m;
  const monthShort = MONTH_SHORT_PT[m] || m;
  const weekNum = getWeekNumber(dateObj);
  const weekKey = `${y}-W${String(weekNum).padStart(2, "0")}`;
  const weekLabel = `Sem ${String(weekNum).padStart(2, "0")}/${y.substring(2)}`;
  const isQ1 = Number(d) <= 15;
  const quinzenaKey = `${y}-${m}-${isQ1 ? "Q1" : "Q2"}`;
  const quinzenaLabel = `${isQ1 ? "1ª" : "2ª"} Quin. ${monthShort}/${y.substring(2)}`;

  return {
    year: y,
    month: m,
    day: d,
    monthName,
    monthShort,
    isoDate,
    formattedBr: `${d}/${m}/${y}`,
    formattedDayMonth: `${d}/${m}`,
    monthYear: `${m}/${y}`,
    yearMonth: `${y}-${m}`,
    weekNum,
    weekKey,
    weekLabel,
    quinzenaKey,
    quinzenaLabel,
    timestamp: dateObj.getTime(),
    dateObj,
  };
}

/**
 * Parses any date string/number/Date format (ISO, BR DD/MM/YYYY, MM/YYYY, YYYY-MM, YYYY/MM/DD, date with time, Excel serial, timestamp)
 * into a normalized { month: "MM", year: "YYYY" } object.
 */
export function parseRecordMonthYear(dateVal?: any): { month: string; year: string } | null {
  const full = parseRecordFullDate(dateVal);
  if (!full) return null;
  return { month: full.month, year: full.year };
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
