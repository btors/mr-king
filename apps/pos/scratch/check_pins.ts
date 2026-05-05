import axios from 'axios';

async function main() {
  try {
    const response = await axios.get('http://localhost:3000/api/auth/pin');
    console.log('API PINS:', response.data);
  } catch (err) {
    console.error('Failed to get pins:', err.message);
  }
}

main();
