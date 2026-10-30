// Only standalone operator labels are hidden in the reader. Inline source
// wording and the underlying extracted files are preserved.
export function isStandaloneOperator(text = "") {
  return /^(?:AND|OR)(?:\s*\/\s*(?:AND|OR))?$/i.test(text.trim());
}
