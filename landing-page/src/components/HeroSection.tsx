import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icon";

export function HeroSection() {
  return (
    <section className="relative isolate w-full overflow-hidden bg-surface py-16 md:py-20">
      {/* Background Video - hidden on mobile */}
      <video
        className="hidden md:block absolute inset-0 w-full h-full object-contain object-top -z-30 pointer-events-none"
        autoPlay
        muted
        loop
        playsInline

      >
        <source src="/videos/hero-background.mp4" type="video/mp4" />
      </video>
      <div className="hidden md:block absolute inset-0 bg-surface/25 -z-20" />

      {/* Ambient glowing backdrop orbs */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-primary-fixed-dim/40 via-secondary-fixed/30 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />
      <div className="absolute -top-16 right-[-80px] w-96 h-96 bg-primary-container/10 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8 flex flex-col items-center text-center">
        <h1 className="font-[var(--font-plus-jakarta)] text-4xl md:text-[56px] md:leading-[64px] font-bold text-on-surface max-w-4xl tracking-tight">
          <span className="sr-only">Build an online store your customers will love.</span>
          <span aria-hidden="true">
            <AnimatedWords text={HEADLINE_PART_1} />{" "}
            <AnimatedWords
              text={HEADLINE_PART_2}
              startIndex={countLetters(HEADLINE_PART_1)}
              className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary-container"
            />
            <span className="hero-cursor inline-block w-[3px] md:w-1 h-[0.75em] bg-primary ml-1 align-middle rounded-sm" />
          </span>
        </h1>

        {/* Supporting Line */}
        <p className="mt-5 text-lg leading-7 text-on-surface-variant max-w-2xl tracking-tight">
          Everything you need to bring your business online, sell effortlessly, and grow — all from one powerful platform.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="https://calendar.app.google/sFVi9ragoa8fguBM7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl font-semibold text-sm text-on-primary bg-gradient-to-r from-secondary-container via-primary-container to-primary shadow-[0_10px_28px_-4px_rgba(124,58,237,0.38)] hover:shadow-[0_16px_36px_-2px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Book Demo
            <Icon name="arrow_forward" className="ml-2 text-lg" />
          </Link>
        </div>

        {/* Hero Product Visualization */}
        <div className="mt-12 w-full max-w-6xl relative">
          {/* Floating Cards - Desktop Only */}
          {/* Revenue Card - Left */}
          <div className="hidden lg:flex absolute -left-8 top-16 z-20 flex-col gap-1 p-4 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl border border-outline-variant/60 shadow-[0_16px_36px_-8px_rgba(124,58,237,0.14)] w-60 text-left animate-bounce" style={{ animationDuration: "6s" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Today&apos;s Revenue</span>
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">+18.4%</span>
            </div>
            <span className="text-2xl font-bold text-on-surface">₹2,84,650</span>
            <div className="w-full h-8 mt-1">
              <svg className="w-full h-full text-primary" fill="none" preserveAspectRatio="none" viewBox="0 0 100 30">
                <path d="M0 24 Q 20 28, 35 15 T 70 12 T 100 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                <path d="M0 24 Q 20 28, 35 15 T 70 12 T 100 4 L 100 30 L 0 30 Z" fill="currentColor" opacity="0.12" />
              </svg>
            </div>
          </div>

          {/* Live Orders Card - Right */}
          <div className="hidden lg:flex absolute -right-6 top-10 z-20 items-center gap-3 p-4 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl border border-outline-variant/60 shadow-[0_16px_36px_-8px_rgba(124,58,237,0.14)] text-left">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <Icon name="shopping_cart_checkout" className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-semibold text-on-surface-variant">Live Orders</span>
              </div>
              <p className="text-xl font-bold text-on-surface">
                124 <span className="text-[13px] text-on-surface-variant font-normal">in progress</span>
              </p>
            </div>
          </div>

          {/* Inventory Card - Bottom Left */}
          <div className="hidden xl:flex absolute -left-6 bottom-12 z-20 items-center gap-3 px-4 py-3 bg-surface-container-lowest/95 backdrop-blur-md rounded-xl border border-outline-variant/60 shadow-lg">
            <Icon name="inventory_2" className="text-secondary text-lg" />
            <span className="text-xs font-semibold text-on-surface"><strong>98.4%</strong> in stock</span>
          </div>

          {/* Customers Card - Right, below Live Orders */}
          <div className="hidden xl:flex absolute -right-6 top-40 z-20 items-center gap-3 px-4 py-3 bg-surface-container-lowest/95 backdrop-blur-md rounded-xl border border-outline-variant/60 shadow-lg">
            <Icon name="group" className="text-primary text-lg" />
            <span className="text-xs font-semibold text-on-surface"><strong>3,420</strong> Active Customers</span>
          </div>

          {/* Main Desktop Mockup */}
          <div className="relative mx-auto rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-[0_24px_64px_-12px_rgba(124,58,237,0.18)] overflow-hidden">
            {/* Browser Chrome Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface-container border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/50 text-on-surface-variant text-xs max-w-sm w-full mx-auto justify-center shadow-inner">
                <Icon name="lock" className="text-xs text-emerald-600" />
                <span>freshmart.dreambiz.shop</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant opacity-60 text-sm">
                <Icon name="refresh" className="text-base" />
                <Icon name="fullscreen" className="text-base" />
              </div>
            </div>

            {/* Storefront Header */}
            <div className="bg-surface-container-lowest px-5 md:px-8 py-4 border-b border-outline-variant/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-on-primary flex items-center justify-center font-bold text-lg">F</div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[17px] text-on-surface font-bold leading-none">Fresh Mart</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full border border-emerald-200">Verified</span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant">Bandra West, Mumbai • Delivering in 45 mins</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="hidden md:flex flex-1 max-w-md items-center gap-2 px-4 py-2 bg-surface-container-low rounded-xl text-on-surface-variant text-sm border border-outline-variant/40">
                <Icon name="search" className="text-sm text-outline" />
                <span className="text-on-surface-variant/70 text-xs">Search fresh fruits, vegetables, pulses...</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[11px] text-on-surface-variant font-semibold">Delivery Slot</span>
                  <span className="text-xs font-semibold text-primary">Today, 5:00 - 7:00 PM</span>
                </div>
                <button className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                  <Icon name="shopping_bag" className="text-base" />
                  <span>3 items • ₹1,270</span>
                </button>
              </div>
            </div>

            {/* Categories Sub-bar */}
            <div className="px-5 md:px-8 py-2.5 bg-surface-bright border-b border-outline-variant/30 flex items-center gap-4 overflow-x-auto text-xs font-medium text-on-surface-variant">
              <span className="text-primary font-bold bg-primary-fixed/40 px-2.5 py-1 rounded-lg">All Categories</span>
              <span className="hover:text-primary cursor-pointer whitespace-nowrap">Organic Fruits</span>
              <span className="hover:text-primary cursor-pointer whitespace-nowrap">Farm Dairy</span>
              <span className="hover:text-primary cursor-pointer whitespace-nowrap">Cold Pressed Oils</span>
              <span className="hover:text-primary cursor-pointer whitespace-nowrap">Daily Staples</span>
              <span className="hover:text-primary cursor-pointer whitespace-nowrap">Gourmet Spices</span>
            </div>

            {/* Product Grid + Cart */}
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 text-left bg-surface">
              {/* Products Grid */}
              <div className="md:col-span-8 grid grid-cols-2 gap-4">
                {/* Product 1: Alphonso Mangoes */}
                <ProductCard
                  badge="Seasonal"
                  badgeColor="bg-primary"
                  image="/products/alphonso-mangoes.jpeg"
                  subtitle="Ratnagiri Alphonso"
                  title="Alphonso Mangoes"
                  description="Handpicked 1 Dozen (approx 2.8kg)"
                  price="₹650"
                  originalPrice="₹799"
                  isAdded
                />

                {/* Product 2: Mustard Oil */}
                <ProductCard
                  badge="Pure Kachi Ghani"
                  badgeColor="bg-emerald-600"
                  image="/products/mustard-oil.jpg"
                  subtitle="Cold Pressed Mustard Oil"
                  title="Mustard Oil 1L Glass Bottle"
                  description="Unrefined traditional pressed"
                  price="₹210"
                  originalPrice="₹245"
                  isAdded
                />

                {/* Product 3: Shilajit Resin */}
                <ProductCard
                  image="/products/shilajit-resin.jpg"
                  subtitle="Himalayan Organic"
                  title="Premium Shilajit Resin"
                  description="100% pure, sourced at 16,000 ft"
                  price="₹1,499"
                  originalPrice="₹1,799"
                />

                {/* Product 4: Paneer */}
                <ProductCard
                  badge="Fresh Daily"
                  badgeColor="bg-purple-600"
                  image="/products/a2-paneer.jpg"
                  subtitle="A2 Malai Paneer"
                  title="Farm Fresh Paneer 500g"
                  description="Crafted from Gir cow milk"
                  price="₹180"
                  isAdded
                />
              </div>

              {/* Cart Drawer */}
              <div className="md:col-span-4 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/60 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
                    <div className="flex items-center gap-2">
                      <Icon name="local_mall" className="text-primary text-lg" />
                      <span className="text-sm font-bold text-on-surface">Order Summary</span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free Delivery</span>
                  </div>

                  {/* Cart Items */}
                  <div className="mt-3 space-y-2.5">
                    <CartItem color="bg-amber-100" textColor="text-amber-800" name="Alphonso Mangoes" price="₹650" />
                    <CartItem color="bg-yellow-100" textColor="text-yellow-800" name="Mustard Oil 1L" price="₹210" />
                    <CartItem color="bg-purple-100" textColor="text-purple-800" name="Brown Rice 5kg" price="₹440" />
                  </div>

                  {/* Delivery Address */}
                  <div className="mt-4 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs">
                    <div className="flex items-center justify-between text-on-surface-variant font-medium">
                      <span className="flex items-center gap-1">
                        <Icon name="pin_drop" className="text-sm text-primary" />
                        Delivering to Bandra West
                      </span>
                      <span className="text-primary font-semibold cursor-pointer">Change</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1">Flat 402, Pali Hill Apts, Mumbai 400050</p>
                  </div>
                </div>

                {/* Total & Checkout */}
                <div className="mt-4 pt-3 border-t border-outline-variant/40">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                    <span>Subtotal</span>
                    <span>₹1,300</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-600 font-medium mb-2">
                    <span>Special Launch Discount</span>
                    <span>- ₹30</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-on-surface mb-3">
                    <span>Total Amount</span>
                    <span className="text-primary text-base">₹1,270</span>
                  </div>
                  <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-secondary-container via-primary-container to-primary text-on-primary font-semibold text-xs shadow-[0_4px_16px_-2px_rgba(124,58,237,0.35)] flex items-center justify-center gap-2 hover:opacity-95">
                    Proceed to Pay
                    <Icon name="arrow_forward" className="text-sm" />
                  </button>
                  <p className="text-[10px] text-center text-outline mt-2 flex items-center justify-center gap-1">
                    <Icon name="verified_user" className="text-[12px] text-emerald-600" />
                    Instant UPI &amp; Card Payments
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Storefront Mockup - overlapping bottom-right of the desktop mockup */}
          <div className="hidden lg:block absolute -bottom-14 -right-6 xl:-right-12 z-30 w-[180px] rotate-3 hover:rotate-0 transition-transform duration-300">
            <div className="rounded-[2.2rem] border-[6px] border-slate-900 bg-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35)]">
              {/* Notch */}
              <div className="absolute top-1.5 inset-x-0 flex justify-center z-10">
                <div className="w-16 h-4 bg-slate-900 rounded-b-2xl" />
              </div>

              {/* Screen */}
              <div className="relative rounded-[1.75rem] overflow-hidden bg-surface-container-lowest aspect-[9/19.5] flex flex-col">
                {/* Store Header */}
                <div className="px-3 pt-6 pb-1.5 flex items-center gap-1.5 border-b border-outline-variant/30">
                  <div className="w-5 h-5 rounded-md bg-emerald-600 text-on-primary flex items-center justify-center font-bold text-[9px] shrink-0">F</div>
                  <div className="text-left leading-tight min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-on-surface truncate">Fresh Mart</span>
                      <Icon name="verified" className="text-[9px] text-emerald-600 shrink-0" />
                    </div>
                    <span className="text-[6.5px] text-on-surface-variant">Delivering in 45 mins</span>
                  </div>
                </div>

                {/* Categories */}
                <div className="px-3 py-1.5 flex items-center gap-1 overflow-hidden">
                  <span className="text-[7px] font-bold text-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded-md whitespace-nowrap">All</span>
                  <span className="text-[7px] text-on-surface-variant whitespace-nowrap">Fruits</span>
                  <span className="text-[7px] text-on-surface-variant whitespace-nowrap">Dairy</span>
                  <span className="text-[7px] text-on-surface-variant whitespace-nowrap">Oils</span>
                </div>

                {/* Products */}
                <div className="px-3 mt-0.5 flex-1 space-y-1.5">
                  <div className="rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/40 shadow-sm">
                    <div className="relative w-full h-14">
                      <Image src="/products/alphonso-mangoes.jpeg" alt="Alphonso Mangoes" fill sizes="160px" className="object-cover" />
                      <span className="absolute top-1 left-1 bg-primary text-on-primary text-[6px] font-bold px-1 py-0.5 rounded">Seasonal</span>
                    </div>
                    <div className="p-1.5">
                      <p className="text-[8px] font-bold text-on-surface truncate">Alphonso Mangoes</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[8px] font-bold text-on-surface">₹650</span>
                        <span className="text-[7px] bg-primary text-on-primary px-1.5 py-0.5 rounded-md font-semibold">Added</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/40 shadow-sm">
                    <div className="relative w-full h-14">
                      <Image src="/products/mustard-oil.jpg" alt="Mustard Oil" fill sizes="160px" className="object-cover" />
                      <span className="absolute top-1 left-1 bg-emerald-600 text-on-primary text-[6px] font-bold px-1 py-0.5 rounded">Pure</span>
                    </div>
                    <div className="p-1.5">
                      <p className="text-[8px] font-bold text-on-surface truncate">Mustard Oil 1L</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[8px] font-bold text-on-surface">₹210</span>
                        <span className="text-[7px] bg-primary text-on-primary px-1.5 py-0.5 rounded-md font-semibold">Added</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Cart Bar */}
                <div className="px-3 pb-1.5 pt-1.5 border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest">
                  <div className="text-left leading-tight">
                    <span className="text-[6.5px] text-on-surface-variant block">2 items</span>
                    <span className="text-[9px] font-bold text-primary">₹860</span>
                  </div>
                  <button className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-gradient-to-r from-secondary-container via-primary-container to-primary text-on-primary text-[7px] font-semibold">
                    Pay
                    <Icon name="arrow_forward" className="text-[8px]" />
                  </button>
                </div>

                {/* Home Indicator */}
                <div className="flex justify-center pb-1">
                  <div className="w-14 h-1 rounded-full bg-outline-variant" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const LETTER_STEP = 0.035;

const HEADLINE_PART_1 = "Build an online store your";
const HEADLINE_PART_2 = "customers will love.";

function countLetters(text: string) {
  return text.replace(/\s/g, "").length;
}

function AnimatedWords({
  text,
  startIndex = 0,
  className = "",
}: {
  text: string;
  startIndex?: number;
  className?: string;
}) {
  let index = startIndex;
  const words = text.split(" ");

  return (
    <>
      {words.map((word, wordIdx) => {
        const isLastWord = wordIdx === words.length - 1;
        const letters = word.split("").map((char, charIdx) => {
          const delay = index * LETTER_STEP;
          index += 1;
          return (
            <span
              key={charIdx}
              className={["hero-letter", className].join(" ")}
              style={{ animationDelay: delay + "s" }}
            >
              {char}
            </span>
          );
        });

        return (
          <span key={wordIdx}>
            <span className="inline-block whitespace-nowrap">{letters}</span>
            {isLastWord ? null : " "}
          </span>
        );
      })}
    </>
  );
}

function ProductCard({
  badge,
  badgeColor,
  image,
  subtitle,
  title,
  description,
  price,
  originalPrice,
  isAdded,
}: {
  badge?: string;
  badgeColor?: string;
  image: string;
  subtitle: string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  isAdded?: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/50 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
      <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3">
        {badge && (
          <span className={`absolute top-2 left-2 z-10 ${badgeColor} text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-md`}>
            {badge}
          </span>
        )}
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 768px) 240px, 45vw"
          className="object-cover group-hover:scale-105 transition-transform"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-1.5">
          <span className="text-[11px] font-semibold text-white">{subtitle}</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm text-on-surface font-bold">{title}</h3>
        <p className="text-[11px] text-on-surface-variant">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-on-surface">{price}</span>
            {originalPrice && (
              <span className="text-[11px] text-outline line-through ml-1.5">{originalPrice}</span>
            )}
          </div>
          {isAdded ? (
            <button className="px-3 py-1 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container shadow-sm flex items-center gap-1">
              Added
              <Icon name="check" className="text-xs" />
            </button>
          ) : (
            <button className="px-3 py-1 bg-primary-fixed text-primary rounded-lg text-xs font-semibold hover:bg-primary-fixed-dim">
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CartItem({ color, textColor, name, price }: { color: string; textColor: string; name: string; price: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-outline-variant/20">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-md ${color} ${textColor} font-bold flex items-center justify-center text-[10px]`}>1x</span>
        <span className="font-medium text-on-surface">{name}</span>
      </div>
      <span className="font-semibold text-on-surface">{price}</span>
    </div>
  );
}
