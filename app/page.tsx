import Features from "@/components/Features";
import HeroComponent from "@/components/HeroComponent";
import Steps from "@/components/Steps";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col pt-16">
      <section className="mt-20 pb-12 space-y-10 md:space-y-20 px-5">
        <HeroComponent />
      </section>
      <section id="features" className="bg-gray-50 py-20">
        <Features />
      </section>
      <section id="steps" className="bg-gray-50 py-20">
        <Steps />
      </section>
    </div>
  );
}
