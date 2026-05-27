# Roadmap

## Dev Notes
- **OTP Bypass** — OTP `123456` is always accepted in all flows (customer login, admin email verify, forgot password) until development is complete. Remove before production.

- [ ] **Categories & Products** — backend APIs, admin UI, customer storefront
- [ ] **Orders** — backend APIs, admin UI, customer order tracking
- [ ] **Payments & Invoices** — payment initiation, webhook, invoice generation
- [ ] **Email Service (Zepto Mail)** — OTP, order confirmations, invoices, status updates
- [ ] **Dashboard & Stats** — stats cards, charts, recent orders
- [ ] **User Management** — list users, toggle status
- [ ] **Landing Page & Waitlist** — marketing page, early access form
- [ ] **Polish & Production** — skeletons, empty states, mobile, prod configs

- [ ] **Customer App Customization** — admin can customize the banners, themes and custom invoice template

## Customer App — Store Admin Customization Options
> Currently all values are static in `store-customer/lib/theme.ts`. These will eventually be stored in the `Store` DB record and editable from the admin portal settings page.

### Theme & Branding
- Primary color / color theme (preset palette or custom hex)
- Font family (Inter, Poppins, Nunito, Roboto, Geist, etc.)
- Store logo
- Store banner / hero image (carousel on home page)
- Announcement bar text (e.g. "Free delivery above ₹500")

### Product Listing
- Grid columns (2 or 3 per row)
- Product card style (card with shadow vs minimal flat)
- Show / hide out-of-stock products

### Features
- Wishlist — on / off
- Search — on / off
- Product reviews — on / off (future)

### Invoice
- Logo visible on invoice — on / off
- Custom footer text (GST number, return policy, tagline, etc.)
- Invoice template style

### Business Rules *(already in DB, needs admin UI)*
- Minimum order amount
- Delivery radius
- Store open / close hours