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
    console.log("🔑 Login successful! Token obtained.");

    console.log("🌱 Triggering production database seeding...");
    const seedRes = await axios.post(`${url}/admin/run-production-seed`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Seeding completed!");
    console.log("Seed stdout:\n", seedRes.data.stdout);

    console.log("🧹 Running production duplicate options fix script...");
    const fixRes = await axios.post(`${url}/admin/run-production-fix`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Fix completed!");
    console.log("Fix stdout:\n", fixRes.data.stdout);

    console.log("📊 Running final validation checks...");
    try {
      const finalValRes = await axios.post(`${url}/admin/run-production-validation`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("📊 Final validation stdout:\n", finalValRes.data.stdout);
    } catch (valErr) {
      console.log("⚠️ Validation script returned errors or non-zero status.");
      if (valErr.response && valErr.response.data) {
        console.log("Validation stdout:\n", valErr.response.data.stdout);
        console.log("Validation stderr:\n", valErr.response.data.stderr);
      } else {
        console.log("Error details:", valErr.message);
      }
    }

  } catch (err) {
    console.error("❌ Error occurred:", err.response ? err.response.data : err.message);
  }
}

main();
