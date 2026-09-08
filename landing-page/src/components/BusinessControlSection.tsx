import { Icon } from "./Icon";

const cards = [
  {
    label: "Active Orders",
    labelColor: "text-primary-fixed",
    value: "124",
    description: "Orders in packing and dispatch",
    icon: null,
    badge: <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />,
    footer: { icon: "schedule", text: "Avg packing time: 14 mins", color: "text-primary-fixed-dim" },
  },
  {
    label: "Inventory Alert",
    labelColor: "text-amber-300",
    value: "28",
    description: "Products need attention or restock",
    icon: "notification_important",
    iconColor: "text-amber-400",
    footer: { icon: "warning", text: "Mustard Oil & Sourdough low", color: "text-amber-200" },
  },
  {
    label: "Customer Base",
    labelColor: "text-primary-fixed",
    value: "+86",
    description: "New customers registered this week",
    icon: "person_add",
    iconColor: "text-primary-fixed",
    footer: { icon: "repeat", text: "68% repeat purchase rate", color: "text-primary-fixed-dim" },
  },
  {
    label: "Monthly Revenue",
    labelColor: "text-emerald-300",
    value: "₹2,84,650",
    description: "Progress toward monthly milestone",
    icon: "verified",
    iconColor: "text-emerald-400",
    hasProgress: true,
  },
];

export function BusinessControlSection() {
  return (
    <section className="w-full bg-[#180d2f] text-on-primary py-24 relative overflow-hidden">
      {/* Ambient backlights */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-primary-fixed uppercase tracking-widest">Realtime Control</span>
          <h2 className="font-[var(--font-plus-jakarta)] text-[28px] leading-9 md:text-4xl md:leading-[44px] text-on-primary mt-2 font-bold tracking-tight">
            Your business, always within reach.
          </h2>
          <p className="text-lg leading-7 text-on-tertiary-container mt-2">
            Monitor operations, update inventory, and fulfill customer orders wherever you are.
          </p>
        </div>

        {/* Live Data Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 flex flex-col justify-between hover:bg-white/10 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${card.labelColor}`}>{card.label}</span>
                  {card.badge}
                  {card.icon && <Icon name={card.icon} className={`text-base ${card.iconColor}`} />}
                </div>
                <p className="font-[var(--font-plus-jakarta)] text-3xl font-extrabold text-on-primary mt-3">{card.value}</p>
                <p className="text-xs text-on-tertiary-container mt-1">{card.description}</p>
              </div>

              {card.hasProgress ? (
                <div className="mt-5 pt-3 border-t border-white/10">
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-400 to-primary-fixed h-full rounded-full w-4/5" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-on-tertiary-container mt-1">
                    <span>80% of monthly goal</span>
                    <span>₹3,50,000</span>
                  </div>
                </div>
              ) : card.footer ? (
                <div className={`mt-5 pt-3 border-t border-white/10 text-[11px] ${card.footer.color} flex items-center gap-1`}>
                  <Icon name={card.footer.icon} className="text-sm" />
                  <span>{card.footer.text}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
