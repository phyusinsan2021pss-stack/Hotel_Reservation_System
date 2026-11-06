import fs from 'fs';
import { start } from './src/index.js';

const BASE = 'http://localhost:4000';

async function ensureServer() {
  try {
    const res = await fetch(BASE + '/');
    if (res.ok) return;
  } catch (e) {
    // not reachable, try to start server in-process
    console.log('Server not reachable, attempting to start it...');
    await start();
    // give listener a moment
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res2 = await fetch(BASE + '/');
      if (res2.ok) return;
    } catch (e2) {
      console.error('Failed to start server in-process:', e2.message || e2);
      throw e2;
    }
  }
}

async function post(path, body, token) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = text; }
  return { status: res.status, body: json };
}

async function get(path) {
  const res = await fetch(BASE + path);
  const body = await res.json();
  return { status: res.status, body };
}

async function run() {
  try {
  await ensureServer();
    console.log('Registering user...');
    let r = await post('/api/auth/register', { fullname: 'SmokeUser', email: 'smoke@local.test', password: 'password' });
    console.log('register', r.status, r.body);

    console.log('Logging in user...');
    r = await post('/api/auth/login', { email: 'smoke@local.test', password: 'password' });
    console.log('login', r.status, r.body);
    const token = r.body.token;

  console.log('Seeding migration (room)...');
    const migrationPayload = { allBookings: [], allInHouse: [], allArchived: [], allCashData: [], allCashArchived: [], rooms: [{ hotelName: 'SmokeHotel', roomNo: '201', type: 'Deluxe', capacity: 2, pricePerNight: 100, status: 'available' }] };
    // migration endpoint is admin-protected. If current token is not admin, try to obtain an admin token (login existing admin or create one).
    r = await post('/api/migration/localdata', migrationPayload, token);
    if (r.status === 403) {
      console.log('migration returned 403, attempting to get admin token...');
      // try to login admin
      let adminLogin = await post('/api/auth/login', { email: 'admin@local.test', password: 'password' });
      if (adminLogin.status !== 200) {
        console.log('Admin login failed, attempting to register admin...');
        const reg = await post('/api/auth/register', { fullname: 'Admin', email: 'admin@local.test', password: 'password', role: 'admin' });
        console.log('admin register', reg.status, reg.body);
        adminLogin = await post('/api/auth/login', { email: 'admin@local.test', password: 'password' });
      }
      if (adminLogin.status === 200 && adminLogin.body && adminLogin.body.token) {
        const adminToken = adminLogin.body.token;
        r = await post('/api/migration/localdata', migrationPayload, adminToken);
      } else {
        console.log('Unable to obtain admin token for migration, aborting.');
      }
    }
    console.log('migration', r.status, r.body);

  console.log('Checking availability...');
  r = await get('/api/availability?hotelName=SmokeHotel&checkInDate=2025-08-20&checkOutDate=2025-08-22');
  console.log('availability', r.status, r.body);
  // availability endpoint returns { available: [...], count }
  const available = Array.isArray(r.body) ? r.body : (r.body && r.body.available) ? r.body.available : [];
  const room = available[0];

    console.log('Creating first booking...');
    const booking = { hotelName: 'SmokeHotel', roomId: room._id, roomNo: room.roomNo, fullname: 'SmokeUser', mobile: '000', checkInDate: '2025-08-20', checkOutDate: '2025-08-22', totalPeople: 2, price: 200 };
    r = await post('/api/bookings', booking, token);
    console.log('booking1', r.status, r.body);

    console.log('Creating overlapping booking (should fail)...');
    const booking2 = { ...booking, checkInDate: '2025-08-21', checkOutDate: '2025-08-23' };
    r = await post('/api/bookings', booking2, token);
    console.log('booking2', r.status, r.body);

    // Admin endpoints quick check
    console.log('Checking admin pending list...');
    let adminLogin = await post('/api/auth/login', { email: 'admin@local.test', password: 'password' });
    if (adminLogin.status !== 200) {
      await post('/api/auth/register', { fullname: 'Admin', email: 'admin@local.test', password: 'password', role: 'admin' });
      adminLogin = await post('/api/auth/login', { email: 'admin@local.test', password: 'password' });
    }
    if (adminLogin.status === 200) {
      const adminToken = adminLogin.body.token;
      const pendingRes = await fetch(BASE + '/api/admin/pending', { headers: { Authorization: `Bearer ${adminToken}` } });
      const pendingJson = await pendingRes.json().catch(()=>({}));
      console.log('admin pending', pendingRes.status, pendingJson && pendingJson.pending ? pendingJson.pending.length : pendingJson);
      const first = pendingJson.pending && pendingJson.pending[0];
      if (first) {
        const approveRes = await fetch(BASE + '/api/admin/approve/' + first.id, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('admin approve', approveRes.status);
      }
    }

  } catch (err) {
    console.error('smoke error', err);
    process.exit(1);
  }
}

run();
