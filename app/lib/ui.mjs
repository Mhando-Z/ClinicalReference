export const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
export const primaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400";
export const iconButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-teal-300";
export const eyebrow =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";
export const panel =
  "rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900";
export const number = (value) => value.toLocaleString("en");
export const sectionHref = (id) => `/sections/${id}/`;
export const chapterHref = (id) => `/chapters/${id}/`;
export const readingTime = (words) =>
  `${Math.max(1, Math.ceil(words / 220))} min read`;
