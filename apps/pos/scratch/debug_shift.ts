async function main() {
  const API_URL = 'http://localhost:4000';
  
  try {
    // 1. Get PINs
    const pinsRes = await fetch(`${API_URL}/auth/pin`);
    const pins = await pinsRes.json();
    console.log('PINS:', pins);

    // 2. Login as Admin
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: pins.adminPin
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('Admin Token obtained');

    // 3. Try to open shift
    const openRes = await fetch(`${API_URL}/shifts/open`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ openingBalance: 500 })
    });
    
    if (openRes.ok) {
      console.log('Shift Opened successfully:', await openRes.json());
    } else {
      console.error('Failed to open shift:', openRes.status, await openRes.text());
    }

  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

main();
