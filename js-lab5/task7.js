const getStudent = id => Promise.resolve({ id, name: 'Ali', prereq: true });
const getCourse = code => Promise.resolve({ code, seats: 5 });
const checkPrerequisites = (student) => student.prereq ? Promise.resolve(student) : Promise.reject(new Error('Prereqs missing'));
const checkSeats = (course) => course.seats > 0 ? Promise.resolve(course) : Promise.reject(new Error('Course full'));
const registerStudent = (student, course) => Promise.resolve({ studentId: student.id, course: course.code, status: 'REGISTERED' });

const sendEmail = () => Promise.resolve('Email Sent');
const sendSMS = () => Promise.reject(new Error('SMS Gateway Down'));
const writeAuditLog = () => Promise.resolve('Audit Written');

getStudent(101)
  .then(student => checkPrerequisites(student))
  .then(student => getCourse('CS401').then(course => ({ student, course })))
  .then(({ student, course }) => checkSeats(course).then(() => registerStudent(student, course)))
  .then(res => {
    console.log('Registration Completed:', res);

    return Promise.allSettled([
      sendEmail().then(() => ({ service: 'Email', status: 'fulfilled' })),
      sendSMS().catch(() => ({ service: 'SMS', status: 'rejected' })),
      writeAuditLog().then(() => ({ service: 'Audit', status: 'fulfilled' }))
    ]);
  })
  .then(postResults => console.log('Post-Registration Services Status:', postResults.map(r => r.value)))
  .catch(err => console.error('Workflow Failed:', err.message))
  .finally(() => console.log('Registration Sequence Settled.'));

const fetchServer1 = new Promise((_, reject) => setTimeout(() => reject(new Error('Server 1 offline')), 100));
const fetchServer2 = new Promise(resolve => setTimeout(() => resolve({ course: 'CS401', source: 'Server 2' }), 200));

Promise.any([fetchServer1, fetchServer2])
  .then(data => console.log('Fastest successful server result:', data))
  .catch(err => console.error('All servers failed:', err));