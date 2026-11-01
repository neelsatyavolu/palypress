export interface CampusArea {
  id: string;
  name: string;
  rooms: string[];
  description: string;
}

// Paly campus buildings/areas
export const CAMPUS_AREAS: CampusArea[] = [
  {
    id: "mac",
    name: "Media Arts Center (MAC)",
    rooms: ["170", "171", "172", "173", "174", "175"],
    description: "Media production, journalism, photography",
  },
  {
    id: "pac",
    name: "Performing Arts Center",
    rooms: ["PAC", "Choir Room", "Band Room"],
    description: "Theater, music, dance performances",
  },
  {
    id: "tower",
    name: "Tower Building",
    rooms: ["Art Studios"],
    description: "Visual arts, ceramics, drawing",
  },
  {
    id: "library",
    name: "Library",
    rooms: ["549", "550", "551"],
    description: "Study spaces, computer lab, research",
  },
  {
    id: "science",
    name: "Science Building",
    rooms: ["1700s"],
    description: "Biology, chemistry, physics labs",
  },
  {
    id: "socialscience",
    name: "Social Science",
    rooms: ["850s"],
    description: "History, economics, psychology",
  },
  {
    id: "main",
    name: "Main Building",
    rooms: ["800s", "400s"],
    description: "Classrooms, English, Math",
  },
  {
    id: "gym",
    name: "Gymnasium",
    rooms: ["Large Gym", "Small Gym", "Weight Room"],
    description: "PE classes, sports, athletics",
  },
  {
    id: "pool",
    name: "Swimming Pool",
    rooms: ["Pool"],
    description: "Swim classes, water polo",
  },
  {
    id: "quad",
    name: "Quad",
    rooms: [],
    description: "Central gathering area",
  },
  {
    id: "office",
    name: "Main Office",
    rooms: ["Front Office", "Counseling"],
    description: "Administration, student services",
  },
];
