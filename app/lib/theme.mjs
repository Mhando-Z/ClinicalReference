// Self-contained so the same function can run before the first paint.
export function initializeTheme() {
  let preference;
  try {
    preference = window.localStorage.getItem("clinical-theme");
  } catch {}
  const theme =
    preference === "dark" || preference === "light"
      ? preference
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.dataset.theme = theme;
  return theme;
}

export const themeScript = `(${initializeTheme.toString()})();`;
