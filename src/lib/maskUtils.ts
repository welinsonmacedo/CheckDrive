export function encodeItemTitle(title: string, mask: string | null): string {
  if (!mask || mask === 'none') return title;
  return `${title}::mask=${mask}`;
}

export function decodeItemTitle(rawTitle: string): { title: string, mask: string | null } {
  if (rawTitle.includes('::mask=')) {
    const parts = rawTitle.split('::mask=');
    return { title: parts[0], mask: parts[1] };
  }
  return { title: rawTitle, mask: null };
}

export function applyNumberMask(value: string, mask: string | null): string {
  if (!value) return '';
  if (!mask || mask === 'none') return value;

  // Only allow numbers and comma/dot
  let numeric = value.replace(/[^0-9]/g, '');
  if (!numeric) return '';

  if (mask === 'decimal' || mask === 'currency') {
    // Treat as cents: 10050 -> 100,50
    const val = parseInt(numeric, 10);
    if (isNaN(val)) return '';
    const formatted = (val / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return mask === 'currency' ? `R$ ${formatted}` : formatted;
  }
  
  if (mask === 'integer') {
    return parseInt(numeric, 10).toString();
  }

  return value;
}

export function parseMaskedValue(value: string, mask: string | null): string {
  if (!mask || mask === 'none') {
    // Swap comma with dot for native number format just in case
    return value.replace(',', '.');
  }
  if (mask === 'decimal' || mask === 'currency') {
     let numeric = value.replace(/[^0-9]/g, '');
     if (!numeric) return '';
     return (parseInt(numeric, 10) / 100).toString();
  }
  if (mask === 'integer') {
     return value.replace(/[^0-9]/g, '');
  }
  return value;
}
