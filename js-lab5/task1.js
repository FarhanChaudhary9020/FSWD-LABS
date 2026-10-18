const applicants = [
  { id: 'A101', name: 'Sara Khan', age: '19', matricMarks: '91', intermediateMarks: '87', entryTest: '78', program: 'BSCS', feePaid: 'true' },
  { id: 'A102', name: 'Ahmed Ali', age: 'twenty', matricMarks: '88', intermediateMarks: '', entryTest: '72', program: 'BSSE', feePaid: 'false' },
  { id: 'A103', name: 'Hassan', age: '18', matricMarks: '76', intermediateMarks: '83', entryTest: '91', program: 'BSAI', feePaid: 'true' },
  { id: 'A104', name: 'Zainab', age: '21', matricMarks: '60', intermediateMarks: '65', entryTest: '55', program: 'BSCS', feePaid: 'true' }
];

const VALID_PROGRAMS = ['BSCS', 'BSSE', 'BSAI'];

function processAdmission(applicant) {
  const age = Number(applicant.age);
  const matric = Number(applicant.matricMarks);
  const inter = Number(applicant.intermediateMarks);
  const entry = Number(applicant.entryTest);
  const isFeePaid = applicant.feePaid === 'true';

  const isValidAge = !isNaN(age) && age >= 17 && age <= 30;
  const isValidMatric = !isNaN(matric) && matric >= 0 && matric <= 100;
  const isValidInter = !isNaN(inter) && inter >= 0 && inter <= 100;
  const isValidEntry = !isNaN(entry) && entry >= 0 && entry <= 100;
  const isValidProgram = VALID_PROGRAMS.includes(applicant.program);

  if (!isValidAge || !isValidMatric || !isValidInter || !isValidEntry || !isValidProgram) {
    return { ...applicant, status: 'INVALID DATA', merit: null, isValid: false };
  }

  const merit = (matric * 0.20) + (inter * 0.30) + (entry * 0.50);

  let status = 'REJECTED';
  const isEligible = merit >= 70 && entry >= 60 && inter >= 60;

  if (isEligible) {
    status = merit >= 80 ? 'SELECTED' : 'WAITING';
  }

  return { ...applicant, sanitizedAge: age, merit: Number(merit.toFixed(2)), status, isValid: true };
}

function generateSummary(processedApplicants) {
  const valid = processedApplicants.filter(a => a.isValid);
  const invalid = processedApplicants.filter(a => !a.isValid);

  const highestMerit = valid.reduce((max, a) => (a.merit > max.merit ? a : max), valid[0] || null);
  const lowestMerit = valid.reduce((min, a) => (a.merit < min.merit ? a : min), valid[0] || null);
  const averageMerit = valid.length ? (valid.reduce((sum, a) => sum + a.merit, 0) / valid.length).toFixed(2) : 0;

  const programCounts = processedApplicants.reduce((acc, a) => {
    acc[a.program] = (acc[a.program] || 0) + 1;
    return acc;
  }, {});

  return {
    totalValid: valid.length,
    totalInvalid: invalid.length,
    highestMeritApplicant: highestMerit ? { name: highestMerit.name, merit: highestMerit.merit } : null,
    lowestMeritApplicant: lowestMerit ? { name: lowestMerit.name, merit: lowestMerit.merit } : null,
    averageMerit: Number(averageMerit),
    programCounts
  };
}

const processed = applicants.map(processAdmission);
console.log('Processed Applicants:', processed);
console.log('Admission Summary:', generateSummary(processed));