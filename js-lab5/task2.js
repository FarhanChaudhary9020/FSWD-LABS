const results = [
  { id: 1, name: 'Ali', department: 'CS', course: 'FSWD', marks: 82 },
  { id: 2, name: 'Sara', department: 'CS', course: 'FSWD', marks: 91 },
  { id: 3, name: 'Usman', department: 'SE', course: 'FSWD', marks: 47 },
  { id: 4, name: 'Hina', department: 'AI', course: 'FSWD', marks: 73 },
  { id: 5, name: 'Ahmed', department: 'SE', course: 'FSWD', marks: 64 },
  { id: 6, name: 'Zoya', department: 'AI', course: 'FSWD', marks: 91 }
];

function getGradeDetails(marks) {
  if (marks >= 85) return { grade: 'A', gradePoints: 4.0, status: 'PASS' };
  if (marks >= 80) return { grade: 'A-', gradePoints: 3.7, status: 'PASS' };
  if (marks >= 75) return { grade: 'B+', gradePoints: 3.3, status: 'PASS' };
  if (marks >= 70) return { grade: 'B', gradePoints: 3.0, status: 'PASS' };
  if (marks >= 65) return { grade: 'B-', gradePoints: 2.7, status: 'PASS' };
  if (marks >= 60) return { grade: 'C+', gradePoints: 2.3, status: 'PASS' };
  if (marks >= 50) return { grade: 'C', gradePoints: 2.0, status: 'PASS' };
  return { grade: 'F', gradePoints: 0.0, status: 'FAIL' };
}

const processedResults = results.map(st => ({
  ...st,
  ...getGradeDetails(st.marks)
}));

const rankedMeritList = [...processedResults].sort((a, b) => {
  if (b.marks !== a.marks) return b.marks - a.marks;
  return a.name.localeCompare(b.name);
});

const departmentStats = processedResults.reduce((acc, st) => {
  if (!acc[st.department]) {
    acc[st.department] = { students: 0, totalMarks: 0, highest: 0, passed: 0 };
  }
  const dept = acc[st.department];
  dept.students += 1;
  dept.totalMarks += st.marks;
  dept.highest = Math.max(dept.highest, st.marks);
  if (st.status === 'PASS') dept.passed += 1;
  return acc;
}, {});

Object.keys(departmentStats).forEach(dept => {
  const data = departmentStats[dept];
  data.average = Number((data.totalMarks / data.students).toFixed(2));
  delete data.totalMarks;
});

const firstOver85 = processedResults.find(st => st.marks > 85);
const firstFailedIndex = processedResults.findIndex(st => st.status === 'FAIL');
const hasAnyFailed = processedResults.some(st => st.status === 'FAIL');
const allValidMarks = processedResults.every(st => st.marks >= 0 && st.marks <= 100);

const overallAvg = processedResults.reduce((s, st) => s + st.marks, 0) / processedResults.length;
const aboveAverageStudents = processedResults.filter(st => st.marks > overallAvg);
const topThreeNames = rankedMeritList.slice(0, 3).map(st => st.name);

console.log('Department Statistics:', departmentStats);
console.log('Queries:', { firstOver85, firstFailedIndex, hasAnyFailed, allValidMarks, topThreeNames });