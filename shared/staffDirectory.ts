// Staff Directory Data extracted from Paly website
export interface StaffMember {
  name: string;
  email: string;
  title: string;
}

export interface StaffDepartment {
  id: string;
  name: string;
  staff: StaffMember[];
}

export const STAFF_DIRECTORY: StaffDepartment[] = [
  {
    id: "administration",
    name: "Administration",
    staff: [
      { name: "Brent Kline", email: "bkline@pausd.org", title: "High School Principal" },
      { name: "Jerry Berkson", email: "jberkson@pausd.org", title: "Assistant Principal" },
      { name: "La Donna Butler", email: "lbutler@pausd.org", title: "Assistant Principal" },
      { name: "Rebecca Shen-Lorenson", email: "rshen-lorenson@pausd.org", title: "Assistant Principal" },
      { name: "Michael Stieren", email: "mstieren@pausd.org", title: "Assistant Principal" },
    ],
  },
  {
    id: "frontoffice",
    name: "Front Office",
    staff: [
      { name: "Christa Brown", email: "cbrown@pausd.org", title: "Principal's Office" },
      { name: "Yulissa Chavez", email: "ychavez@pausd.org", title: "Front Office" },
    ],
  },
  {
    id: "attendance",
    name: "Attendance",
    staff: [
      { name: "Sandra Dunlap", email: "sdunlap@pausd.org", title: "Attendance" },
      { name: "Nancy Scola", email: "nscola@pausd.org", title: "Attendance; Math & Science Secretary" },
    ],
  },
  {
    id: "campus_supervisors",
    name: "Campus Supervisors",
    staff: [
      { name: "Carl Hubenthal", email: "chubenthal@pausd.org", title: "Lead Campus Supervisor" },
      { name: "Edgar Gonzalez", email: "edgonzalez@pausd.org", title: "Campus Supervisor" },
      { name: "Mayerly Short", email: "mshort@pausd.org", title: "Campus Supervisor" },
    ],
  },
  {
    id: "college_career",
    name: "College & Career",
    staff: [
      { name: "Sandra Cernobori", email: "scernobori@pausd.org", title: "College and Career Advisor" },
      { name: "Janet Cochrane", email: "jcochrane@pausd.org", title: "College and Career Advisor" },
    ],
  },
  {
    id: "custodial",
    name: "Custodial Staff",
    staff: [
      { name: "Tee Chi", email: "tchi@pausd.org", title: "Custodial Supervisor" },
    ],
  },
  {
    id: "guidance",
    name: "Guidance",
    staff: [
      { name: "Pamela Garcia", email: "pgarcia@pausd.org", title: "Guidance Secretary" },
      { name: "Karla Larson", email: "klarson@pausd.org", title: "Registrar" },
      { name: "Ann Deggelman", email: "adeggelman@pausd.org", title: "Teacher Advisor Program Specialist" },
      { name: "James Hamilton", email: "jhamilton@pausd.org", title: "Counselor (Be - Gr)" },
      { name: "Crystal Laguna", email: "claguna@pausd.org", title: "Counselor (A-Be, College Pathways)" },
      { name: "Jillian Bischoff", email: "jbischoff@pausd.org", title: "Counselor (She-Z)" },
      { name: "Selene Singares", email: "ssingares@pausd.org", title: "Counselor (Gro-Lo)" },
      { name: "Charles Taylor", email: "chtaylor@pausd.org", title: "Counselor (Lu-Sha)" },
      { name: "Jaime Fanciullo", email: "jfanciullo@pausd.org", title: "Psychologist" },
      { name: "Pamela Lin", email: "plin@pausd.org", title: "Psychologist" },
      { name: "Hector Mora", email: "hmora@pausd.org", title: "Psychologist" },
    ],
  },
  {
    id: "it",
    name: "Information Technology",
    staff: [
      { name: "Kristine Ludemann", email: "kludemann@pausd.org", title: "Academic Tech Specialist" },
      { name: "Frank Gonzales", email: "fgonzales@pausd.org", title: "Computer Support Specialist" },
      { name: "Robert Leung", email: "rleung@pausd.org", title: "Computer Support Specialist" },
    ],
  },
  {
    id: "student_supports",
    name: "Student Supports",
    staff: [
      { name: "Alyssa Bond", email: "abond@pausd.org", title: "Activities Director" },
      { name: "Scott Davis", email: "scdavis@pausd.org", title: "Athletic Director" },
      { name: "Justine Iongi", email: "jiongi@pausd.org", title: "Athletic Trainer" },
      { name: "Beth Martin", email: "bmartin@pausd.org", title: "Volunteer Services Asst" },
      { name: "Sima Thomas", email: "sthomas@pausd.org", title: "Librarian" },
      { name: "Monica Casey", email: "mcasey@pausd.org", title: "Library Assistant" },
      { name: "Deborah Henry", email: "dhenry@pausd.org", title: "Library Assistant" },
      { name: "Kindel Launer", email: "klauner@pausd.org", title: "Literacy TOSA, EL Coordinator, English" },
      { name: "YJ Lee", email: "yjlee@pausd.org", title: "Tower Learning Center/Math Interventionist" },
      { name: "Nadine Jefferson", email: "njefferson@pausd.org", title: "Testing Center Asst" },
      { name: "Sheryl Loftin-Booth", email: "sloftinbooth@pausd.org", title: "Testing Center Asst" },
      { name: "Lisa Stone", email: "lstone@pausd.org", title: "Budget Clerk/Secretary" },
      { name: "Maryellen Bena", email: "mbena@pausd.org", title: "Testing and Accommodation Support" },
      { name: "Stacey Davidson", email: "stdavidson@pausd.org", title: "Student and Family Engagement (SaFe)" },
      { name: "Michael Martin", email: "mimartin@pausd.org", title: "Student and Family Engagement (SaFe)" },
      { name: "Melenaite Tupou", email: "mtupou@pausd.org", title: "Student and Family Engagement (SaFe)" },
    ],
  },
  {
    id: "wellness",
    name: "Wellness/Mental Health",
    staff: [
      { name: "Andrea Barker", email: "abarker@pausd.org", title: "Mental Health Specialist" },
      { name: "Ingrid Katz", email: "ikatz@pausd.org", title: "Health Technician" },
    ],
  },
  {
    id: "cte",
    name: "Career & Technical Education",
    staff: [
      { name: "Christopher Bell", email: "cbell@pausd.org", title: "Teacher - Career & Tech Educat,Teacher, Instructional Lead, TOSA" },
      { name: "Lucy Filppu", email: "lfilppu@pausd.org", title: "Teacher - English,Teacher Advisor" },
      { name: "Rachael Kaci", email: "rkaci@pausd.org", title: "Teacher - Adv Authentic Resear,Teacher - Work Experience" },
      { name: "Paul Kandell", email: "pkandell@pausd.org", title: "Teacher - Career & Tech Educat,Teacher - Production,Teacher Advisor" },
      { name: "Doyle Knight", email: "dknight@pausd.org", title: "Teacher - Career & Tech Educat" },
      { name: "Roxanne Lanzot", email: "rlanzot@pausd.org", title: "Teacher - AVID/FOS,Teacher - Career & Tech Educat" },
      { name: "Hilary Mcdaniel", email: "hmcdaniel@pausd.org", title: "Teacher - Adv Authentic Resear,Teacher - Social Science" },
      { name: "Theresa Mcdermott", email: "tmcdermott@pausd.org", title: "Teacher - Career & Tech Educat,Teacher - English, Teacher Advisor" },
      { name: "Jennifer Pierson", email: "jpierson@pausd.org", title: "Teacher - Career & Tech Educat" },
      { name: "Rodney Satterthwaite", email: "rsatterthwaite@pausd.org", title: "Teacher - Career & Tech Educat,Teacher - Production,Teacher Advisor" },
    ],
  },
  {
    id: "english",
    name: "English",
    staff: [
      { name: "Richard Rodriguez", email: "rirodriguez@pausd.org", title: "Teacher - English,Teacher - Instructional Lead" },
      { name: "Wendy Breu", email: "wbreu@pausd.org", title: "Typist Clerk III" },
      { name: "Erin Angell", email: "eangell@pausd.org", title: "Teacher - Adv Authentic Resear,Teacher - Career & Tech Educat,Teacher - TOSA,Teacher Advisor" },
      { name: "Sarah Bartlett", email: "sbartlett@pausd.org", title: "Teacher - English" },
      { name: "Bekki Casalco", email: "bcasalco@pausd.org", title: "Teacher - English" },
      { name: "David Cohen", email: "dcohen@pausd.org", title: "Teacher - English,Teacher Advisor" },
      { name: "Lizzie DeKraai", email: "ldekraai@pausd.org", title: "Teacher - English, Teacher Advisor" },
      { name: "Joshua Knowles Hinrichs", email: "jknowleshinrichs@pausd.org", title: "Teacher - English" },
      { name: "Karin Kolb", email: "kkolb@pausd.org", title: "Teacher - English, Teacher Advisor" },
      { name: "Melissa Laptalo", email: "mlaptalo@pausd.org", title: "Teacher - English" },
      { name: "Mimi Park", email: "mpark@pausd.org", title: "Teacher - English,Teacher Advisor" },
      { name: "Hunter Reardon", email: "hreardon@pausd.org", title: "Teacher - AVID/FOS,Teacher - English, Teacher Advisor" },
      { name: "Kari Snell", email: "ksnell@pausd.org", title: "Teacher - English, Teacher Advisor" },
      { name: "Keith Tocci", email: "ktocci@pausd.org", title: "Teacher - English" },
      { name: "Shirley Tokheim", email: "stokheim@pausd.org", title: "Teacher - English" },
      { name: "Marc Tolentino", email: "mtolentino@pausd.org", title: "Teacher - English,Teacher Advisor" },
      { name: "Alanna Williamson", email: "awilliamson@pausd.org", title: "Teacher - English" },
    ],
  },
  {
    id: "history",
    name: "History/Social Science",
    staff: [
      { name: "Ken Tinsley", email: "ktinsley@pausd.org", title: "Teacher - Social Science - Instructional Lead" },
      { name: "Grant Blackburn", email: "gblackburn@pausd.org", title: "Teacher - Social Science" },
      { name: "Eric Bloom", email: "ebloom@pausd.org", title: "Teacher - Social Science" },
      { name: "Benjamin Bolanos", email: "bbolanos@pausd.org", title: "Teacher - Social Science" },
      { name: "Sebastian Castaneda", email: "scastaneda@pausd.org", title: "Teacher - Social Science" },
      { name: "Justin Cronin", email: "jcronin@pausd.org", title: "Teacher - Social Science,Teacher Advisor" },
      { name: "Austin Davis", email: "audavis@pausd.org", title: "Teacher - Social Science" },
      { name: "Corbin Dodd", email: "cdodd@pausd.org", title: "Teacher - Social Science" },
      { name: "Caitlin Drewes", email: "cdrewes@pausd.org", title: "Teacher - Social Science,Teacher Advisor" },
      { name: "Jaclyn Edwards", email: "jedwards@pausd.org", title: "Teacher - Social Science,Teacher Advisor" },
      { name: "Christopher Farina", email: "cfarina@pausd.org", title: "Teacher - Social Science,Teacher Advisory, TOSA" },
      { name: "Stephen Foug", email: "sfoug@pausd.org", title: "Teacher - Social Science" },
      { name: "Steven Gallagher", email: "sgallagher@pausd.org", title: "Teacher - Social Science,Teacher - Student Activities" },
      { name: "Melinda Mattes", email: "mmattes@pausd.org", title: "Teacher - Social Science,Teacher Advisor" },
      { name: "Steve Sabbag", email: "ssabbag@pausd.org", title: "Teacher - Social Science, Teacher Advisor" },
      { name: "Katya Villalobos", email: "kvillalobos@pausd.org", title: "Teacher - Social Science" },
      { name: "Adam Yonkers", email: "ayonkers@pausd.org", title: "Teacher - Social Science, Teacher Advisor" },
      { name: "Joanna Hubenthal", email: "jhubenthal@pausd.org", title: "Teacher - Living Skills" },
    ],
  },
  {
    id: "math",
    name: "Math",
    staff: [
      { name: "Randolph Mercado", email: "rmercado@pausd.org", title: "Teacher - Math, Instructional Lead" },
      { name: "David Baker", email: "dabaker@pausd.org", title: "Teacher - Math" },
      { name: "Zachary Barnes", email: "zbarnes@pausd.org", title: "Teacher - Math" },
      { name: "Quinn Basewitz", email: "qbasewitz@pausd.org", title: "Teacher - Math" },
      { name: "Herb Bocksnick", email: "hbocksnick@pausd.org", title: "Teacher - Math" },
      { name: "Cynthia Chen", email: "cchen@pausd.org", title: "Teacher - Math" },
      { name: "Idabelle Cunningham", email: "icunningham@pausd.org", title: "Teacher - Math, Teacher Advisor" },
      { name: "Alexander Dade", email: "adade@pausd.org", title: "Teacher - Math" },
      { name: "Charlotte Harris", email: "charris@pausd.org", title: "Teacher - Math" },
      { name: "Ruby Ibanga", email: "ribanga@pausd.org", title: "Teacher - Induction,Teacher - Math, Teacher Advisor" },
      { name: "Sharla Jones", email: "sjones@pausd.org", title: "Teacher - Math" },
      { name: "Gabrielle Juan", email: "gjuan@pausd.org", title: "Teacher - Math" },
      { name: "Daniel Nguyen", email: "dnguyen@pausd.org", title: "Teacher - Math" },
      { name: "David Peters", email: "dpeters@pausd.org", title: "Teacher - Math" },
      { name: "Misha Stempel", email: "mstempel@pausd.org", title: "Teacher - Math" },
    ],
  },
  {
    id: "pe",
    name: "Physical Education",
    staff: [
      { name: "Peter Diepenbrock", email: "pdiepenbrock@pausd.org", title: "Teacher - Physical Education, Instructional Lead" },
      { name: "David De Geronimo", email: "ddegeronimo@pausd.org", title: "Teacher - AVID/FOS,Teacher - Physical Education" },
      { name: "David Duran", email: "dduran@pausd.org", title: "Teacher - Physical Education" },
      { name: "Jason Fung", email: "jfung@pausd.org", title: "Teacher - Physical Education" },
      { name: "Jacob Halas", email: "jhalas@pausd.org", title: "Teacher - Physical Education" },
      { name: "Stacey Kofman", email: "skofman@pausd.org", title: "Teacher - Career & Tech Educat,Teacher - Physical Education" },
      { name: "Sheri Mulroe", email: "smulroe@pausd.org", title: "Teacher - Physical Education" },
    ],
  },
  {
    id: "science",
    name: "Science",
    staff: [
      { name: "Aparna Sankararaman", email: "asankararaman@pausd.org", title: "Teacher - AVID/FOS,Teacher - BTSA,Teacher - Science, Instructional Lead, Teacher Advisor" },
      { name: "Adrienne Bronstein", email: "abronstein@pausd.org", title: "Instructional Aide GE" },
      { name: "Ashwini Avadhani", email: "aavadhani@pausd.org", title: "Teacher - Science, Teacher Advisor" },
      { name: "Elizabeth Brimhall", email: "ebrimhall@pausd.org", title: "Teacher - Science, Teacher Advisor" },
      { name: "Josh Bloom", email: "jbloom@pausd.org", title: "Teacher - Science" },
      { name: "Vivian Byun", email: "vbyun@pausd.org", title: "Teacher - Science" },
      { name: "Margaret Deng", email: "madeng@pausd.org", title: "Teacher - Science" },
      { name: "Sefika Eris", email: "geris@pausd.org", title: "Teacher - Science" },
      { name: "Samuel Howles-Banerji", email: "showles-banerji@pausd.org", title: "Teacher - Science" },
      { name: "Taruna Khanna", email: "tkhanna@pausd.org", title: "Teacher - Science" },
      { name: "Nicole Loomis", email: "nloomis@pausd.org", title: "Teacher - Science" },
      { name: "Michael Lupoli", email: "mlupoli@pausd.org", title: "Teacher - Science, Teacher Advisor" },
      { name: "Randy Scilingo", email: "rscilingo@pausd.org", title: "Teacher - Science" },
      { name: "Alicia Szebert", email: "aszebert@pausd.org", title: "Teacher - Science, Teacher Advisor" },
      { name: "Leah Thomas", email: "lthomas@pausd.org", title: "Teacher - Science" },
      { name: "Tara Vereyken", email: "tvereyken@pausd.org", title: "Teacher - Science" },
      { name: "Cecilia Walsh", email: "cwalsh@pausd.org", title: "Teacher - Science" },
    ],
  },
  {
    id: "special_education",
    name: "Special Education",
    staff: [
      { name: "J-Luke Oakson", email: "joakson@pausd.org", title: "Secretary II" },
      { name: "Merna Khoury", email: "mkhoury@pausd.org", title: "Transition Specialist" },
      { name: "Carley Biblin", email: "cbiblin@pausd.org", title: "Teacher - Speech/Language" },
      { name: "Edwin Arbaiza", email: "earbaiza@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Kristen Castro", email: "kcastro@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Cyera Taylor", email: "ctaylor@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Jenny Duong", email: "jduong@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Dan Galluccio", email: "dgalluccio@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Kamaljeet Chana", email: "kchana@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Korynne Headley", email: "kheadley@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Lisa Jauregui", email: "ljauregui@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Elizabeth Poux", email: "epoux@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Luke Santos", email: "lsantos@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Attila Tari", email: "atari@pausd.org", title: "Teacher - Education Specialist" },
      { name: "Betty Tran", email: "btran@pausd.org", title: "Teacher - Education Specialist" },
    ],
  },
  {
    id: "vapa",
    name: "Visual & Performing Arts",
    staff: [
      { name: "Brittney Kerby", email: "bkerby@pausd.org", title: "Teacher - Visual & Perform Art, Instructional Lead" },
      { name: "Kyle Langdon", email: "klangdon@pausd.org", title: "Theater Facilities Supervisor" },
      { name: "Andrew Carpenter", email: "acarpenter@pausd.org", title: "Theater Production Tech" },
      { name: "Tracey Atkinson", email: "tatkinson@pausd.org", title: "Teacher - Visual & Perform Art" },
      { name: "Kenna Gallagher", email: "kegallagher@pausd.org", title: "Teacher - Visual & Perform Art" },
      { name: "Katie Gilchrist", email: "kgilchrist@pausd.org", title: "Teacher - Visual & Perform Art" },
      { name: "Sue La Fetra", email: "slafetra@pausd.org", title: "Teacher - Visual & Perform Art" },
      { name: "Michael Najar", email: "mnajar@pausd.org", title: "Teacher - Career & Tech Educat, Teacher - Production, Teacher - Visual & Perform Art" },
      { name: "Sarah Thermond", email: "sthermond@pausd.org", title: "Teacher - Visual & Perform Art, Teacher Advisor" },
      { name: "Michael Veizades", email: "mveizades@pausd.org", title: "Teacher - Visual & Perform Art" },
    ],
  },
  {
    id: "world_languages",
    name: "World Languages",
    staff: [
      { name: "Carla Guerard", email: "cguerard@pausd.org", title: "Teacher - Instructional Lead,Teacher - World Languages,Teacher Advisor" },
      { name: "Lisa Bocksnick", email: "lbocksnick@pausd.org", title: "Account Clerk/Secretary,Tutorial Center Asst,Typist Clerk III" },
      { name: "Angela Ambrosio", email: "aambrosio@pausd.org", title: "Teacher - World Languages, Teacher Advisor" },
      { name: "Pilar Badillonovas", email: "pbadillonovas@pausd.org", title: "Teacher - World Languages" },
      { name: "Kevin Duffy", email: "kduffy@pausd.org", title: "Teacher - World Languages, Teacher Advisor" },
      { name: "Tsailing Haislmaier", email: "thaislmaier@pausd.org", title: "Teacher - World Languages" },
      { name: "Shuting Kong", email: "skong@pausd.org", title: "Teacher - World Languages" },
      { name: "Christy Resinger", email: "cresinger@pausd.org", title: "Teacher - World Languages" },
      { name: "Breanna Reyes", email: "breyes@pausd.org", title: "Teacher - World Languages" },
      { name: "Magdalena Rivera", email: "mrivera@pausd.org", title: "Teacher - World Languages" },
      { name: "Megumi Shibamiya", email: "mshibamiya@pausd.org", title: "Teacher - World Languages" },
    ],
  },
  {
    id: "instructional_assistants",
    name: "Instructional Assistants",
    staff: [
      { name: "Donna Alkadri", email: "dalkadri@pausd.org", title: "Instructional Aide SpEd- MM" },
      { name: "Nathalie Cabili", email: "ncabili@pausd.org", title: "Instructional Aide SpEd- MM" },
      { name: "Vijay Sethi", email: "vsethi@pausd.org", title: "Instructional Aide SpEd- MM" },
      { name: "Mrigendra Steiner", email: "mrsteiner@pausd.org", title: "Instructional Aide SpEd- MM" },
      { name: "Gina Vashio", email: "gvashio@pausd.org", title: "Instructional Aide SpEd- MM" },
      { name: "Kamal Vilms", email: "kvilms@pausd.org", title: "Instructional Aide SpEd- MM" },
      { name: "Chamroeun Yean", email: "cyean@pausd.org", title: "Instructional Aide SpEd- MM" },
      { name: "Purabi Bhattacharya", email: "pbhattacharya@pausd.org", title: "Instructional Asst-Therapeutic" },
      { name: "Laurie Hubert", email: "lhubert@pausd.org", title: "Instructional Asst-Therapeutic" },
      { name: "Victoria Mataele", email: "vmataele@pausd.org", title: "Instructional Assistant - MS" },
      { name: "Ramon Mendoza-Rios", email: "rmendozarios@pausd.org", title: "Instructional Assistant - MS" },
      { name: "Scott Peters", email: "speters@pausd.org", title: "Instructional Assistant - MS" },
      { name: "Edward Tonga", email: "etonga@pausd.org", title: "Instructional Assistant - MS" },
    ],
  },
];

// Helper function to search staff by name
export function searchStaff(query: string): StaffMember[] {
  if (!query || query.trim().length < 2) return [];
  
  const lowerQuery = query.toLowerCase().trim();
  const results: StaffMember[] = [];
  
  for (const department of STAFF_DIRECTORY) {
    for (const staff of department.staff) {
      if (
        staff.name.toLowerCase().includes(lowerQuery) ||
        staff.email.toLowerCase().includes(lowerQuery)
      ) {
        results.push(staff);
      }
    }
  }
  
  return results;
}

// Helper function to get teacher names (for autocomplete)
export function getTeachers(): StaffMember[] {
  const teachers: StaffMember[] = [];
  
  for (const department of STAFF_DIRECTORY) {
    for (const staff of department.staff) {
      if (staff.title.toLowerCase().includes("teacher")) {
        teachers.push(staff);
      }
    }
  }
  
  return teachers.sort((a, b) => a.name.localeCompare(b.name));
}
