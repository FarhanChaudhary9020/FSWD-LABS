const ApiError = require("./ApiError");
const CrudController = require("./CrudController");
const Repository = require("./Repository");
const Schema = require("./Schema");

const idField = { type: "whole" };

function createEntities() {
  const students = new Repository();
  const teachers = new Repository();
  const attendance = new Repository();
  const marks = new Repository();

  function assertRelatedRecords(attributes) {
    if (!students.findById(attributes.studentId)) {
      throw ApiError.badRequest("studentId must reference an existing student");
    }
    if (!teachers.findById(attributes.teacherId)) {
      throw ApiError.badRequest("teacherId must reference an existing teacher");
    }
  }

  function assertAttendanceUnique(attributes, currentId) {
    const duplicate = attendance
      .findWhere({ studentId: attributes.studentId, date: attributes.date })
      .some((record) => record.id !== currentId);
    if (duplicate) {
      throw ApiError.conflict("Attendance already exists for this student on this date");
    }
  }

  function assertMarkValid(attributes) {
    assertRelatedRecords(attributes);
    if (attributes.obtained > attributes.total) {
      throw ApiError.badRequest("obtained cannot be greater than total");
    }
  }

  const studentController = new CrudController({
    repository: students,
    schema: new Schema({
      name: { type: "text" },
      rollNo: { type: "text" },
      email: { type: "email", required: false },
      age: { type: "whole" },
      className: { type: "text", required: false }
    }),
    beforeCreate(attributes) {
      if (students.findWhere({ rollNo: attributes.rollNo }).length) {
        throw ApiError.conflict("rollNo already exists");
      }
    },
    beforeUpdate(attributes, current) {
      if (
        attributes.rollNo !== current.rollNo &&
        students.findWhere({ rollNo: attributes.rollNo }).length
      ) {
        throw ApiError.conflict("rollNo already exists");
      }
    },
    beforeDelete(student) {
      for (const record of attendance.findWhere({ studentId: student.id })) {
        attendance.erase(record.id);
      }
      for (const record of marks.findWhere({ studentId: student.id })) {
        marks.erase(record.id);
      }
    }
  });

  const teacherController = new CrudController({
    repository: teachers,
    schema: new Schema({
      name: { type: "text" },
      subject: { type: "text" },
      email: { type: "email" },
      phone: { type: "text", required: false }
    }),
    beforeCreate(attributes) {
      if (teachers.findWhere({ email: attributes.email }).length) {
        throw ApiError.conflict("email already exists");
      }
    },
    beforeUpdate(attributes, current) {
      if (
        attributes.email !== current.email &&
        teachers.findWhere({ email: attributes.email }).length
      ) {
        throw ApiError.conflict("email already exists");
      }
    },
    beforeDelete(teacher) {
      if (
        attendance.findWhere({ teacherId: teacher.id }).length ||
        marks.findWhere({ teacherId: teacher.id }).length
      ) {
        throw ApiError.conflict("Teacher is referenced by attendance or marks");
      }
    }
  });

  const attendanceController = new CrudController({
    repository: attendance,
    schema: new Schema({
      studentId: idField,
      teacherId: idField,
      date: { type: "day" },
      status: {
        type: "choice",
        options: ["present", "absent", "late", "leave"]
      },
      remarks: { type: "text", required: false }
    }),
    beforeCreate(attributes) {
      assertRelatedRecords(attributes);
      assertAttendanceUnique(attributes);
    },
    beforeUpdate(attributes, current) {
      assertRelatedRecords(attributes);
      assertAttendanceUnique(attributes, current.id);
    }
  });

  const marksController = new CrudController({
    repository: marks,
    schema: new Schema({
      studentId: idField,
      teacherId: idField,
      subject: { type: "text" },
      examType: {
        type: "choice",
        options: ["quiz", "assignment", "midterm", "final", "lab"]
      },
      obtained: { type: "decimal" },
      total: { type: "decimal" }
    }),
    beforeCreate: assertMarkValid,
    beforeUpdate: assertMarkValid
  });

  return {
    students: studentController,
    teachers: teacherController,
    attendance: attendanceController,
    marks: marksController
  };
}

module.exports = { createEntities };
