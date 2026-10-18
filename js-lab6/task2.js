// Asynchronous operation 1: Fetch Profile Details
async function fetchUserProfile(userId) {
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userId <= 0) {
        return reject(new Error("Invalid User ID provided for profile fetch."));
      }
      // Returns profile object
      resolve({
        userId: userId,
        username: "johndoe",
        status: "ACTIVE"
      });
    }, 300);
  });
}


async function fetchUserPermissions(userId) {
  // Simulating async network call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        userId: userId,
        role: "ADMIN",
        isVerified: true
      });
    }, 500);
  });
}


function aggregateAndValidateUserData(userId) {
  return new Promise((resolve, reject) => {
    Promise.all([fetchUserProfile(userId), fetchUserPermissions(userId)])
      .then(([profile, permissions]) => {
        const isProfileValid = profile && profile.status === "ACTIVE";
        const isPermissionsValid = permissions && permissions.isVerified === true;

        if (isProfileValid && isPermissionsValid) {
          resolve({
            user: profile.username,
            role: permissions.role,
            status: "SUCCESSFULLY_VERIFIED"
          });
        } else {
          reject(new Error("Validation Failed: User profile is inactive or unverified."));
        }
      })
      .catch((error) => {
        reject(new Error(`Promise.all Execution Rejected: ${error.message}`));
      });
  });
}

// Execution and Testing
async function runTask2() {
  console.log("\n=== Task 2: Testing Promise.all with Validation ===");

  // Test Case 1: All operations valid -> Promise Accepts
  try {
    const result = await aggregateAndValidateUserData(1);
    console.log("Main Promise Accepted:", result);
  } catch (err) {
    console.error("Main Promise Rejected:", err.message);
  }

  // Test Case 2: One operation fails network/ID check -> Promise Rejects
  try {
    const result = await aggregateAndValidateUserData(-1);
    console.log("Main Promise Accepted:", result);
  } catch (err) {
    console.error("Main Promise Rejected:", err.message);
  }
}

runTask2();