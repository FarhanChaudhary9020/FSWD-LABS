
function fakeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(new Error('Aborted'));

    options.signal?.addEventListener('abort', () => reject(new Error('Request Timeout / Aborted')));

    setTimeout(() => {
      if (url === '/users') resolve({ ok: true, json: async () => [{ id: 1, name: 'Ali' }, { id: 2, name: 'Sara' }] });
      else if (url === '/courses') resolve({ ok: true, json: async () => [{ code: 'CS301' }, { code: 'CS302' }] });
      else if (url === '/results') resolve({ ok: true, json: async () => [{ id: 1, marks: 85, dept: 'CS' }, { id: 2, marks: 40, dept: 'CS' }] });
      else resolve({ ok: false, status: 404 });
    }, 100);
  });
}


async function getJSON(url, fetchImpl = fakeFetch) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
  return await response.json();
}


async function loadDashboard() {
  try {
    const [users, courses, results] = await Promise.all([
      getJSON('/users'),
      getJSON('/courses'),
      getJSON('/results')
    ]);

    const totalStudents = users.length;
    const totalCourses = courses.length;
    const overallAvg = results.reduce((s, r) => s + r.marks, 0) / results.length;
    const failedCount = results.filter(r => r.marks < 50).length;

    console.log('Dashboard Data Aggregated:', { totalStudents, totalCourses, overallAvg, failedCount });
  } catch (err) {
    console.error('Dashboard aggregation failed:', err.message);
  }
}


async function fetchWithTimeout(url, ms, fetchImpl = fakeFetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP Status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer); 
  }
}


loadDashboard();
fetchWithTimeout('/users', 500)
  .then(data => console.log('Fetch with timeout succeeded:', data))
  .catch(err => console.error('Fetch with timeout failed:', err.message));