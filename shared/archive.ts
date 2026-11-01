export interface ArchivePublication {
  id: string;
  code: string;
  name: string;
  shortName: string;
  yearRange: string;
}

export const ARCHIVE_PUBLICATIONS: ArchivePublication[] = [
  {
    id: "annual-debate",
    code: "DBT",
    name: "Annual Debate",
    shortName: "Annual Debate",
    yearRange: "1905",
  },
  {
    id: "anthro",
    code: "ANT",
    name: "Anthro Magazine",
    shortName: "Anthro",
    yearRange: "2019-Present",
  },
  {
    id: "cmag",
    code: "CMG",
    name: "C Magazine",
    shortName: "C Mag",
    yearRange: "October 2010-Present",
  },
  {
    id: "campanile-features",
    code: "CFM",
    name: "Campanile Features Magazine",
    shortName: "Campanile Features",
    yearRange: "1979",
  },
  {
    id: "course-of-study",
    code: "COS",
    name: "Course of Study",
    shortName: "Course of Study",
    yearRange: "1909",
  },
  {
    id: "madrono-pamphlet",
    code: "MAD",
    name: "Madrono Pamphlet",
    shortName: "Madrono Pamphlet",
    yearRange: "1902-1918",
  },
  {
    id: "madrono-yearbook",
    code: "MYB",
    name: "Madrono Yearbook",
    shortName: "Madrono",
    yearRange: "1919-Present",
  },
  {
    id: "movement-against-student-suspensions",
    code: "MVS",
    name: "Movement Against Student Suspensions",
    shortName: "Student Suspensions",
    yearRange: "1970",
  },
  {
    id: "power-to-students",
    code: "PTS",
    name: "Power to Students",
    shortName: "Power to Students",
    yearRange: "1970",
  },
  {
    id: "proof",
    code: "PRO",
    name: "[proof]",
    shortName: "[proof]",
    yearRange: "2016, 2018, 2022",
  },
  {
    id: "public-school-gazette",
    code: "GAZ",
    name: "Public School Gazette",
    shortName: "Public School Gazette",
    yearRange: "1895",
  },
  {
    id: "radical-rag",
    code: "RRG",
    name: "Radical Rag",
    shortName: "Radical Rag",
    yearRange: "1969-1970",
  },
  {
    id: "radio-free-heaven",
    code: "RFH",
    name: "Radio Free Heaven",
    shortName: "Radio Free Heaven",
    yearRange: "1968",
  },
  {
    id: "red-and-green",
    code: "RAG",
    name: "Red and Green",
    shortName: "Red and Green",
    yearRange: "1901",
  },
  {
    id: "school-handbook",
    code: "HAN",
    name: "School Handbook",
    shortName: "School Handbook",
    yearRange: "1937",
  },
  {
    id: "solidarity",
    code: "SOL",
    name: "Solidarity",
    shortName: "Solidarity",
    yearRange: "1982",
  },
  {
    id: "campanile-special-editions",
    code: "CAMSPEC",
    name: "Special Editions of the Campanile Newspaper",
    shortName: "Campanile Specials",
    yearRange: "1965",
  },
  {
    id: "sphinx",
    code: "SPH",
    name: "Sphinx",
    shortName: "Sphinx",
    yearRange: "1902",
  },
  {
    id: "student-body-review",
    code: "SBR",
    name: "Student Body Review",
    shortName: "Student Body Review",
    yearRange: "1969-1970",
  },
  {
    id: "campanile",
    code: "CAM",
    name: "The Campanile",
    shortName: "Campanile",
    yearRange: "1919-Present",
  },
  {
    id: "palo-alto-statement",
    code: "STM",
    name: "The Palo Alto Statement",
    shortName: "Palo Alto Statement",
    yearRange: "1895",
  },
  {
    id: "palyvoice",
    code: "VOI",
    name: "The Paly Voice",
    shortName: "Paly Voice",
    yearRange: "2001-Spring 2023",
  },
  {
    id: "sequanile",
    code: "SEQ",
    name: "The Sequanile",
    shortName: "Sequanile",
    yearRange: "1932-1952",
  },
  {
    id: "verde",
    code: "VERDE",
    name: "Verde Magazine",
    shortName: "Verde",
    yearRange: "1999-Present",
  },
  {
    id: "veritas",
    code: "VIT",
    name: "Veritas",
    shortName: "Veritas",
    yearRange: "2018-2019, 2023-Present",
  },
  {
    id: "viaverde",
    code: "VIA",
    name: "Via Verde",
    shortName: "Via Verde",
    yearRange: "2018-2019, 2023-Present",
  },
  {
    id: "viking",
    code: "VIK",
    name: "Viking Sports Magazine",
    shortName: "Viking",
    yearRange: "2007-Present",
  },
];

export function getArchivePublicationByCode(
  code: string,
): ArchivePublication | undefined {
  return ARCHIVE_PUBLICATIONS.find((publication) => publication.code === code);
}
