import * as React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Circle,
  Line,
} from '@react-pdf/renderer';

export interface InvoiceItem {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface InvoiceData {
  orderNumber: string;
  orderDate: Date;
  storeName: string;
  storeLogo: string | null;
  storePhone: string | null;
  storeUrl: string | null;
  storeSupportEmail: string | null;
  primaryColor: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string | null;
  items: InvoiceItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
}

const BORDER = '#e2e2e2';
const MUTED = '#767676';
const DARK = '#1f2933';

const STATUS_COLOR: Record<string, string> = {
  PAID: '#16a34a',
  FAILED: '#dc2626',
  PENDING: '#d97706',
  REFUNDED: '#2563eb',
};

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: 'Helvetica', color: DARK },
  frame: { flex: 1, margin: 16, borderWidth: 1.5 },
  bar: { height: 12 },
  content: { flex: 1, padding: 28, flexDirection: 'column' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'column', alignItems: 'flex-start' },
  logo: { width: 54, height: 54, objectFit: 'contain', marginBottom: 6 },
  storeName: { fontSize: 20, fontWeight: 700 },
  invoiceTitle: { fontSize: 26, fontWeight: 700, letterSpacing: 0.5 },

  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 },
  metaLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 11, fontWeight: 700, marginTop: 2 },
  metaDivider: { width: 1, height: 28, backgroundColor: BORDER, marginHorizontal: 14 },

  partiesRow: { flexDirection: 'row', marginTop: 26, marginBottom: 18 },
  partyCol: { flex: 1 },
  partiesDivider: { width: 1, backgroundColor: BORDER, marginHorizontal: 32 },
  sectionLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  partyName: { fontSize: 10, fontWeight: 700 },
  partyLine: { fontSize: 9.5, marginTop: 2 },

  tableHeaderRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 },
  tableHeaderText: { fontSize: 8, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  colIndex: { width: 48, fontSize: 9.5 },
  colName: { flex: 3, fontSize: 9.5 },
  colQty: { flex: 1, textAlign: 'right', fontSize: 9.5 },
  colPrice: { flex: 1, textAlign: 'right', fontSize: 9.5 },
  colSubtotal: { flex: 1, textAlign: 'right', fontSize: 9.5 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 22 },
  paymentLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  paymentValueRow: { flexDirection: 'row', alignItems: 'center' },
  paymentMethodText: { fontSize: 11, fontWeight: 700 },
  paymentDivider: { fontSize: 11, color: BORDER, marginHorizontal: 8 },
  paymentStatusText: { fontSize: 11, fontWeight: 700 },

  totalsBox: { width: 190 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { fontSize: 9, color: MUTED },
  totalsValue: { fontSize: 9.5 },
  totalsDivider: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 6, marginBottom: 6 },
  totalDueLabel: { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalDueValue: { fontSize: 16, fontWeight: 700 },

  footer: { marginTop: 'auto', paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER },
  footerHeadRow: { flexDirection: 'row', alignItems: 'center' },
  bagBadge: { width: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  footerThanks: { fontSize: 8.5, fontWeight: 700 },
  footerSub: { fontSize: 7.5, marginTop: 2, color: MUTED },
  contactRow: { flexDirection: 'row', marginTop: 14 },
  contactCol: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  contactIcon: { marginRight: 6 },
  contactValue: { fontSize: 8.5, fontWeight: 700 },
  contactCaption: { fontSize: 7.5, marginTop: 1, color: MUTED },
});

// PDF's standard Helvetica font has no glyph for ₹ (Unicode 2010, after base-14 fonts
// were fixed) — it renders as a broken superscript character. "Rs." avoids that.
const formatMoney = (value: number) => `Rs. ${value.toFixed(2)}`;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatInvoiceDate = (date: Date) =>
  `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

export function formatStoreUrl(domain: string | null): string | null {
  if (!domain) return null;
  const host = domain.endsWith('.localhost') ? domain.replace(/\.localhost$/, '.dreambiz.app') : domain;
  return `https://${host}`;
}

