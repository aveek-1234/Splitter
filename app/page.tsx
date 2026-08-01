import type { Metadata } from "next";
import Features from "@/components/Features";
import Faq from "@/components/Faq";
import HeroComponent from "@/components/HeroComponent";
import Steps from "@/components/Steps";
import {
  FAQ_ITEMS,
  HOME_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo/site";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
  },
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="flex flex-col pt-16">
        <section className="pt-6 md:pt-8 pb-12 md:pb-16 px-4">
          <HeroComponent />
        </section>

        <section id="features" className="bg-gray-50 py-16 md:py-20">
          <Features />
        </section>

        <section id="how-it-works" className="bg-gray-50 py-16 md:py-20">
          <Steps />
        </section>

        <section id="faq" className="py-16 md:py-20">
          <Faq />
        </section>
      </div>
    </>
  );
}
