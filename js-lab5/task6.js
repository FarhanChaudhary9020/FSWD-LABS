function loadStudent(id, callback) {
  setTimeout(() => {
    if (id !== 101) return callback(new Error('Student does not exist'), null);
    callback(null, { id: 101, name: 'Ali', completedPrereq: true });
  }, 100);
}

function checkPrerequisites(student, courseCode, callback) {
  setTimeout(() => {
    if (!student.completedPrereq) return callback(new Error('Prerequisites not met'), null);
    callback(null, true);
  }, 100);
}

function checkAvailableSeats(courseCode, callback) {
  setTimeout(() => {
    const seatsAvailable = true;
    if (!seatsAvailable) return callback(new Error('Course is full'), null);
    callback(null, true);
  }, 100);
}

function registerCourse(studentId, courseCode, callback) {
  setTimeout(() => {
    callback(null, { studentId, course: courseCode, status: 'REGISTERED' });
  }, 100);
}

loadStudent(101, (err, student) => {
  if (err) return console.error('Stage 1 Failed:', err.message);

  checkPrerequisites(student, 'CS401', (err, prereqOk) => {
    if (err) return console.error('Stage 2 Failed:', err.message);

    checkAvailableSeats('CS401', (err, seatsOk) => {
      if (err) return console.error('Stage 3 Failed:', err.message);

      registerCourse(student.id, 'CS401', (err, registration) => {
        if (err) return console.error('Stage 4 Failed:', err.message);
        console.log('Registration Success:', registration);
      });
    });
  });
});