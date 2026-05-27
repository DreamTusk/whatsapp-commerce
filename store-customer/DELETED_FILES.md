# Deleted Files Log

## Deletion Date
2026-05-27

---

## 1. `app/wishlist/page.tsx`

**What it was:** A standalone `/wishlist` route — a full page that listed the authenticated user's saved products with View and Remove actions.

**Why deleted:** Wishlist functionality was moved into the Account page (`/account?tab=wishlist`). All nav links, header icons, and bottom nav now point to `/account?tab=wishlist`. The standalone `/wishlist` route was no longer reachable from any part of the UI.

---

## 2. `app/orders/page.tsx`

**What it was:** A standalone `/orders` route — a full page listing the authenticated user's orders with status badges, dates, and links to individual order detail pages (`/orders/[id]`).

**Why deleted:** Orders functionality was moved into the Account page (`/account?tab=orders`). All nav links and bottom nav now point to `/account?tab=orders`. The standalone `/orders` route was no longer reachable.

> Note: `app/orders/[id]/page.tsx` (individual order detail view) was **kept** — it is still linked from order cards inside the account page.

---

## 3. `components/add-to-cart-button.tsx`

**What it was:** A standalone `<AddToCartButton>` component that rendered a price display + an "Add to cart" / "Added ✓ View cart" button pair. It required `productId` and `price` as props. It did **not** support guest cart — it called the API directly and required auth.

**Why deleted:** The product detail page (`product-detail-client.tsx`) has its own inline `AddToCartBtn` component that handles both guest cart and authenticated cart. The standalone component was never imported anywhere in the codebase.

---

## 4. `components/wishlist-button.tsx`

**What it was:** A standalone `<WishlistButton>` component — a small icon button that toggled wishlist save/remove for a product. It did not track the initial wishlist state on mount (no fetch), so it always started in an "unsaved" state.

**Why deleted:** The product detail page (`product-detail-client.tsx`) has its own inline wishlist toggle that correctly fetches the initial wishlist state on mount. The standalone component was never imported anywhere in the codebase.

---

## 5. `components/header-actions.tsx`

**What it was:** An early version of the top navigation action icons — cart badge, orders link (pointing to `/orders`), wishlist link (pointing to `/wishlist`), and a Sign in button. Styled using a `theme.headerText` color from `@/lib/theme`.

**Why deleted:** Replaced by `store-header-client.tsx`, which is the active header component used across the app. `header-actions.tsx` was never imported anywhere. It also contained stale links (`/orders`, `/wishlist`) that no longer exist as standalone routes.
