import Link from "next/link";
import { BookOpen } from "lucide-react";
import { primaryButton } from "./lib/ui.mjs";
export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <BookOpen className="mx-auto mb-5 text-teal-600" size={36} />
      <h1 className="text-3xl font-semibold tracking-tight">
        This page could not be found.
      </h1>
      <p className="mt-3 mb-7 text-slate-500">
        Return to the library to find a chapter or section.
      </p>
      <Link href="/" className={primaryButton}>
        Browse guidelines
      </Link>
    </div>
  );
}
