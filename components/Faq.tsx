import { FAQ_ITEMS } from "@/lib/seo/site";

export default function Faq() {
  return (
    <div className="container mx-auto px-4 text-left">
      <div className="py-6 text-center">
        <h2 className="mx-auto max-w-3xl text-4xl font-bold md:text-5xl text-blue-700">
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-gray-500 md:text-xl">
          Common questions about splitting expenses, groups, and settling up with SplitterHub.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-6">
        {FAQ_ITEMS.map((item) => (
          <div key={item.question} className="border-b border-gray-200 pb-6 last:border-b-0">
            <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
            <p className="mt-2 text-gray-500 leading-relaxed">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