// Storefront checkout stores a pre-combined full address string in `address`
// (see store-customer checkout-client.tsx buildAddress) alongside the same
// door_no/street already broken out — joining every field for CUSTOMER orders
// would duplicate door_no/street/city/state/pincode. Manual admin orders use
// `address` as a genuinely distinct area/landmark field, so those still join.
export function formatDeliveryAddress(order: {
  source: string;
  doorNo: string | null;
  street: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}): string | null {
  // Split door/street onto their own line and locality/city/state/pincode onto
  // the next, rather than one long comma-joined run that wraps unpredictably.
  const line1 = [order.doorNo, order.street].filter((p): p is string => !!p?.trim()).join(', ');
  const line2Parts = order.source === 'CUSTOMER'
    ? [order.city, order.state, order.pincode]
    : [order.address, order.city, order.state, order.pincode];
  const line2 = line2Parts.filter((p): p is string => !!p?.trim()).join(', ');
  const lines = [line1, line2].filter((l) => l.length > 0);
  return lines.length ? lines.join('\n') : null;
}

// --- small hand-drawn icon set — @react-pdf/renderer can't render DOM icon
// libraries (e.g. @deemlol/next-icons), so these are built from Svg primitives.

function svgIcon(size: number, children: React.ReactNode): React.ReactElement {
  return React.createElement(Svg, { viewBox: '0 0 24 24', width: size, height: size }, children);
}

