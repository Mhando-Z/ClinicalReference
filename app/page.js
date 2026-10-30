import fs from "node:fs/promises";
import path from "node:path";
import ClinicalLibrary from "./components/clinical-library";

export default async function Home() {
  const catalog = JSON.parse(
    await fs.readFile(
      path.join(process.cwd(), "public/data/catalog.json"),
      "utf8",
    ),
  );
  return <ClinicalLibrary catalog={catalog} />;
}
