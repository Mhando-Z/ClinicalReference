import ClinicalLibrary from "../components/clinical-library";
export const metadata = { title: "Recently viewed | Clinical Reference" };
export default function RecentPage() {
  return <ClinicalLibrary view="recent" />;
}
