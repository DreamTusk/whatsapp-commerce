import { Icon } from "./Icon";

const steps = [
  {
    number: "01",
    color: "text-primary/15",
    title: "Set up your store",
    description: "Add your products, collections, categories, delivery zones, and custom logo. Customise colours in a few clicks.",
    icon: "palette",
    iconColor: "text-primary",
    tip: "Pre-built responsive store templates",
  },
  {
    number: "02",
    color: "text-secondary/15",
    title: "Start selling",
    description: "Customers browse on their phones, add items to cart, and seamlessly checkout with UPI, Netbanking, or Cards.",
    icon: "qr_code_2",
    iconColor: "text-secondary",
    tip: "Integrated instant UPI payments",
  },
  {
    number: "03",
    color: "text-primary-container/20",
    title: "Grow your business",
    description: "Manage incoming orders, track repeat shoppers, restock fast-selling items, and gain actionable sales insights.",
    icon: "monitoring",
    iconColor: "text-primary-container",
    tip: "Real-time revenue & order metrics",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full bg-surface py-20 scroll-mt-24">
      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Simple Process</span>
          <h2 className="font-[var(--font-plus-jakarta)] text-[28px] leading-9 md:text-4xl md:leading-[44px] text-on-surface mt-2 font-semibold tracking-tight">
            From idea to online store, simply.
          </h2>
          <p className="text-lg leading-7 text-on-surface-variant mt-2">
            We removed friction, complexity, and steep learning curves so you can focus on building your brand.
          </p>
        </div>

        {/* 3-Step Journey */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step) => (
            <div
              key={step.number}
              className="p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-sm relative flex flex-col"
            >
              <span className={`text-5xl font-bold ${step.color} font-[var(--font-plus-jakarta)]`}>{step.number}</span>
              <h3 className="font-[var(--font-plus-jakarta)] text-xl font-semibold text-on-surface mt-4">{step.title}</h3>
              <p className="text-[15px] leading-6 text-on-surface-variant mt-2">{step.description}</p>
              <div className="mt-6 p-4 rounded-2xl bg-surface-container flex items-center gap-3">
                <Icon name={step.icon} className={`text-2xl ${step.iconColor}`} />
                <span className="text-xs font-semibold text-on-surface">{step.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
