import Link from "next/link";
import Image from "next/image";
import { Icon } from "./Icon";

export function CTASection() {
  return (
    <section className="w-full bg-gradient-to-br from-primary via-secondary to-[#431407]/40 py-24 text-on-primary relative overflow-hidden" id="contact-cta">
      {/* Ambient glowing spheres */}
      <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/15 blur-2xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />

      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
        {/* Dreambiz Logo Mark */}
        <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-xl p-3">
          <Image
            src="/logo.png"
            alt="Dreambiz"
            width={64}
            height={64}
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>

        <h2 className="font-[var(--font-plus-jakarta)] text-4xl md:text-[56px] md:leading-[64px] text-on-primary max-w-2xl font-semibold tracking-tight">
          Ready to take your business online?
        </h2>
        <p className="mt-5 text-lg leading-7 text-primary-fixed max-w-xl">
          Let&apos;s build your digital storefront together. Tell us about your business and we will show you what is possible.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="https://calendar.app.google/sFVi9ragoa8fguBM7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-14 px-10 rounded-xl font-bold text-base text-primary bg-white hover:bg-surface-bright shadow-[0_12px_36px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-100 transition-all duration-200"
          >
            Book Demo
            <Icon name="arrow_forward" className="ml-2" />
          </Link>
        </div>

        <p className="mt-5 text-xs text-primary-fixed-dim/80">
          Personalized onboarding • Dedicated local support team • Seamless migration
        </p>
      </div>
    </section>
  );
}
