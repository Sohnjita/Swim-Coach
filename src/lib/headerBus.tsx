"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

interface HeaderContent {
  title: string;
  leading?: ReactNode;
  action?: ReactNode;
}

interface HeaderEntry extends HeaderContent {
  owner: symbol;
}

interface HeaderBusValue {
  entry: HeaderEntry | null;
  setHeader: (owner: symbol, content: HeaderContent) => void;
  clearHeader: (owner: symbol) => void;
}

const HeaderBusContext = createContext<HeaderBusValue | null>(null);

/**
 * Holds the "currently active page's" header content (title/leading/action)
 * so AppShell can render it in a fixed band, outside the scrollable/animated
 * page content. The entering page always wins immediately on mount — no
 * waiting for the exiting page's transition to finish — and a page's own
 * unmount only clears the header if nothing newer has claimed it since.
 */
export function HeaderBusProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<HeaderEntry | null>(null);

  function setHeader(owner: symbol, content: HeaderContent) {
    setEntry({ owner, ...content });
  }

  function clearHeader(owner: symbol) {
    setEntry((prev) => (prev?.owner === owner ? null : prev));
  }

  return (
    <HeaderBusContext.Provider value={{ entry, setHeader, clearHeader }}>
      {children}
    </HeaderBusContext.Provider>
  );
}

export function useHeaderEntry(): HeaderEntry | null {
  const ctx = useContext(HeaderBusContext);
  if (!ctx) throw new Error("useHeaderEntry must be used within HeaderBusProvider");
  return ctx.entry;
}

/** Publishes this page's header content into the fixed top band. */
export function useSetHeader(content: HeaderContent) {
  const ctx = useContext(HeaderBusContext);
  if (!ctx) throw new Error("useSetHeader must be used within HeaderBusProvider");
  const [owner] = useState(() => Symbol("header-owner"));

  useLayoutEffect(() => {
    ctx.setHeader(owner, content);
    return () => ctx.clearHeader(owner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.title, content.leading, content.action]);
}
