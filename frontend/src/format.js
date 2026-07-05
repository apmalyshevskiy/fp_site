const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatPrice(n) {
  return nf.format(n);
}
