import {
  Header,
  Footer,
  HeroSection,
  TrustSection,
  CoreFeaturesSection,
  DashboardShowcaseSection,
  HowItWorksSection,
  PaymentsSection,
  BusinessControlSection,
  WhyPlatformSection,
  CTASection,
} from "@/components";

export default function Home() {
  return (
    <>
      <Header />
      <main className="w-full pt-20 flex-1 bg-surface">
        <div className="flex flex-col w-full">
          <HeroSection />
          <TrustSection />
          <CoreFeaturesSection />
          <DashboardShowcaseSection />
          <HowItWorksSection />
          <PaymentsSection />
          <BusinessControlSection />
          <WhyPlatformSection />
          <CTASection />
        </div>
      </main>
      <Footer />
    </>
  );
}
