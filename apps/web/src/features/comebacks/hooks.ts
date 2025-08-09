import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";

// Shapes returned by your API
type Summary = {
  total: number;
  byType:   { type: string;   count: number }[];
  byStatus: { status: string; count: number }[];
  byDay:    { date: string;   count: number }[];
};

type ListResponse = {
  items: any[];
  page: number;
  limit: number;
  pages: number;
};

export function useSummary(params: URLSearchParams) {
  const qs = params.toString();
  return useQuery<Summary>({
    queryKey: ["comebacks", "summary", qs],
    queryFn: () => apiGet<Summary>(`/comebacks/summary${qs ? `?${qs}` : ""}`),
  });
}

export function useList(params: URLSearchParams) {
  const qs = params.toString();
  return useQuery<ListResponse>({
    queryKey: ["comebacks", "list", qs],
    queryFn: () => apiGet<ListResponse>(`/comebacks${qs ? `?${qs}` : ""}`),
  });
}
