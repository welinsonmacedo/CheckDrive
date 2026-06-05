export function encodeItemTitle(title: string, mask: string | null, options: string[] = []): string {
  let encoded = title;
  if (mask && mask !== 'none') {
    encoded += `::mask=${mask}`;
  }
  if (options && options.length > 0) {
    encoded += `::options=${options.join('|')}`;
  }
  return encoded;
}

export function decodeItemTitle(rawTitle: string): { title: string, mask: string | null, options: string[] } {
  let title = rawTitle;
  let mask: string | null = null;
  let options: string[] = [];

  const optionsSplit = title.split('::options=');
  if (optionsSplit.length > 1) {
    title = optionsSplit[0];
    options = optionsSplit[1].split('|').filter(Boolean);
  }

  const maskSplit = title.split('::mask=');
  if (maskSplit.length > 1) {
    title = maskSplit[0];
    mask = maskSplit[1];
  }

  return { title, mask, options };
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
     return (parseInt(numeric, 10) / 100).toFixed(2);
  }
  if (mask === 'integer') {
     return value.replace(/[^0-9]/g, '');
  }
  return value;
}
