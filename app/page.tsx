import Features from "@/components/Features";
import HeroComponent from "@/components/HeroComponent";
import Steps from "@/components/Steps";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col pt-16">
      <section className="pt-6 md:pt-8 pb-12 md:pb-16 px-4">
        <HeroComponent />
      </section>
      
      <section id="features" className="bg-gray-50 py-16 md:py-20">
        <Features />
      </section>
      
      <section id="steps" className="bg-gray-50 py-16 md:py-20">
        <Steps />
      </section>
    </div>
  );
}
