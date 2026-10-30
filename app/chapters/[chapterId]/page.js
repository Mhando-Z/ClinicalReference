import { notFound } from "next/navigation";
import { getCatalog } from "../../lib/catalog.mjs";
import ClinicalLibrary from "../../components/clinical-library";

export async function generateStaticParams() {
  return (await getCatalog()).chapters.map(({ id }) => ({ chapterId: id }));
}
export async function generateMetadata({ params }) {
  const { chapterId } = await params;
  const chapter = (await getCatalog()).chapters.find(
    (item) => item.id === chapterId,
  );
  return { title: `${chapter?.title || "Chapter"} | Clinical Reference` };
}
export default async function ChapterPage({ params }) {
  const { chapterId } = await params;
  if (!(await getCatalog()).chapters.some((item) => item.id === chapterId))
    notFound();
  return <ClinicalLibrary chapterId={chapterId} />;
}
