import React from "react";
import { FEATURES } from "@/lib/constants/features";
import { Card } from "./ui/card";

function Features() {
  return (
    <div className="container mx-auto text-center px-4">
      <div className="py-6">
        <h2 className="mx-auto max-w-3xl text-4xl font-bold md:text-5xl text-blue-700">
          Track shared bills, groups, and settlements
        </h2>
      </div>

      <div className="py-4">
        <p className="mx-auto max-w-2xl text-gray-500 md:text-xl">
          Everything you need to split expenses fairly—group bills, smart settle-ups,
          spending insights, and real-time updates.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {FEATURES.map((feature, index) => {
          const FeatureIcon = feature.Icon;
          return (
            <Card key={feature.title ?? index}>
              <div className="flex items-start gap-4 p-6 text-left">
                <div className={`${feature.bg} rounded-md p-3`}>
                  <FeatureIcon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default Features;
