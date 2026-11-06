(async()=>{ try { await import('./src/index.js'); console.log('import succeeded'); } catch (e) { console.error('import failed:', e && e.stack ? e.stack : e); process.exit(1); } })();
