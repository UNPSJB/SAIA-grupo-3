export async function loadAllPages<T>(
  load: (page: number) => Promise<{ items: T[]; pages: number }>,
): Promise<{ items: T[] }> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const data = await load(page);
    items.push(...data.items);
    if (page >= data.pages) break;
  }
  return { items };
}
