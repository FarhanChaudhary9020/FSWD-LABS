const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./src/app");

let server;
let baseUrl;

test.before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

async function request(path, method = "GET", body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function createStudent(overrides = {}) {
  return request("/students", "POST", {
    name: "Amina Khan",
    rollNo: `R-${Math.random()}`,
    email: "amina@example.com",
    age: 20,
    className: "CS-2",
    ...overrides
  });
}

async function createTeacher(overrides = {}) {
  return request("/teachers", "POST", {
    name: "Sara Ali",
    subject: "Computer Science",
    email: `sara-${Math.random()}@example.com`,
    phone: "555-0100",
    ...overrides
  });
}

test("students support create, filter, show, replace, patch, and delete", async () => {
  const created = await createStudent({ rollNo: "S-100", extra: "ignored" });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.rollNo, "S-100");
  assert.equal("extra" in created.body.data, false);

  const id = created.body.data.id;
  assert.equal((await request("/students?rollNo=S-100")).body.data.length, 1);
  assert.equal((await request(`/students/${id}`)).body.data.name, "Amina Khan");
  const patched = await request(`/students/${id}`, "PATCH", { age: 21 });
  assert.equal(patched.body.data.age, 21);
  assert.equal(patched.body.data.name, "Amina Khan");

  const replaced = await request(`/students/${id}`, "PUT", {
    name: "Amina K.",
    rollNo: "S-100",
    email: "amina.k@example.com",
    age: 22,
    className: "CS-3"
  });
  assert.equal(replaced.body.data.name, "Amina K.");
  assert.equal((await request(`/students/${id}`, "DELETE")).status, 200);
  assert.equal((await request(`/students/${id}`)).status, 404);
});

test("student roll numbers and teacher emails are unique", async () => {
  await createStudent({ rollNo: "S-200" });
  assert.equal((await createStudent({ rollNo: "S-200" })).status, 409);
  await createTeacher({ email: "unique@example.com" });
  assert.equal((await createTeacher({ email: "unique@example.com" })).status, 409);
});

test("attendance validates references, date, status, duplicates, and cascades", async () => {
  const student = await createStudent();
  const teacher = await createTeacher();
  const payload = {
    studentId: student.body.data.id,
    teacherId: teacher.body.data.id,
    date: "2026-10-25",
    status: "present",
    remarks: "On time"
  };

  assert.equal((await request("/attendance", "POST", payload)).status, 201);
  assert.equal((await request("/attendance", "POST", payload)).status, 409);
  assert.equal((await request("/attendance", "POST", {
    ...payload,
    date: "2026-02-30"
  })).status, 400);
  assert.equal((await request("/attendance", "POST", {
    ...payload,
    date: "2026-10-26",
    status: "unknown"
  })).status, 400);

  await request(`/students/${student.body.data.id}`, "DELETE");
  assert.equal((await request("/attendance")).body.data.length, 0);
});

test("marks validate references, score limits, and cascade on student deletion", async () => {
  const student = await createStudent();
  const teacher = await createTeacher();
  const payload = {
    studentId: student.body.data.id,
    teacherId: teacher.body.data.id,
    subject: "Programming",
    examType: "midterm",
    obtained: 80,
    total: 100
  };

  assert.equal((await request("/marks", "POST", payload)).status, 201);
  assert.equal((await request("/marks", "POST", {
    ...payload,
    obtained: 101
  })).status, 400);
  await request(`/students/${student.body.data.id}`, "DELETE");
  assert.equal((await request("/marks")).body.data.length, 0);
});

test("teacher deletion is blocked while referenced by attendance or marks", async () => {
  const student = await createStudent();
  const teacher = await createTeacher();
  await request("/attendance", "POST", {
    studentId: student.body.data.id,
    teacherId: teacher.body.data.id,
    date: "2026-10-26",
    status: "late"
  });
  assert.equal(
    (await request(`/teachers/${teacher.body.data.id}`, "DELETE")).status,
    409
  );
});

test("malformed JSON, request size, and missing routes return JSON errors", async () => {
  const unknown = await request("/unknown");
  assert.equal(unknown.status, 404);
  assert.equal(typeof unknown.body.error.message, "string");

  const malformed = await fetch(`${baseUrl}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error.message, /Malformed JSON/);

  const oversized = await fetch(`${baseUrl}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: "x".repeat(65 * 1024) })
  });
  assert.equal(oversized.status, 413);
});
