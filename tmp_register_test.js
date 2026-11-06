const payload = {
  fullname: 'Test User',
  email: 'test1@example.com',
  password: 'password',
  phone: '1234567890',
  role: 'user'
};
const res = await fetch('http://localhost:4000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const text = await res.text();
console.log('status:', res.status);
console.log('body:', text);
