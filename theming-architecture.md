# Theming Architecture

## Core Insight

Themes are **not CSS variable swaps**. They are complete component tree replacements.
Each theme is a full set of page templates that consume the same data API but render entirely differently.

Reference: Dukaan's Laurissa (minimal pet store) vs Enigma (dark editorial bookstore) —
same product data, completely different nav structure, hero, cards, footer.

---

## Theme = Full Set of Page Templates

```
store-customer/
  themes/
    minimal/
      Layout.tsx
      HomePage.tsx
      CategoryPage.tsx
      ProductPage.tsx
    boutique/
      Layout.tsx
      HomePage.tsx
      CategoryPage.tsx
      ProductPage.tsx
    editorial/
      Layout.tsx
      ...
```

Every theme implements the same props/data interface. Pages pick the active theme at render time:

```tsx
// app/[...slug]/page.tsx
const store = await getStoreByDomain(domain)
const { CategoryPage } = await import(`@/themes/${store.themeId}`)

return <CategoryPage products={products} filters={filters} />
```

---

## What Each Theme Controls

| Layer           | What changes                                      |
|-----------------|---------------------------------------------------|
| CSS variables   | Colors, fonts, border radius                      |
| Component tree  | Nav type, hero layout, card shape, footer columns |
| Feature flags   | Show/hide filters, wishlist, announcement bar     |
| Spacing/density | Compact vs airy layouts                           |

---

## DB Schema Addition Needed

```prisma
model Store {
  // existing fields...
  themeId     String  @default("minimal")  // 'minimal' | 'boutique' | 'editorial'
  themeConfig Json    // { primary, bg, font, radius, ... }
}
```

---

## Changing Theme = One Field Update

Updating `store.themeId` in the admin panel is all it takes.
On next page load (ISR), the new component tree renders with the same products.
No rebuild needed.

---

## Static Pages Strategy

| Page            | Strategy                             |
|-----------------|--------------------------------------|
| Home / Category | ISR (`revalidate = 60`)              |
| Product detail  | ISR + on-demand revalidation         |
| Cart / Checkout | Client-side only (`'use client'`)    |
| Order confirm   | Client-side (after WhatsApp flow)    |
| Theme / layout  | Baked into static page at SSR time   |

On-demand revalidation: when a store owner updates a product in `store-admin`,
call `revalidatePath()` to invalidate the relevant ISR pages.

---

## Partner / White-label Sites

Partners who bring their own frontend skip the theme system entirely.
They call the **Storefront API** directly:

```
GET  /storefront/v1/products
GET  /storefront/v1/categories
POST /storefront/v1/checkout/initiate
```

Auth via `X-API-Key` header. API keys are scoped per store, managed from `store-admin`.

---

## Build Order (when we get here)

1. Define theme interface (shared props/data contract all themes must satisfy)
2. Build `minimal` theme as the default
3. Add `themeId` + `themeConfig` to Store model
4. Wire up dynamic theme import in page routes
5. Add theme picker to `store-admin`
6. Build additional themes as needed
