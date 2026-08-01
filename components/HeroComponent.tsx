import Image from "next/image";
import React from "react";
import HeroImage from "../assets/images/hero.jpg";

function HeroComponent() {
  return (
    <div className="container mx-auto text-center px-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 md:text-base">
        SplitterHub
      </p>

      <div className="py-6">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold md:text-6xl text-blue-700">
          Split group expenses without the awkward math
        </h1>
      </div>

      <div className="py-4">
        <p className="mx-auto max-w-2xl text-gray-500 md:text-xl">
          Split bills with friends, roommates, and trip groups in seconds. Track shared
          expenses, see who owes what, and settle up fairly—all in one place.
        </p>
      </div>

      <div className="py-8">
        <Image
          src={HeroImage}
          className="rounded-lg mx-auto w-full max-w-4xl"
          alt="SplitterHub expense splitting dashboard showing shared bills and balances among friends"
          width={1280}
          height={720}
          priority
        />
      </div>
    </div>
  );
}

export default HeroComponent;
