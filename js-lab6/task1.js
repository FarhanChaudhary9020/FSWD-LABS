// Function using async/await to fetch user data
async function fetchUserData(userId) {
  try {
    // 1. Make HTTP request to an API (using JSONPlaceholder test API)
    const response = await fetch(`https://jsonplaceholder.typicode.com/users/${userId}`);

   
    if (!response.ok) {
      throw new Error(`Failed to fetch user. HTTP Status: ${response.status}`);
    }

    const userData = await response.json();

    // 4. Validate user object content
    if (!userData || !userData.id || !userData.name) {
      throw new Error("Invalid user object structure received from API.");
    }

    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      company: userData.company?.name
    };
  } catch (error) {
    throw new Error(`[User Fetch Error]: ${error.message}`);
  }
}

async function runTask1() {
  console.log("=== Task 1: Testing Async/Await Fetch ===");
 
  try {
    const user = await fetchUserData(1);
    console.log("Success Case:", user);
  } catch (err) {
    console.error(err.message);
  }

  try {
    const invalidUser = await fetchUserData(9999); // Non-existent user ID
    console.log("Success Case:", invalidUser);
  } catch (err) {
    console.error("Failure Case:", err.message);
  }
}

runTask1();