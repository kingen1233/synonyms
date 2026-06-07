import { useGetAllWords } from '../api/generated/synonyms/synonyms';

const STALE_MS = 8_000;
const GC_MS = 5 * 60 * 1_000;

export function useWordsList() {
  const query = useGetAllWords({
    query: { staleTime: STALE_MS, gcTime: GC_MS, refetchOnWindowFocus: true },
  });
  return {
    words: query.data?.words ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
