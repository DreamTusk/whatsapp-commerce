export function buildCriteriaWhere(criteria: any, storeId: string) {
  const filters: any[] = criteria?.filters ?? [];
  const match: string = criteria?.match ?? 'all';

  const conditions: object[] = filters.flatMap((f: any): object[] => {
    const { field, operator, value } = f;
    switch (field) {
      case 'category_id': return [{ categoryId: value }];
      case 'brand_id':    return [{ brandId: value }];
      case 'in_stock':    return [{ inStock: value === true || value === 'true' }];
      case 'name':        return [{ name: { contains: value, mode: 'insensitive' } }];
      case 'price': {
        const num = Number(value);
        const opMap: Record<string, object> = {
          lt: { lt: num }, lte: { lte: num }, gt: { gt: num }, gte: { gte: num }, eq: { equals: num },
        };
        return opMap[operator] ? [{ sellingPrice: opMap[operator] }] : [];
      }
      default: return [];
    }
  });

  return {
    storeId,
    isActive: true,
    ...(conditions.length > 0
      ? match === 'any' ? { OR: conditions } : { AND: conditions }
      : {}),
  };
}
