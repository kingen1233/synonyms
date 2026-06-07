import { useGetSynonyms } from '../api/generated/synonyms/synonyms';

export function useSynonymsFor(word: string | null) {
  const query = useGetSynonyms(word ?? '', {
    query: { enabled: Boolean(word) },
  });

  const result = query.data;
  const direct = result?.directSynonyms ?? [];
  const transitive = result?.transitiveSynonyms ?? [];

  return {
    result,
    direct,
    transitive,
    totalSynonyms: direct.length + transitive.length,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
  };
}
