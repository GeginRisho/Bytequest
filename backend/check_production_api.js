const axios = require('axios');

async function main() {
  const url = 'https://bytequest-qbq2.onrender.com/api/v1';
  try {
    console.log("Logging in as admin on production...");
    const loginRes = await axios.post(`${url}/auth/login`, {
      email: 'admin@bytequest.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log("Login successful! Token obtained.");

    console.log("Fetching production /admin/dashboard-stats...");
    const statsRes = await axios.get(`${url}/admin/dashboard-stats`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Production stats response:", statsRes.data);
  } catch (err) {
    console.error("Error fetching stats:", err.response ? err.response.data : err.message);
  }
}

main();
