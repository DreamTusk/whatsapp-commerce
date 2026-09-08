import { Icon } from "./Icon";

const benefits = [
  {
    icon: "store",
    iconBg: "bg-primary-fixed",
    iconColor: "text-primary",
    title: "Your own storefront",
    description: "A dedicated online presence for your business. No marketplace competition sitting beside your hard-earned listings.",
  },
  {
    icon: "brush",
    iconBg: "bg-secondary-fixed",
    iconColor: "text-secondary",
    title: "Your own brand",
    description: "Your logo, your store colours, and your curated product catalogs remain completely front and center for shoppers.",
  },
  {
    icon: "hub",
    iconBg: "bg-surface-container-highest",
    iconColor: "text-primary",
    title: "Everything connected",
    description: "Storefront, products, orders, customer relationships, and UPI payouts operate seamlessly together in one system.",
  },
  {
    icon: "trending_up",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-800",
    title: "Ready to grow",
    description: "Engineered to effortlessly support high festive traffic, rapid order spikes, and expanding regional retail operations.",
  },
];

export function WhyPlatformSection() {
  return (
    <section id="about" className="w-full bg-surface py-20 scroll-mt-24">
      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Purpose Built</span>
          <h2 className="font-[var(--font-plus-jakarta)] text-[28px] leading-9 md:text-4xl md:leading-[44px] text-on-surface mt-2 font-bold tracking-tight">
            Built around your business.
          </h2>
          <p className="text-lg leading-7 text-on-surface-variant mt-2">
            Clear, straightforward benefits designed for day-to-day business success without technical headaches.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/50 shadow-sm hover:shadow-md transition"
            >
              <div className={`w-10 h-10 rounded-xl ${benefit.iconBg} ${benefit.iconColor} flex items-center justify-center mb-4`}>
                <Icon name={benefit.icon} />
              </div>
              <h3 className="font-[var(--font-plus-jakarta)] text-base font-bold text-on-surface">{benefit.title}</h3>
              <p className="text-sm leading-6 text-on-surface-variant mt-2">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
