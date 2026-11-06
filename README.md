Hotel backend (minimal starter)

Setup

1. Copy `.env.example` to `.env` and set MONGODB_URI and JWT_SECRET.
2. Install dependencies:

   npm install

3. Run in dev:

   npm run dev

APIs

- POST /api/auth/register { fullname, email, password }
- POST /api/auth/login { email, password }
- GET /api/bookings (auth) - list
- POST /api/bookings (auth) - create booking

Serving frontend

This backend now serves the production frontend located at `../Final Frontend` (relative to the `server` folder). You can override this by setting `FRONTEND_DIR` in `.env` to either an absolute path or a path relative to the repository root. For backward compatibility the server will fall back to `../FinalProject` if the new folder is missing.

How to run (development):

1. From the workspace root:

```powershell
cd server
npm run dev
```

2. By default the server listens on port 4000. If `../Final Frontend/Homepage.html` exists the root path `/` will return that file and all static assets under `../Final Frontend` are served.

- Default accounts:
   - Admin: `admin@gmail.com` / `admin123@` (phone `09999999992`)
   - Staff (sample): `staff@local.test` / `password`

Notes:
- CORS is permissive by default via `app.use(cors())`. If you need to restrict origins, set up the allowed origin(s) in `src/index.js` or via an environment variable.
- The server requires a MongoDB connection string in `MONGODB_URI` to enable API endpoints that use the database. For quick static-only testing you can run the server but some endpoints may fail if the DB is unreachable.

Next steps
- Update CORS origin(s) if you want to restrict which frontends are allowed.
- Optionally point the frontend JS to API endpoints under `/api` (same origin) so no additional CORS config is needed.


## Database options

- **Atlas**: set `MONGODB_URI` to your Atlas URI and ensure your IP is allowlisted.
- **Local Docker**:
   - Start MongoDB: `npm run mongo:up`
   - Stop MongoDB: `npm run mongo:down`
   - View logs: `npm run mongo:logs`
   - Check status: `npm run mongo:status`
   - Data persists in the named Docker volume `hotel_mongo_data`.
   - Example URI: `MONGODB_URI=mongodb://localhost:27017/hoteldb`
- **Dev fallback**: if `MONGODB_URI` is missing/unavailable, the app tries an in-memory MongoDB (mongodb-memory-server) for local development.

## Seeding and setup

- Seed admin, room types, payment types, and sample rooms:
   ```powershell
   npm run seed
   ```

## ER Diagram Coverage

Entities and relationships from the ER diagram are mapped to the following models:

- **Admin**: Tracks adminId, username, passwordHash, confirmation, and links to User.
- **User**: Single source of truth for customer login/profile data (fullname, email, phone, address, role, optional customerCode).
- **RoomType**: Defines code, name, description, baseAmount, maxOccupancy, amenities.
- **Room**: References RoomType, tracks lastCheckedBy/At, and links to hotel.
- **Transaction**: Connects booking, user, paymentType, and records payment details and status.
- **PaymentType**: Catalogs payment methods (e.g., cash, card_sim).

## Environment variables

- `MONGODB_URI`: MongoDB connection string (Atlas, Docker, or local)
- `JWT_SECRET`: Secret for signing JWT tokens
- `FRONTEND_DIR` (optional): Absolute or repo-relative path to the static frontend bundle

## Testing

- Run all tests:
   ```powershell
   npm test
   ```
- Tests use an in-memory MongoDB replica set for isolation.

## Admin workflow

- Users can request admin during registration; approval is required by an existing admin.
- Admins can view pending requests, approve, or create new admin records.

## API endpoints

- See above for main endpoints. Additional endpoints for transactions and room types can be added as needed.

Admin endpoints

- GET `/api/admin/pending` (admin) – list users requesting admin.
- POST `/api/admin/approve/:id` (admin) – promote user and mark Admin record approved.
- POST `/api/admin/create` (admin) – create an Admin record (validated).

Dev convenience

- The frontend demo admin login (admin@miit.com / admin123) stores a `DEMO_ADMIN_TOKEN` in session storage.
- In non-production NODE_ENV, the middleware accepts this token as an admin for local testing only.
- In production, always use real login to get a signed JWT (no bypass).
