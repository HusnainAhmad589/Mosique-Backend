const authService = require('./src/services/authService');

async function check() {
  try {
    const result = await authService.loginUser('superadmin@example.com', 'admin');
    console.log("Success:", result);
  } catch (err) {
    console.log("Error:", err.message);
  }
  process.exit();
}

check();
