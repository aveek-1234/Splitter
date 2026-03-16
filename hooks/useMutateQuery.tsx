import { useState } from "react";
import { useMutation } from "convex/react";
import { FunctionReference } from "convex/server";

export function useMutateQuery<
  TMutation extends FunctionReference<"mutation">
>(mutation: TMutation) {
  const mutateConvex = useMutation(mutation);

  const [data, setData] = useState<
    Awaited<ReturnType<typeof mutateConvex>> | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (
    ...args: Parameters<typeof mutateConvex>
  ): Promise<Awaited<ReturnType<typeof mutateConvex>> | undefined> => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutateConvex(...args);
      setData(result);
      return result;
    } catch (err) {
      setError((err as Error).message ?? "An error occurred");
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, mutate };
}
