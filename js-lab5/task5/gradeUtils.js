export function calculateGrade(marks) {
  if (marks >= 85) return 'A';
  if (marks >= 80) return 'A-';
  if (marks >= 75) return 'B+';
  if (marks >= 70) return 'B';
  if (marks >= 65) return 'B-';
  if (marks >= 60) return 'C+';
  if (marks >= 50) return 'C';
  return 'F';
}

export function calculateAverage(courses) {
  if (!courses || courses.length === 0) return 0;
  const total = courses.reduce((sum, c) => sum + c.marks, 0);
  return Number((total / courses.length).toFixed(2));
}

export function calculateGPA(courses) {
  if (!courses || courses.length === 0) return 0.0;
  
  const totalPoints = courses.reduce((sum, c) => {
    if (c.marks >= 85) return sum + 4.0;
    if (c.marks >= 80) return sum + 3.7;
    if (c.marks >= 75) return sum + 3.3;
    if (c.marks >= 70) return sum + 3.0;
    if (c.marks >= 65) return sum + 2.7;
    if (c.marks >= 60) return sum + 2.3;
    if (c.marks >= 50) return sum + 2.0;
    return sum + 0.0;
  }, 0);

  return Number((totalPoints / courses.length).toFixed(2));
}