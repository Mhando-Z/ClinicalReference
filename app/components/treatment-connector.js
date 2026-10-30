import { createElement } from "react";

// Show source operators verbatim. Do not regroup treatments or infer scope.
export default function TreatmentConnector({ block, children }) {
  const operator = block.text.trim().toUpperCase();
  const kind =
    operator === "OR"
      ? "alternative"
      : operator === "AND" || operator === "PLUS"
        ? "combined"
        : "mixed";
  return createElement(
    "div",
    {
      id: block.id,
      className: `source-block  treatment-connector connector-${kind}`,
    },
    createElement("span", { className: "connector-line", "aria-hidden": true }),
    createElement(
      "p",
      { className: "connector-label" },
      children || block.text,
    ),
    createElement("span", { className: "connector-line", "aria-hidden": true }),
  );
}
