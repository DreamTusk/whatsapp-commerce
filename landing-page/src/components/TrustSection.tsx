import { Icon } from "./Icon";

const businessTypes = [
  {
    icon: "eco",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    title: "Grocery",
    description: "Daily essentials & fresh staples",
  },
  {
    icon: "bakery_dining",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    title: "Bakery",
    description: "Artisan bread & custom cakes",
  },
  {
    icon: "local_cafe",
    iconBg: "bg-purple-50",
    iconColor: "text-primary",
    title: "Food & Beverage",
    description: "Specialty brews & snacks",
  },
  {
    icon: "shopping_bag",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-700",
    title: "Retail",
    description: "Apparel, jewelry & gifts",
  },
  {
    icon: "storefront",
    iconBg: "bg-violet-50",
    iconColor: "text-secondary",
    title: "Local Brands",
    description: "City-wide neighborhood reach",
  },
  {
    icon: "bolt",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-700",
    title: "D2C Brands",
    description: "Direct customer connection",
  },
];

export function TrustSection() {
  return (
    <section id="solutions" className="w-full bg-surface-container-low py-10 border-y border-outline-variant/40 scroll-mt-24">
      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h2 className="font-[var(--font-plus-jakarta)] text-xl leading-7 text-on-surface font-bold">
            Built for businesses ready to grow online
          </h2>
          <p className="text-[13px] leading-5 text-on-surface-variant mt-1">
            From neighbourhood retailers to rising direct-to-consumer brands
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {businessTypes.map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/50 shadow-sm flex flex-col items-center text-center gap-2 group hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon name={item.icon} className="text-2xl" />
              </div>
              <span className="text-sm font-bold text-on-surface">{item.title}</span>
              <span className="text-[11px] text-on-surface-variant">{item.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
