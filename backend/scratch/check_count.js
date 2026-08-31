const axios = require('axios');

async function main() {
  const url = 'https://bytequest-qbq2.onrender.com/api/v1';
  try {
    const loginRes = await axios.post(`${url}/auth/login`, {
      email: 'admin@bytequest.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    const statsRes = await axios.get(`${url}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("📊 Production Stats:", statsRes.data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
