# TODO

## Backend (`backend-apis`)

### Categories Module
- [ ] GET /api/admin/categories
- [ ] POST /api/admin/categories
- [ ] PUT /api/admin/categories/:id
- [ ] DELETE /api/admin/categories/:id

### Products Module
- [ ] GET /api/admin/products
- [ ] POST /api/admin/products
- [ ] PUT /api/admin/products/:id
- [ ] DELETE /api/admin/products/:id

### Orders Module
- [ ] POST /api/admin/orders — place order
- [ ] GET /api/admin/orders — list orders
- [ ] GET /api/admin/orders/:id — order detail
- [ ] PUT /api/admin/orders/:id/status — update order status

### Payment
- [ ] POST /api/payment/initiate — initiate payment
- [ ] POST /api/payment/webhook — payment status callback

### Invoice
- [ ] Generate invoice and
- [ ] Send invoice to customer via email

### User Management Module
- [ ] GET /api/admin/users — list store users
- [ ] PUT /api/admin/users/:id/status — update user status (active / inactive)

---

## Store Admin (`store-admin`)



### Categories Page (`/dashboard/categories`)
- [ ] List categories
- [ ] Create category
- [ ] Update category
- [ ] Delete category

### Products Page (`/dashboard/products`)
- [ ] List products
- [ ] Create product
- [ ] Update product
- [ ] Delete product

### Orders Page (`/dashboard/orders`)
- [ ] List orders
- [ ] View order detail
- [ ] Update order status

### Dashboard Page (`/dashboard`)
- [ ] Stats cards — today's orders, revenue, pending orders, total customers
- [ ] Bar chart — orders this week
- [ ] Recent orders table (last 10)

### Users Page (`/dashboard/users`)
- [ ] List store users
- [ ] Toggle user status (active / inactive)

### Settings Page (`/dashboard/settings`)
- [ ] View store details
- [ ] Update store name, logo, address
- [ ] Update min order amount, delivery radius
- [ ] Update WhatsApp config (phone number ID, access token)
- [ ] Delete store

---

## Store Customer (`store-customer`)

### Categories
- [ ] List categories

### Products
- [ ] List products
- [ ] List products by category

### Cart
- [ ] Add product to cart
- [ ] Remove product from cart
- [ ] Update quantity
- [ ] View cart

### Checkout
- [ ] Enter delivery address
- [ ] Select payment method
- [ ] Place order

### Payment
- [ ] Initiate payment
- [ ] Payment success / failure handling

### Order Status
- [ ] View order status page

