"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

export default function WorkspaceProvider({ catalog, children }) {
  const key = `clinical-bookmarks-${catalog.metadata.sha256.slice(0, 12)}`;
  const recentKey = `clinical-recent-${catalog.metadata.sha256.slice(0, 12)}`;
  const [bookmarks, setBookmarks] = useState([]);
  const [recent, setRecent] = useState([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    function read() {
      try {
        const validIds = new Set(catalog.sections.map((entry) => entry.id));
        const load = (name) => {
          const value = JSON.parse(localStorage.getItem(name) || "[]");
          return Array.isArray(value)
            ? [...new Set(value.filter((id) => validIds.has(id)))]
            : [];
        };
        setBookmarks(load(key));
        setRecent(load(recentKey).slice(0, 20));
      } catch {
        setStorageError(
          "Browser storage is unavailable. Saved sections and history will last for this visit.",
        );
      }
      setReady(true);
    }
    read();
    const onStorage = (event) => {
      if ([key, recentKey, null].includes(event.key)) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [catalog, key, recentKey]);

  function persist(name, value) {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      setStorageError(
        "Your changes will only last for this visit because browser storage is unavailable.",
      );
    }
  }
  function toggleBookmark(id) {
    const next = bookmarks.includes(id)
      ? bookmarks.filter((item) => item !== id)
      : [...bookmarks, id];
    setBookmarks(next);
    persist(key, next);
  }
  const markRecent = useCallback((id) => {
    setRecent((previous) => {
      if (previous[0] === id) return previous;
      return [id, ...previous.filter((item) => item !== id)].slice(0, 20);
    });
  }, []);
  useEffect(() => {
    if (ready) persist(recentKey, recent);
  }, [ready, recent, recentKey]);
  function clearRecent() {
    setRecent([]);
    persist(recentKey, []);
  }
  return (
    <WorkspaceContext.Provider
      value={{
        catalog,
        bookmarks,
        recent,
        ready,
        storageError,
        toggleBookmark,
        markRecent,
        clearRecent,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
