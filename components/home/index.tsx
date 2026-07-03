import CTA from "@/components/home/CTA";
import FAQ from "@/components/home/FAQ";
import Features from "@/components/home/Features";
import Hero from "@/components/home/Hero";
import Testimonials from "@/components/home/Testimonials";
import UseCases from "@/components/home/UseCases";
import { PricingByGroup } from "@/components/pricing";
import { BG1 } from "@/components/shared/BGs";
import { siteConfig } from "@/config/site";
import { getMessages, getTranslations } from "next-intl/server";

type FAQItem = { question: string; answer: string };

export default async function HomeComponent() {
  const messages = await getMessages();
  const t = await getTranslations("Home");
  const faqItems: FAQItem[] = messages.Landing?.FAQ?.items ?? [];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: t("title"),
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description: t("description"),
      url: siteConfig.url,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <div className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BG1 />

      {messages.Landing.Hero && <Hero />}

      {messages.Landing.Features && <Features />}

      {messages.Landing.UseCases && <UseCases />}

      {messages.Pricing && <PricingByGroup />}

      {messages.Landing.Testimonials && <Testimonials />}

      {messages.Landing.FAQ && <FAQ />}

      {messages.Landing.CTA && <CTA />}
    </div>
  );
}
