import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;
console.log('Using MONGODB_URI=', uri ? uri.replace(/:.+@/, ':***@') : '(none)');
(async function(){
  if (!uri) { console.error('No MONGODB_URI in server/.env'); process.exit(2); }
  try {
    await mongoose.connect(uri, { dbName: 'hoteldb' , serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connect failed:', err.message || err);
    process.exit(3);
  }
})();
