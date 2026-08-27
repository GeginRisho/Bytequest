const axios = require('axios');

async function main() {
  const url = 'https://bytequest-qbq2.onrender.com/api/v1/diagnose/seed-admin';
  try {
    console.log("Triggering production admin account seeding...");
    const res = await axios.post(url);
    console.log("Seeding Response:", res.data);
  } catch (err) {
    console.error("Error triggering seeding:", err.response ? err.response.data : err.message);
  }
}

main();
