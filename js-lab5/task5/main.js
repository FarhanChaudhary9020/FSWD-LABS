import { readFileSync } from 'node:fs';
import Student from './Student.js';
import { processTranscriptJSON } from './transcriptService.js';
import { calculateGPA as getGPA } from './gradeUtils.js';

const validJSONData = readFileSync(new URL('./students.json', import.meta.url), 'utf8');

const invalidMarksData = `
[
  {
    "id": 103,
    "name": "Zain",
    "courses": [
      { "code": "CS301", "marks": 105 }
    ]
  }
]
`;

function runTranscriptEngine(jsonData, testLabel) {
  console.log(`\n=================== ${testLabel} ===================`);
  try {
    const reportJSON = processTranscriptJSON(jsonData);
    console.log('Processed Transcript Report (JSON Output):');
    console.log(reportJSON);
  } catch (error) {
    if (error instanceof RangeError) {
      console.error(`[RangeError Caught]: ${error.message}`);
    } else if (error instanceof TypeError) {
      console.error(`[TypeError Caught]: ${error.message}`);
    } else if (error instanceof SyntaxError) {
      console.error(`[SyntaxError Caught]: ${error.message}`);
    } else {
      console.error(`[General Error Caught]: ${error.message}`);
    }
  } finally {
    console.log(`[Finally Block]: Finished processing attempt for ${testLabel}.`);
  }
}

const sampleStudent = new Student(999, 'Test Student', [{ code: 'CS101', marks: 85 }]);
console.log(`Direct utility check using aliased import (getGPA): ${getGPA(sampleStudent.courses)}`);

runTranscriptEngine(validJSONData, 'TEST 1: Valid Transcript Processing');
runTranscriptEngine(invalidMarksData, 'TEST 2: Invalid Marks Range Fault Test');