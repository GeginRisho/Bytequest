const axios = require('axios');

async function main() {
  const url = 'https://bytequest-qbq2.onrender.com/api/v1';
  try {
    console.log("🔐 Logging in as admin on production...");
    const loginRes = await axios.post(`${url}/auth/login`, {
      email: 'admin@bytequest.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log("📊 Requesting production validation report...");
    
    try {
      const validateRes = await axios.post(`${url}/admin/run-production-validation`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("🏆 Validation successful!");
      console.log(validateRes.data.stdout);
    } catch (valErr) {
      if (valErr.response && valErr.response.data) {
        console.log("🚨 Validation output (error):");
        console.log(valErr.response.data.error);
      } else {
        console.error("Connection error:", valErr.message);
      }
    }
  } catch (err) {
    console.error("Error logging in:", err.message);
  }
}

main();
