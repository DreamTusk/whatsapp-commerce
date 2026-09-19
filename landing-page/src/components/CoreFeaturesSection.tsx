import { Icon } from "./Icon";

export function CoreFeaturesSection() {
  return (
    <section id="core-features" className="w-full bg-surface py-20 scroll-mt-24">
      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Product Highlights</span>
          <h2 className="font-[var(--font-plus-jakarta)] text-[28px] leading-9 md:text-4xl md:leading-[44px] text-on-surface mt-2 font-semibold tracking-tight">
            Everything your online business needs.
          </h2>
          <p className="text-lg leading-7 text-on-surface-variant mt-3 tracking-tight">
            From your storefront to your orders, customers and day-to-day operations, everything works together in one place.
          </p>
        </div>

        {/* 2x2 Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1: Beautiful Storefronts */}
          <FeatureCard
            icon="devices"
            iconBg="bg-primary-fixed"
            iconColor="text-primary"
            title="Beautiful Storefronts"
            description="Create a branded online shopping experience that feels like your business. Optimized for mobile shoppers with zero coding required."
          >
            <div className="mt-6 rounded-2xl bg-surface-container p-4 border border-outline-variant/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary text-on-primary text-xs flex items-center justify-center font-bold">A</div>
                  <span className="text-xs font-bold text-on-surface">Artisan Gourmet</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Live Theme</span>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-sm border border-outline-variant/30 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
                  <Icon name="bakery_dining" className="text-2xl" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-on-surface block">Wood-Fired Sourdough</span>
                  <span className="text-[11px] text-on-surface-variant">Naturally fermented 24h</span>
                </div>
                <span className="text-xs font-bold text-primary">₹240</span>
              </div>
            </div>
          </FeatureCard>

          {/* Feature 2: Simple Store Management */}
          <FeatureCard
            icon="inventory"
            iconBg="bg-secondary-fixed"
            iconColor="text-secondary"
            title="Simple Store Management"
            description="Manage products, collections, categories, inventory and orders from one place. Update prices and mark items in stock in seconds."
          >
            <div className="mt-6 rounded-2xl bg-surface-container p-4 border border-outline-variant/40 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-outline px-2 pb-1 border-b border-outline-variant/40">
                <span>PRODUCT &amp; SKU</span>
                <span>STOCK</span>
                <span>PRICE</span>
                <span>STATUS</span>
              </div>
              <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface text-[11px]">Organic Honey 500g</span>
                  <span className="text-[9px] text-outline font-mono">SKU: HNY-04</span>
                </div>
                <span className="text-[11px] text-on-surface font-medium">84 units</span>
                <span className="text-[11px] font-bold text-on-surface">₹380</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface text-[11px]">Gir Cow Ghee 1L</span>
                  <span className="text-[9px] text-outline font-mono">SKU: GHE-01</span>
                </div>
                <span className="text-[11px] text-on-surface font-medium">12 units</span>
                <span className="text-[11px] font-bold text-on-surface">₹1,150</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">Low</span>
              </div>
            </div>
          </FeatureCard>

          {/* Feature 3: Seamless Checkout */}
          <FeatureCard
            icon="account_balance_wallet"
            iconBg="bg-tertiary-fixed"
            iconColor="text-tertiary"
            title="Seamless Checkout"
            description="Give customers a fast and familiar checkout experience with secure online payments via UPI, RuPay, Visa, Mastercard, and Netbanking."
          >
            <div className="mt-6 rounded-2xl bg-surface-container p-4 border border-outline-variant/40">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface mb-2.5">
                <span>Supported Instant Rails</span>
                <span className="text-primary font-semibold text-[11px]">100% Encrypted</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-white rounded-xl border border-outline-variant/40 text-center flex flex-col items-center">
                  <Icon name="qr_code_scanner" className="text-lg text-indigo-600" />
                  <span className="text-[10px] font-bold text-on-surface mt-1">UPI Apps</span>
                  <span className="text-[9px] text-outline">GPay • PhonePe</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-outline-variant/40 text-center flex flex-col items-center">
                  <Icon name="credit_card" className="text-lg text-primary" />
                  <span className="text-[10px] font-bold text-on-surface mt-1">Debit &amp; Credit</span>
                  <span className="text-[9px] text-outline">RuPay • Visa • MC</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-outline-variant/40 text-center flex flex-col items-center">
                  <Icon name="account_balance" className="text-lg text-emerald-600" />
                  <span className="text-[10px] font-bold text-on-surface mt-1">Netbanking</span>
                  <span className="text-[9px] text-outline">50+ Major Banks</span>
                </div>
              </div>
            </div>
          </FeatureCard>

          {/* Feature 4: Know Your Business */}
          <FeatureCard
            icon="insights"
            iconBg="bg-surface-container-highest"
            iconColor="text-primary"
            title="Know Your Business"
            description="Understand orders, repeat customers, and sales trends through an uncluttered, actionable business dashboard made for decision-making."
          >
            <div className="mt-6 rounded-2xl bg-surface-container p-4 border border-outline-variant/40">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">Weekly Velocity</span>
                  <span className="text-xs font-bold text-on-surface block">₹1,94,800 gross sales</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+24% vs last week</span>
              </div>
              <div className="flex items-end justify-between h-14 pt-2 gap-1.5 px-1 bg-white rounded-xl border border-outline-variant/30">
                <div className="w-full bg-primary-fixed-dim rounded-t" style={{ height: "40%" }} />
                <div className="w-full bg-primary-fixed-dim rounded-t" style={{ height: "55%" }} />
                <div className="w-full bg-primary-fixed-dim rounded-t" style={{ height: "70%" }} />
                <div className="w-full bg-primary-fixed-dim rounded-t" style={{ height: "50%" }} />
                <div className="w-full bg-primary-fixed-dim rounded-t" style={{ height: "85%" }} />
                <div className="w-full bg-primary-fixed-dim rounded-t" style={{ height: "65%" }} />
                <div className="w-full bg-primary rounded-t" style={{ height: "95%" }} />
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  children,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-[0_12px_36px_-8px_rgba(124,58,237,0.08)] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center ${iconColor} mb-5`}>
          <Icon name={icon} className="text-2xl" />
        </div>
        <h3 className="font-[var(--font-plus-jakarta)] text-2xl leading-8 text-on-surface font-semibold">{title}</h3>
        <p className="text-[15px] leading-6 text-on-surface-variant mt-2">{description}</p>
      </div>
      {children}
    </div>
  );
}
