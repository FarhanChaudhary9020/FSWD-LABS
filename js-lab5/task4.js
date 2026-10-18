class Person {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
  introduce() {
    return `Hi, I am ${this.name} (${this.email}).`;
  }
}

class Student extends Person {
  constructor(name, email, rollNo, marks) {
    super(name, email);
    this.rollNo = rollNo;
    this.marks = marks;
  }
  introduce() {
    return `${super.introduce()} I am a student with Roll No: ${this.rollNo}.`;
  }
  getResult() {
    return `${this.name} scored ${this.marks} marks.`;
  }
}

class FacultyMember extends Person {
  constructor(name, email, employeeId, department) {
    super(name, email);
    this.employeeId = employeeId;
    this.department = department;
  }
  introduce() {
    return `${super.introduce()} I am a faculty member in ${this.department} (ID: ${this.employeeId}).`;
  }
}

const users = [
  new Student('Sara', 'sara@uni.edu', 'SE-01', 88),
  new FacultyMember('Dr. Tariq', 'tariq@uni.edu', 'F-501', 'Computer Science')
];

users.forEach(user => console.log(user.introduce()));

console.log('\n--- Context & Binding Challenge ---');

const guest = { name: 'Dr. Ahmed', email: 'ahmed@example.com' };
console.log(Person.prototype.introduce.call(guest));

const studentInst = users[0];
const detachedFn = studentInst.introduce; 
try {
  console.log(detachedFn());
} catch (err) {
  console.log('Detached invocation error:', err.message);
}

const boundFn = studentInst.introduce.bind(studentInst);
console.log('Bound execution:', boundFn());