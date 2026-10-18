export default class Student {
  constructor(id, name, courses = []) {
    this.id = id;
    this.name = name;
    this.courses = courses;
  }
}