import { Icon } from "./Icon";

export function PaymentsSection() {
  return (
    <section className="w-full bg-surface-container-low py-20 border-y border-outline-variant/30">
      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Text Details */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-surface-container border border-outline-variant/50 text-xs font-semibold text-primary mb-4">
              <Icon name="lock" className="text-sm" />
              <span>Secure Indian Payment Stack</span>
            </div>
            <h2 className="font-[var(--font-plus-jakarta)] text-[28px] leading-9 md:text-4xl md:leading-[44px] text-on-surface font-bold tracking-tight">
              Payments made simple.
            </h2>
            <p className="text-lg leading-7 text-on-surface-variant mt-4">
              Provide the payment methods Indian shoppers trust the most. No high drop-offs, no complex redirections.
            </p>
            <div className="mt-6 space-y-3">
              <CheckItem text="Instant UPI auto-intent (Google Pay, PhonePe, Paytm, BHIM)" />
              <CheckItem text="RuPay, Visa, Mastercard credit & debit cards" />
              <CheckItem text="Direct settlement to your Indian business bank account" />
            </div>
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Secure online payments powered by <strong>Razorpay</strong></span>
            </div>
          </div>

          {/* Checkout Panel UI */}
          <div className="lg:col-span-7">
            <div className="max-w-lg mx-auto bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/60 shadow-[0_20px_48px_-12px_rgba(124,58,237,0.14)]">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xs">D</div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Express Checkout</h4>
                    <span className="text-[10px] text-outline">Order #DB-9042</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">₹440 Total</span>
              </div>

              {/* Items */}
              <div className="mt-4 space-y-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface font-medium">Fresh Farm Strawberries (500g)</span>
                  <span className="font-bold text-on-surface">₹220</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface font-medium">Artisan Sourdough Loaf</span>
                  <span className="font-bold text-on-surface">₹180</span>
                </div>
                <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-outline-variant/20">
                  <span>Standard Delivery (Bandra West, Mumbai)</span>
                  <span>₹40</span>
                </div>
              </div>

              {/* Payment Options */}
              <div className="mt-5">
                <span className="text-xs font-bold text-on-surface block mb-2">Select Payment Option</span>
                <div className="space-y-2.5">
                  {/* UPI - Selected */}
                  <div className="p-3 rounded-xl border-2 border-primary bg-primary-fixed/20 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-4 border-primary bg-white" />
                      <div>
                        <span className="text-xs font-bold text-on-surface block">UPI (Instant Verification)</span>
                        <span className="text-[11px] text-on-surface-variant">Google Pay, PhonePe, Paytm, BHIM</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Recommended</span>
                  </div>

                  {/* Cards */}
                  <div className="p-3 rounded-xl border border-outline-variant/50 bg-white flex items-center justify-between opacity-85 hover:opacity-100 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-outline" />
                      <div>
                        <span className="text-xs font-semibold text-on-surface block">Credit &amp; Debit Cards</span>
                        <span className="text-[11px] text-on-surface-variant">RuPay, Visa, Mastercard</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-outline font-medium">Zero convenience fee</span>
                  </div>

                  {/* Netbanking */}
                  <div className="p-3 rounded-xl border border-outline-variant/50 bg-white flex items-center justify-between opacity-85 hover:opacity-100 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-outline" />
                      <div>
                        <span className="text-xs font-semibold text-on-surface block">Netbanking</span>
                        <span className="text-[11px] text-on-surface-variant">SBI, HDFC, ICICI, Axis &amp; 40+ others</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-secondary-container via-primary-container to-primary text-on-primary font-semibold text-sm shadow-md flex items-center justify-center gap-2 hover:shadow-lg transition">
                <Icon name="lock" className="text-base" />
                Pay ₹440 via UPI
              </button>
              <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-outline">
                <span className="flex items-center gap-1">
                  <Icon name="shield" className="text-xs text-emerald-600" /> 256-bit SSL
                </span>
                <span>•</span>
                <span>Instant Confirmation</span>
                <span>•</span>
                <span>Direct Bank Settlement</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
        <Icon name="check" className="text-sm" />
      </span>
      <span className="text-[15px] leading-6 font-medium text-on-surface">{text}</span>
    </div>
  );
}
