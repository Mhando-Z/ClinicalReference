import { notFound } from "next/navigation";
import { getCatalog, getSection } from "../../lib/catalog.mjs";
import SectionReader from "../../components/section-reader";

export async function generateStaticParams() {
  return (await getCatalog()).sections.map(({ id }) => ({ sectionId: id }));
}
export async function generateMetadata({ params }) {
  const { sectionId } = await params;
  const entry = (await getCatalog()).sections.find(
    (item) => item.id === sectionId,
  );
  return {
    title: `${entry?.title || "Section"} | Clinical Reference`,
    description: entry?.excerpt,
  };
}
export default async function SectionPage({ params }) {
  const { sectionId } = await params;
  const section = await getSection(sectionId);
  if (!section) notFound();
  return <SectionReader key={section.id} section={section} />;
}
