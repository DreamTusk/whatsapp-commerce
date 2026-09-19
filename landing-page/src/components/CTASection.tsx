import Link from "next/link";
import Image from "next/image";
import { Icon } from "./Icon";

export function CTASection() {
  return (
    <section className="w-full aspect-[887/1773] md:aspect-[3/1] text-on-primary relative isolate overflow-hidden bg-gradient-to-br from-primary via-secondary to-[#431407]/40" id="contact-cta">
      {/* Banner Background - mobile */}
      <Image
        src="/images/banner2.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover -z-10 md:hidden"
      />
      {/* Banner Background - desktop */}
      <Image
        src="/images/banner1-wide.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover -z-10 hidden md:block"
      />

      <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8 relative z-10 pt-12 pb-10 md:py-0 md:h-full md:flex md:items-center">
        <div className="max-w-lg flex flex-col items-start text-left">
          {/* Dreambiz Logo Mark */}
          <Image
            src="/images/logo_-removebg-preview.png"
            alt="Dreambiz"
            width={64}
            height={64}
            className="mb-6 object-contain drop-shadow-lg"
          />

          <h2 className="font-[var(--font-plus-jakarta)] text-4xl md:text-[56px] md:leading-[64px] text-on-primary font-semibold tracking-tight">
            Ready to take your business online?
          </h2>
          <p className="mt-5 text-lg leading-7 text-primary-fixed max-w-xl">
            Let&apos;s build your digital storefront together. Tell us about your business and we will show you what is possible.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
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
      </div>
    </section>
  );
}
