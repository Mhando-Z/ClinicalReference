import ClinicalLibrary from "../components/clinical-library";
export const metadata = { title: "Saved sections | Clinical Reference" };
export default function SavedPage() {
  return <ClinicalLibrary view="saved" />;
}
