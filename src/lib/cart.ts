export function getCartTotals(lines: { qty: number; price: number }[]) {
  return lines.reduce(
    (acc, line) => ({
      itemCount: acc.itemCount + line.qty,
      total: acc.total + line.qty * line.price,
    }),
    { itemCount: 0, total: 0 },
  );
}
