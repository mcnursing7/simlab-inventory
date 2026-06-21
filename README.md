# SimLab Inventory System
## Supabase + Vercel — Full Deployment Guide

---

## OVERVIEW

This app uses:
- **Supabase** — database (PostgreSQL), authentication, and API (free, never sleeps)
- **Vercel** — hosts the React frontend (free)
- **GitHub** — connects Vercel to your code (free)

Total setup time: ~30 minutes

---

## STEP 1 — Create a Supabase Project

1. Go to https://supabase.com and sign up (free)
2. Click **"New Project"**
3. Fill in:
   - **Name:** SimLab Inventory
   - **Database Password:** pick a strong password (save it!)
   - **Region:** pick closest to you
4. Click **"Create new project"** — wait ~2 minutes for it to spin up

---

## STEP 2 — Run the Database Schema

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase/schema.sql` from this project
4. Copy the ENTIRE contents and paste into the SQL Editor
5. Click **"Run"** (green button)
6. You should see "Success. No rows returned" — that means it worked

---

## STEP 3 — Create Your Admin User

Supabase handles authentication. You need to create users manually the first time:

1. In Supabase, go to **Authentication → Users** in the left sidebar
2. Click **"Add user" → "Create new user"**
3. Enter:
   - Email: `admin@simlab.edu`
   - Password: `admin123`
   - Check **"Auto Confirm User"**
4. Click **"Create User"**
5. Copy the **User UID** shown (looks like: `a1b2c3d4-...`)
6. Go to **SQL Editor**, run this (replace YOUR_UID with the actual UID):

```sql
UPDATE public.profiles
SET name = 'Dr. Sarah Mitchell', role = 'admin'
WHERE id = 'YOUR_UID_HERE';
```

7. Repeat steps 2–6 for:

**Manager:**
- Email: `manager@simlab.edu` / Password: `mgr123`
- SQL: `UPDATE public.profiles SET name = 'James Okonkwo', role = 'manager' WHERE id = 'YOUR_UID';`

**Lab Staff:**
- Email: `staff@simlab.edu` / Password: `lab123`
- SQL: `UPDATE public.profiles SET name = 'Priya Sharma', role = 'lab_staff' WHERE id = 'YOUR_UID';`

---

## STEP 4 — Get Your Supabase Keys

1. In Supabase, go to **Settings → API** (gear icon in sidebar)
2. You need two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting with `eyJ...`
3. Keep this tab open — you'll need these values in Step 6

---

## STEP 5 — Put the Code on GitHub

1. Go to https://github.com and sign up / sign in
2. Click **"+"** → **"New repository"**
3. Name it `simlab-inventory`, set to **Private**, click **"Create repository"**
4. On your computer, open Terminal (Mac/Linux) or Command Prompt (Windows)
5. Navigate to this project folder:
   ```
   cd path/to/simlab-final
   ```
6. Run these commands one by one:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/simlab-inventory.git
   git push -u origin main
   ```
   (Replace YOUR_USERNAME with your GitHub username)

---

## STEP 6 — Create the .env File (local development only)

1. In the project folder, copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and fill in your values from Step 4:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJyour-long-anon-key-here
   ```

---

## STEP 7 — Deploy to Vercel

1. Go to https://vercel.com and sign up with your GitHub account
2. Click **"Add New Project"**
3. Find `simlab-inventory` in the list and click **"Import"**
4. Under **"Environment Variables"**, add these two:
   - Name: `VITE_SUPABASE_URL` → Value: your Project URL from Step 4
   - Name: `VITE_SUPABASE_ANON_KEY` → Value: your anon key from Step 4
5. Leave everything else as default
6. Click **"Deploy"**
7. Wait ~2 minutes — Vercel builds and deploys automatically
8. You'll get a URL like: `https://simlab-inventory-abc123.vercel.app`
   **That's your live app — accessible from any device, anywhere!**

---

## STEP 8 — Test Your App

1. Open your Vercel URL on any device
2. Log in with: `admin@simlab.edu` / `admin123`
3. You should see the dashboard with sample data already loaded
4. Try on your phone — it's fully mobile responsive

---

## RUNNING LOCALLY (for testing/development)

```bash
# Install dependencies (only needed once)
npm install

# Start local dev server
npm run dev

# Open http://localhost:5173 in your browser
```

---

## ADDING MORE USERS

After deployment, log in as Admin or Manager and go to **Users → Add User**.

Note: Creating users requires the Supabase **service role key** for the admin API.
For a simpler approach, create users directly in:
**Supabase Dashboard → Authentication → Users → Add User**
Then update their profile name/role in the SQL Editor as shown in Step 3.

---

## YOUR APP URL

After deployment, your app lives at your Vercel URL.
Share it with your team — they can log in from any browser, phone, or tablet.

To get a custom domain (e.g. inventory.simlab.edu):
- Go to Vercel → your project → Settings → Domains
- Add your custom domain and follow the DNS instructions

---

## FILE STRUCTURE

```
simlab-final/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.js          # Build config
├── vercel.json             # Vercel routing
├── .env.example            # Environment variable template
├── supabase/
│   └── schema.sql          # Full database schema — run in Supabase
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # App shell, navigation, auth gate
    ├── index.css           # All styles
    ├── lib/
    │   ├── supabase.js     # Supabase client + auth functions
    │   └── db.js           # All database query functions
    ├── hooks/
    │   ├── useAuth.jsx     # Auth context (current user)
    │   └── useData.jsx     # Data context (all inventory data)
    ├── components/
    │   └── UI.jsx          # Shared UI components + icons
    └── pages/
        ├── Login.jsx       # Login page
        ├── Dashboard.jsx   # Dashboard + low stock alerts
        ├── MasterList.jsx  # Item master list + barcode/QR labels
        ├── OnHand.jsx      # Inventory on hand + drill-down
        ├── Locations.jsx   # Location management
        ├── Vendors.jsx     # Vendor management
        ├── PurchaseOrders.jsx  # PO creation and viewing
        ├── Receiving.jsx   # Receive against POs
        ├── Adjustments.jsx # Inventory adjustments
        ├── Transfers.jsx   # Transfer between locations
        ├── Reports.jsx     # All 5 report types
        └── Users.jsx       # User management
```

---

## FEATURES INCLUDED

✅ Master item list with SKU, price, min/max quantities
✅ Inventory on hand per location with drill-down to POs & transactions
✅ Barcode (CODE128) and QR code generation with print labels
✅ Keyboard barcode scanner support (scan directly into search fields)
✅ Purchase order creation and receiving workflow
✅ Inventory adjustments (usage, discrepancy, damaged, expired, etc.)
✅ Location-to-location transfers
✅ 5 reports: On Hand, Receiving, Adjustments, Usage, Low Stock — all printable
✅ Low stock alerts on dashboard with visual indicators
✅ 3 user roles: Admin, Manager, Lab Staff with appropriate permissions
✅ Mobile responsive — works on phones and tablets
✅ Real-time data — all users see the same live database
✅ Supabase auth with row-level security
✅ Light blue minimalist theme with DM Sans font

