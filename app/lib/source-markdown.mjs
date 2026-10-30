// Escape source text before adding formatting. Source punctuation is content,
// never an instruction to create links, HTML, emphasis, or other Markdown.
export function escapeMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(
      /[\\`*_{}\[\]<>()#+.!|~=-]/g,
      (character) => `&#${character.charCodeAt(0)};`,
    )
    .replace(/\t/g, "&#9;")
    .replace(/^ +/gm, (spaces) => "&#32;".repeat(spaces.length));
}

export function supportsMarkdown(block) {
  const runs = block.runs || [];
  for (let index = 1; index < runs.length; index++) {
    const previous = runs[index - 1];
    const current = runs[index];
    const changesStyle =
      Boolean(previous.bold) !== Boolean(current.bold) ||
      Boolean(previous.italic) !== Boolean(current.italic);
    // Markdown delimiters cannot reliably reproduce Word's emphasis changes
    // inside a word or next to punctuation. Keep the rich-text representation.
    if (changesStyle && /\S$/.test(previous.text) && /^\S/.test(current.text))
      return false;
  }
  return (
    (block.type === "heading" || block.type === "paragraph") &&
    !block.contentsEntry &&
    !block.runs?.some((run) => run.vertical) &&
    // Complex multi-line emphasis and whitespace stay with the source renderer.
    !/[\r\n]/.test(block.text || "")
  );
}

export function sourceMarkdown(block) {
  const groups = [];
  for (const run of block.runs?.length
    ? block.runs
    : [{ text: block.text || "" }]) {
    const previous = groups.at(-1);
    if (
      previous &&
      Boolean(previous.bold) === Boolean(run.bold) &&
      Boolean(previous.italic) === Boolean(run.italic)
    ) {
      previous.text += run.text;
    } else groups.push({ ...run });
  }
  const content = groups
    .map((run) => {
      const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text);
      const [, leading, core, trailing] = match;
      const marker =
        run.bold && run.italic
          ? "***"
          : run.bold
            ? "**"
            : run.italic
              ? "*"
              : "";
      return (
        escapeMarkdown(leading) +
        (core ? marker + escapeMarkdown(core) + marker : "") +
        escapeMarkdown(trailing)
      );
    })
    .join("");
  if (block.type === "heading")
    return `${block.level <= 2 ? "##" : "###"} ${content}`;
  return content;
}
