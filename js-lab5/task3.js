const student = {
  id: 101,
  name: 'Ali',
  marks: 0,
  scholarship: false,
  address: { city: 'Islamabad', sector: 'F-10' },
  contact: { email: 'ali@university.edu' }
};

const updateRequest = {
  name: 'Ali Khan',
  address: { city: 'Rawalpindi' },
  contact: { phone: '03001234567' }
};

function updateStudentProfile(original, update) {
  const { name, marks, scholarship, address = {}, contact = {} } = update;

  return {
    ...original,
    name: name ?? original.name,
    marks: marks ?? original.marks,
    scholarship: scholarship ?? original.scholarship,
    address: {
      ...original.address,
      ...address
    },
    contact: {
      ...original.contact,
      ...contact
    }
  };
}

const updatedStudent = updateStudentProfile(student, updateRequest);

console.log('Original Student:', student);
console.log('Updated Student:', updatedStudent);

console.log('\n--- Reference Challenge ---');
console.log('original === updated:', student === updatedStudent);
console.log('original.address === updated.address:', student.address === updatedStudent.address);
console.log('original.contact === updated.contact:', student.contact === updatedStudent.contact);