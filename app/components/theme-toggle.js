"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { initializeTheme } from "../lib/theme.mjs";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(initializeTheme() === "dark");
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onStorage = (event) => {
      if (event.key === "clinical-theme" || event.key === null) sync();
    };
    media.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setDark(next === "dark");
    try {
      window.localStorage.setItem("clinical-theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label="Dark theme"
      aria-pressed={dark}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
    >
      <Moon className="theme-icon-moon" size={19} />
      <Sun className="theme-icon-sun" size={19} />
    </button>
  );
}
