const axios = require('axios');

async function main() {
  const url = 'https://bytequest-qbq2.onrender.com';
  try {
    console.log("Checking production root / endpoint...");
    const rootRes = await axios.get(`${url}/`);
    console.log("Root Response:", rootRes.data);

    console.log("Checking production /health endpoint...");
    const healthRes = await axios.get(`${url}/health`);
    console.log("Health Response:", healthRes.data);
  } catch (err) {
    console.error("Error calling production API:", err.response ? err.response.data : err.message);
  }
}

main();