function iconBag(color: string, size = 13) {
  return svgIcon(size, [
    React.createElement(Rect, { key: 'r', x: 4, y: 8, width: 16, height: 13, rx: 2, stroke: color, fill: 'none', strokeWidth: 1.8 }),
    React.createElement(Path, { key: 'p', d: 'M8,8 V6 a4,4 0 0 1 8,0 V8', stroke: color, fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round' }),
  ]);
}

function iconPhone(color: string, size = 13) {
  return svgIcon(size, [
    React.createElement(Rect, { key: 'r', x: 8, y: 2, width: 8, height: 20, rx: 3, stroke: color, fill: 'none', strokeWidth: 1.8 }),
    React.createElement(Circle, { key: 'c', cx: 12, cy: 18, r: 1, fill: color }),
  ]);
}

function iconGlobe(color: string, size = 13) {
  return svgIcon(size, [
    React.createElement(Circle, { key: 'c', cx: 12, cy: 12, r: 9, stroke: color, fill: 'none', strokeWidth: 1.6 }),
    React.createElement(Path, { key: 'e', d: 'M12,3 C8,7 8,17 12,21 C16,17 16,7 12,3 Z', stroke: color, fill: 'none', strokeWidth: 1.6 }),
    React.createElement(Line, { key: 'l', x1: 3, y1: 12, x2: 21, y2: 12, stroke: color, strokeWidth: 1.6 }),
  ]);
}

function iconMail(color: string, size = 13) {
  return svgIcon(size, [
    React.createElement(Rect, { key: 'r', x: 2, y: 5, width: 20, height: 14, rx: 2, stroke: color, fill: 'none', strokeWidth: 1.8 }),
    React.createElement(Path, { key: 'p', d: 'M3,6 L12,13 L21,6', stroke: color, fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  ]);
}

export function buildInvoiceDocument(data: InvoiceData) {
  const topBar = React.createElement(View, { style: [styles.bar, { backgroundColor: data.primaryColor }], key: 'top-bar' });
  const bottomBar = React.createElement(View, { style: [styles.bar, { backgroundColor: data.primaryColor }], key: 'bottom-bar' });

  const logo = data.storeLogo
    ? React.createElement(Image, { src: data.storeLogo, style: styles.logo, key: 'logo' })
    : null;

  const header = React.createElement(
    View,
    { style: styles.headerRow, key: 'header' },
    React.createElement(
      View,
      { style: styles.brandRow, key: 'brand' },
      logo,
      React.createElement(Text, { style: [styles.storeName, { color: data.primaryColor }] }, data.storeName),
    ),
    React.createElement(Text, { style: [styles.invoiceTitle, { color: data.primaryColor }] }, 'INVOICE'),
  );

  const metaRow = React.createElement(
    View,
    { style: styles.metaRow, key: 'meta' },
    React.createElement(
      View,
      { key: 'invoice-no' },
      React.createElement(Text, { style: styles.metaLabel }, 'Invoice No.'),
      React.createElement(Text, { style: styles.metaValue }, data.orderNumber),
    ),
    React.createElement(View, { style: styles.metaDivider, key: 'divider' }),
    React.createElement(
      View,
      { key: 'date' },
      React.createElement(Text, { style: styles.metaLabel }, 'Date'),
      React.createElement(Text, { style: styles.metaValue }, formatInvoiceDate(data.orderDate)),
    ),
  );

  const billTo = React.createElement(
    View,
    { style: styles.partyCol, key: 'bill-to' },
    React.createElement(Text, { style: [styles.sectionLabel, { color: data.primaryColor }], key: 'label' }, 'Bill To'),
    React.createElement(Text, { style: styles.partyName, key: 'name' }, data.customerName),
    data.customerPhone ? React.createElement(Text, { style: styles.partyLine, key: 'phone' }, data.customerPhone) : null,
    data.customerEmail ? React.createElement(Text, { style: styles.partyLine, key: 'email' }, data.customerEmail) : null,
  );

  const addressLines = (data.deliveryAddress ?? 'Store pickup').split('\n');
  const shipTo = React.createElement(
    View,
    { style: styles.partyCol, key: 'ship-to' },
    React.createElement(Text, { style: [styles.sectionLabel, { color: data.primaryColor }], key: 'label' }, 'Ship To'),
    ...addressLines.map((line, i) => React.createElement(Text, { style: styles.partyLine, key: `line-${i}` }, line)),
  );

  const parties = React.createElement(
    View,
    { style: styles.partiesRow, key: 'parties' },
    billTo,
    React.createElement(View, { style: styles.partiesDivider, key: 'divider' }),
    shipTo,
  );

  const tableHeader = React.createElement(
    View,
    { style: [styles.tableHeaderRow, { backgroundColor: data.primaryColor }], key: 'table-header' },
    React.createElement(Text, { style: [styles.tableHeaderText, styles.colIndex], key: 'h-index' }, 'Sl No.'),
    React.createElement(Text, { style: [styles.tableHeaderText, styles.colName], key: 'h-name' }, 'Description'),
    React.createElement(Text, { style: [styles.tableHeaderText, styles.colQty], key: 'h-qty' }, 'Qty'),
    React.createElement(Text, { style: [styles.tableHeaderText, styles.colPrice], key: 'h-price' }, 'Unit Price'),
    React.createElement(Text, { style: [styles.tableHeaderText, styles.colSubtotal], key: 'h-subtotal' }, 'Total'),
  );

  const tableRows = data.items.map((item, i) =>
    React.createElement(
      View,
      { style: styles.tableRow, key: `item-${i}` },
      React.createElement(Text, { style: styles.colIndex, key: 'index' }, String(i + 1)),
      React.createElement(Text, { style: styles.colName, key: 'name' }, item.productName),
      React.createElement(Text, { style: styles.colQty, key: 'qty' }, String(item.quantity)),
      React.createElement(Text, { style: styles.colPrice, key: 'price' }, formatMoney(item.price)),
      React.createElement(Text, { style: styles.colSubtotal, key: 'subtotal' }, formatMoney(item.subtotal)),
    ),
  );

  const table = React.createElement(View, { key: 'table' }, tableHeader, ...tableRows);

  const statusColor = STATUS_COLOR[data.paymentStatus] ?? MUTED;
  const paymentBlock = React.createElement(
    View,
    { key: 'payment' },
    React.createElement(Text, { style: styles.paymentLabel }, 'Payment Method'),
    React.createElement(
      View,
      { style: styles.paymentValueRow },
      React.createElement(Text, { style: styles.paymentMethodText }, data.paymentMethod),
      data.paymentStatus ? React.createElement(Text, { style: styles.paymentDivider }, '|') : null,
      data.paymentStatus
        ? React.createElement(Text, { style: [styles.paymentStatusText, { color: statusColor }] }, data.paymentStatus)
        : null,
    ),
  );

  const subtotal = data.items.reduce((sum, i) => sum + i.subtotal, 0);
  const totalsBlock = React.createElement(
    View,
    { style: styles.totalsBox, key: 'totals' },
    React.createElement(
      View,
      { style: styles.totalsRow, key: 'subtotal' },
      React.createElement(Text, { style: styles.totalsLabel }, 'Subtotal'),
      React.createElement(Text, { style: styles.totalsValue }, formatMoney(subtotal)),
    ),
    React.createElement(View, { style: styles.totalsDivider, key: 'divider' }),
    React.createElement(
      View,
      { style: styles.totalsRow, key: 'total-due' },
      React.createElement(Text, { style: styles.totalDueLabel }, 'Total Due'),
      React.createElement(Text, { style: [styles.totalDueValue, { color: data.primaryColor }] }, formatMoney(data.totalAmount)),
    ),
  );

  const summary = React.createElement(View, { style: styles.summaryRow, key: 'summary' }, paymentBlock, totalsBlock);

  type ContactCol = { icon: React.ReactElement; value: string; caption: string; key: string };
  const contactCols: ContactCol[] = [
    data.storePhone
      ? { icon: iconPhone(data.primaryColor), value: data.storePhone, caption: 'Customer Support', key: 'phone' }
      : null,
    data.storeUrl
      ? { icon: iconGlobe(data.primaryColor), value: data.storeUrl, caption: 'Visit Our Website', key: 'website' }
      : null,
    data.storeSupportEmail
      ? { icon: iconMail(data.primaryColor), value: data.storeSupportEmail, caption: 'Email Us', key: 'email' }
      : null,
  ].filter((c): c is ContactCol => c !== null);

  const contactRow = contactCols.length
    ? React.createElement(
        View,
        { style: styles.contactRow, key: 'contact-row' },
        ...contactCols.map((c) =>
          React.createElement(
            View,
            { style: styles.contactCol, key: c.key },
            React.createElement(View, { style: styles.contactIcon }, c.icon),
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: [styles.contactValue, { color: data.primaryColor }] }, c.value),
              React.createElement(Text, { style: styles.contactCaption }, c.caption),
            ),
          ),
        ),
      )
    : null;

  const footer = React.createElement(
    View,
    { style: styles.footer, key: 'footer' },
    React.createElement(
      View,
      { style: styles.footerHeadRow, key: 'head' },
      React.createElement(View, { style: styles.bagBadge }, iconBag(data.primaryColor)),
      React.createElement(
        View,
        null,
        React.createElement(Text, { style: [styles.footerThanks, { color: data.primaryColor }] }, `Thank you for shopping with ${data.storeName}!`),
        React.createElement(Text, { style: styles.footerSub }, 'If you have any questions about this invoice, please contact our support team.'),
      ),
    ),
    contactRow,
  );

  const content = React.createElement(View, { style: styles.content, key: 'content' }, header, metaRow, parties, table, summary, footer);

  const frame = React.createElement(
    View,
    { style: [styles.frame, { borderColor: data.primaryColor }], key: 'frame' },
    topBar,
    content,
    bottomBar,
  );

  return React.createElement(
    Document,
    null,
    React.createElement(Page, { size: 'A4', style: styles.page }, frame),
  );
}
