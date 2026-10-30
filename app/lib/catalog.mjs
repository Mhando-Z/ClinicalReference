import "server-only";
import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";

export const getCatalog = cache(async () =>
  JSON.parse(
    await fs.readFile(
      path.join(process.cwd(), "public/data/catalog.json"),
      "utf8",
    ),
  ),
);

export async function getSection(id) {
  const catalog = await getCatalog();
  if (!catalog.sections.some((entry) => entry.id === id)) return null;
  return JSON.parse(
    await fs.readFile(
      path.join(process.cwd(), "public/data/sections", `${id}.json`),
      "utf8",
    ),
  );
}
