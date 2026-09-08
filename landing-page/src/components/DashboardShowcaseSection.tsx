import { Icon } from "./Icon";

export function DashboardShowcaseSection() {
  return (
    <section className="w-full bg-surface-container-low py-20 border-t border-outline-variant/30">
      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Centralized Command</span>
          <h2 className="font-[var(--font-plus-jakarta)] text-[28px] leading-9 md:text-4xl md:leading-[44px] text-on-surface mt-2 font-bold tracking-tight">
            One platform. Your entire store.
          </h2>
          <p className="text-lg leading-7 text-on-surface-variant mt-2">
            From incoming orders to inventory restocks, control every aspect of your commerce engine with intuitive clarity.
          </p>
        </div>

        {/* Dashboard Window Mockup */}
        <div className="w-full rounded-3xl bg-surface-container-lowest border border-outline-variant/70 shadow-[0_20px_50px_-10px_rgba(124,58,237,0.12)] overflow-hidden">
          {/* Browser Window Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container border-b border-outline-variant/40">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>
            <div className="px-5 py-1 bg-surface-container-lowest rounded-full border border-outline-variant/40 text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5 shadow-inner">
              <Icon name="admin_panel_settings" className="text-[12px] text-primary" />
              <span>app.dreambiz.io/freshmart/dashboard</span>
            </div>
            <div className="flex items-center gap-2 text-outline">
              <Icon name="settings" className="text-sm" />
            </div>
          </div>

          {/* Dashboard Layout */}
          <div className="flex flex-col lg:flex-row min-h-[520px]">
            {/* Left Sidebar */}
            <div className="w-full lg:w-56 bg-white border-b lg:border-b-0 lg:border-r border-outline-variant/40 p-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Store Badge */}
                <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/30">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Icon name="storefront" className="text-lg" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-on-surface truncate">FreshMart</p>
                    <p className="text-[10px] text-on-surface-variant truncate">9597238598</p>
                    <p className="text-[10px] text-primary truncate flex items-center gap-0.5">
                      <Icon name="open_in_new" className="text-[10px]" />
                      freshmart.dr...
                    </p>
                  </div>
                </div>

                {/* Nav items */}
                <nav className="space-y-0.5">
                  <NavItem icon="dashboard" label="Dashboard" active />
                  <NavItem icon="receipt_long" label="Orders" />
                  <NavItem icon="local_shipping" label="Shipments" />
                  <NavItem icon="inventory_2" label="Products" />
                  <NavItem icon="inventory" label="Inventory" />
                  <NavItem icon="diamond" label="Brands" />
                  <NavItem icon="category" label="Categories" />
                  <NavItem icon="collections_bookmark" label="Collections" />
                  <NavItem icon="view_carousel" label="Banners" />
                  <NavItem icon="group" label="Customers" />
                  <NavItem icon="settings" label="Settings" />
                </nav>
              </div>

              {/* User Profile */}
              <div className="pt-3 border-t border-outline-variant/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">V</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-semibold text-on-surface truncate">venkatesh R</p>
                    <p className="text-[10px] text-on-surface-variant truncate">venkatesh.r@dreamtusk...</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant hover:text-primary cursor-pointer">
                  <Icon name="logout" className="text-sm" />
                  <span>Sign out</span>
                </div>
              </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 p-5 md:p-6 bg-[#f8f9fb] flex flex-col gap-5">
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-[var(--font-plus-jakarta)] text-xl text-on-surface font-bold">Dashboard</h3>
                  <p className="text-xs text-on-surface-variant">Overview of your store</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <Icon name="open_in_new" className="text-sm" />
                  <span>freshmart.dreambiz.app</span>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                  label="Total Revenue"
                  value="₹830"
                  subtitle="From delivered orders"
                  icon="trending_up"
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <KPICard
                  label="Total Orders"
                  value="4"
                  subtitle="0 new today"
                  icon="calendar_today"
                  iconBg="bg-primary-fixed/50"
                  iconColor="text-primary"
                />
                <KPICard
                  label="Customers"
                  value="6"
                  subtitle="Registered customers"
                  icon="group"
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                />
                <KPICard
                  label="Products"
                  value="68"
                  subtitle="All in stock"
                  icon="grid_view"
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
              </div>

              {/* Recent Orders & Order Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
                {/* Recent Orders */}
                <div className="lg:col-span-8 p-4 rounded-2xl bg-white border border-outline-variant/40 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Recent Orders</h4>
                      <p className="text-[11px] text-on-surface-variant">Last 4 orders</p>
                    </div>
                    <span className="text-xs text-primary font-medium hover:underline cursor-pointer flex items-center gap-0.5">
                      View all <Icon name="arrow_forward" className="text-sm" />
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider border-b border-outline-variant/30">
                        <th className="pb-2 font-medium">Order</th>
                        <th className="pb-2 font-medium">Customer</th>
                        <th className="pb-2 font-medium">Amount</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      <OrderRow orderId="ORD-0004" customer="Raj" amount="₹55" status="Delivered" statusColor="text-emerald-600" />
                      <OrderRow orderId="ORD-0003" customer="Raj" amount="₹715" status="Delivered" statusColor="text-emerald-600" />
                      <OrderRow orderId="ORD-0002" customer="Sharath" amount="₹180" status="Confirmed" statusColor="text-primary" />
                      <OrderRow orderId="ORD-0001" customer="vijay anand" amount="₹60" status="Delivered" statusColor="text-emerald-600" />
                    </tbody>
                  </table>
                </div>

                {/* Order Breakdown */}
                <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-outline-variant/40 shadow-sm">
                  <h4 className="text-sm font-bold text-on-surface mb-4">Order Breakdown</h4>
                  <div className="space-y-3">
                    <BreakdownItem label="New" count={0} total={4} color="bg-gray-300" />
                    <BreakdownItem label="Confirmed" count={1} total={4} color="bg-primary" />
                    <BreakdownItem label="Out for Delivery" count={0} total={4} color="bg-gray-300" />
                    <BreakdownItem label="Delivered" count={3} total={4} color="bg-emerald-500" />
                    <BreakdownItem label="Cancelled" count={0} total={4} color="bg-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NavItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
        active
          ? "bg-primary/10 text-primary font-semibold"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      }`}
    >
      <Icon name={icon} className="text-base" />
      <span>{label}</span>
    </a>
  );
}

function KPICard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-outline-variant/40 shadow-sm flex items-start justify-between">
      <div>
        <span className="text-[11px] text-on-surface-variant">{label}</span>
        <p className="font-[var(--font-plus-jakarta)] text-xl text-on-surface font-bold mt-0.5">{value}</p>
        <span className="text-[10px] text-on-surface-variant">{subtitle}</span>
      </div>
      <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
        <Icon name={icon} className="text-lg" />
      </div>
    </div>
  );
}

function OrderRow({
  orderId,
  customer,
  amount,
  status,
  statusColor,
}: {
  orderId: string;
  customer: string;
  amount: string;
  status: string;
  statusColor: string;
}) {
  return (
    <tr>
      <td className="py-3 font-medium text-on-surface">{orderId}</td>
      <td className="py-3 text-on-surface">{customer}</td>
      <td className="py-3 text-on-surface">{amount}</td>
      <td className={`py-3 font-medium ${statusColor}`}>{status}</td>
    </tr>
  );
}

function BreakdownItem({
  label,
  count,
  total,
  color
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-semibold text-on-surface">{count}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
