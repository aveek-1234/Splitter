import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

export function useFetchQuery<T>(query: Parameters<typeof useQuery>[0], args?: Parameters<typeof useQuery>[1]): {
  data: T | undefined;
  loading: boolean;
  error: string;
} {
  const response = useQuery(query, args);

  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
      console.log("Query Response:", response);
    if (response === undefined) {
      setLoading(true);
    } else if (response === null) {
      setLoading(false);
      setError("No data found");
    } else {
      setData(response as T);
      setLoading(false);
    }
  }, [response]);

  return {
    data,
    loading,
    error,
  };
}