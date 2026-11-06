import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from './src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

(async ()=>{
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hoteldb' });
    const emailToFind = process.argv[2] || 'uitest+1@local.test';
        const u = await User.findOne({ email: emailToFind }).lean();
        if (!u) {
          console.log(JSON.stringify({ found: false, email: emailToFind }));
        } else {
          // hide passwordHash from output
          const { passwordHash, __v, ...safe } = u;
          console.log(JSON.stringify({ found: true, user: safe }, null, 2));
        }
    await mongoose.disconnect();
  } catch (e) {
    console.error('find user err', e && e.message);
    process.exit(1);
  }
})();
