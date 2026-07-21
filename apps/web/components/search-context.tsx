"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * 헤더 검색과 자산 목록을 잇는 전역 검색 상태.
 * 브라우저 스토리지 금지 규칙에 따라 React state로만 유지한다.
 */
interface SearchState {
  query: string;
  setQuery: (v: string) => void;
}

const SearchContext = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch(): SearchState {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch는 SearchProvider 안에서만 사용한다");
  return ctx;
}
