const specialties = {
  reference: "Reference",
  "chapter-one": "Emergency medicine",
  "chapter-two": "Anaesthesia & critical care",
  "chapter-three": "Haematology",
  "chapter-four": "Infectious diseases",
  "chapter-five": "Infectious diseases",
  "chapter-six": "Infectious diseases",
  "chapter-seven": "Infectious diseases",
  "chapter-eight": "Neurology",
  "chapter-nine": "Respiratory medicine",
  "chapter-ten": "Gastroenterology",
  "chapter-eleven": "Obstetrics & gynaecology",
  "chapter-twelve": "Sexual & reproductive health",
  "chapter-thirteen": "Dermatology",
  "chapter-fourteen": "Ophthalmology",
  "chapter-fifteen": "ENT & head and neck",
  "chapter-sixteen": "Oral & maxillofacial care",
  "chapter-seventeen": "Musculoskeletal medicine",
  "chapter-eighteen": "Trauma & orthopaedics",
  "chapter-nineteen": "Endocrinology & metabolism",
  "chapter-twenty": "Cardiology",
  "chapter-twenty-one": "Nephrology & urology",
  "chapter-twenty-two": "Oncology",
  "chapter-twenty-three": "Mental health",
  "chapter-twenty-four": "Nutrition",
  "chapter-twenty-five": "Toxicology",
  "chapter-twenty-six": "Rheumatology",
  "chapter-twenty-seven": "Neonatology",
};

export function specialtyFor(chapter) {
  return specialties[chapter?.id] || chapter?.title || "Clinical care";
}

export function articleBreadcrumb(entry, chapter) {
  const parentHeadings = Array.isArray(entry?.tocPath)
    ? entry.tocPath.slice(1, -1)
    : [];
  return [specialtyFor(chapter), ...parentHeadings, entry?.title].filter(Boolean);
}
