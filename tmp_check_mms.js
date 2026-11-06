import('mongodb-memory-server').then(() => console.log('mongodb-memory-server OK')).catch(err => { console.error('import failed:', err && err.message); process.exit(1); });
