// Convert percentage to letter grade
export function getLetterGrade(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

// Get GPA points from letter grade
export function getGpaPoints(letterGrade: string): number {
  const gpaMap: Record<string, number> = {
    "A+": 4.0,
    A: 4.0,
    "A-": 3.7,
    "B+": 3.3,
    B: 3.0,
    "B-": 2.7,
    "C+": 2.3,
    C: 2.0,
    "C-": 1.7,
    "D+": 1.3,
    D: 1.0,
    "D-": 0.7,
    F: 0.0,
  };
  return gpaMap[letterGrade] ?? 0.0;
}

// Get grade color for UI
export function getGradeColor(
  letterGrade: string | null,
  isDark: boolean = false,
): string {
  if (!letterGrade) return isDark ? "#666" : "#999";

  if (letterGrade.startsWith("A")) return "#22C55E"; // Green
  if (letterGrade.startsWith("B")) return "#3B82F6"; // Blue
  if (letterGrade.startsWith("C")) return "#EAB308"; // Yellow
  if (letterGrade.startsWith("D")) return "#F97316"; // Orange
  return "#EF4444"; // Red for F
}

// Get grade background color (lighter version for cards)
export function getGradeBackgroundColor(
  letterGrade: string | null,
  isDark: boolean = false,
): string {
  if (!letterGrade) return isDark ? "#1a1a1a" : "#f5f5f5";

  const alpha = isDark ? "20" : "15";
  if (letterGrade.startsWith("A")) return `#22C55E${alpha}`;
  if (letterGrade.startsWith("B")) return `#3B82F6${alpha}`;
  if (letterGrade.startsWith("C")) return `#EAB308${alpha}`;
  if (letterGrade.startsWith("D")) return `#F97316${alpha}`;
  return `#EF4444${alpha}`;
}

// Format grade percentage for display
export function formatGradePercent(percent: string | null): string {
  if (!percent) return "--";
  const num = parseFloat(percent);
  return isNaN(num) ? "--" : `${num.toFixed(1)}%`;
}

// Calculate GPA from multiple courses
export function calculateGPA(
  courses: { gradeLetter: string | null }[],
): number | null {
  const gradedCourses = courses.filter((c) => c.gradeLetter);
  if (gradedCourses.length === 0) return null;

  const totalPoints = gradedCourses.reduce((sum, course) => {
    return sum + getGpaPoints(course.gradeLetter!);
  }, 0);

  return totalPoints / gradedCourses.length;
}
