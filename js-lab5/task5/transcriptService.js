import Student from './Student.js';
import { calculateAverage, calculateGPA } from './gradeUtils.js';

export function processTranscriptJSON(rawJsonString) {
  let parsedData;

  try {
    parsedData = JSON.parse(rawJsonString);
  } catch (err) {
    throw new SyntaxError('Malformed JSON string provided: ' + err.message);
  }

  if (!Array.isArray(parsedData)) {
    throw new TypeError('Expected JSON data to contain an array of student records.');
  }

  const seenIds = new Set();
  const reportList = [];

  for (const record of parsedData) {
    if (record.id === undefined || record.id === null || record.id === '') {
      throw new TypeError(`Missing student ID for record with name "${record.name || 'Unknown'}".`);
    }

    if (seenIds.has(record.id)) {
      throw new Error(`Duplicate student ID detected: ${record.id}`);
    }
    seenIds.add(record.id);

    if (!Array.isArray(record.courses)) {
      throw new TypeError(`Courses property must be an array for student ID ${record.id}.`);
    }

    for (const course of record.courses) {
      if (!course.code) {
        throw new TypeError(`Missing course code for student ID ${record.id}.`);
      }

      if (typeof course.marks !== 'number' || isNaN(course.marks)) {
        throw new TypeError(`Invalid mark type for course "${course.code}" on student ID ${record.id}.`);
      }

      if (course.marks < 0 || course.marks > 100) {
        throw new RangeError(`Course mark ${course.marks} out of bounds (0-100) for course "${course.code}" on student ID ${record.id}.`);
      }
    }

    const student = new Student(record.id, record.name, record.courses);

    reportList.push({
      id: student.id,
      name: student.name,
      totalCourses: student.courses.length,
      averageMarks: calculateAverage(student.courses),
      gpa: calculateGPA(student.courses)
    });
  }

  return JSON.stringify(reportList, null, 2);
}