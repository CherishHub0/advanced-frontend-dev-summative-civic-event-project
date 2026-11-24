# CivicEvents+ Frontend

A calm, responsive frontend for the CivicEvents+ API, built with **HTML, Tailwind CSS (CDN) and jQuery**. There's no framework and no build step.

People sign in to browse community events, register, leave feedback, listen to audio announcements and watch captioned promo videos. Admins also manage events, media, notifications and users, and get a dashboard with charts.

---

## 1. Run it locally

### What you need
- Node.js (LTS)
- PostgreSQL 15+ (tested with 17)
- VS Code with the **Live Server** extension (or any static file server)

### Backend and database
```bash
# 1. Create the database
createdb -U postgres -h localhost civic-events-db

# 2. Create the tables
psql -U postgres -h localhost -d civic-events-db -f backend/migrations/001_create_tables.sql

# 3. Configure backend/.env (note: the code reads DB_PASS, not DB_PASSWORD)
DB_USER=postgres
DB_PASS=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civic-events-db
JWT_SECRET=any-long-random-string

# 4. Install and start
cd backend
npm install
npm run dev        # -> "CivicEvents+ backend listening on port 4000" + "Connected to PostgreSQL"
```
Check it's up at http://localhost:4000/health.

> Windows tip: if `psql` isn't recognised, run
> `$env:Path += ";C:\Program Files\PostgreSQL\17\bin"` in the terminal first.

### Frontend
1. Open the project in VS Code.
2. Right-click `frontend/index.html` and choose **Open with Live Server** (it opens on `http://127.0.0.1:5500`).
3. `index.html` is the landing page. If you're already signed in, it sends you to Events (or the Admin dashboard for admins).

### API base URL
The frontend talks to **`http://localhost:4000/api`**. It's set in one place:
```js
// frontend/assets/js/config.js
API_URL: 'http://localhost:4000/api',
```
Change it there if the backend runs somewhere else. CORS is already enabled on the backend.

### Creating an admin account
There's no seed data. Sign up through the app, then promote that account:
```bash
psql -U postgres -h localhost -d civic-events-db -c "UPDATE users SET role='admin' WHERE email='you@example.com';"
```
Sign out and back in so the new role is in your token.

---

## 2. Features

| Area | What's there |
|---|---|
| **Auth** | Signup with a live password strength meter that mirrors the backend rule (8+ characters, upper, lower, number, symbol). Login with "remember me" (localStorage vs sessionStorage), automatic sign-out when the 1-hour JWT expires, and sign-out on any 401. |
| **Roles** | Route guards for logged-in and admin-only pages. Admin-only buttons are removed from the page for normal users. |
| **Layout** | Sticky navbar with logo, event search, links, a notification bell with unread count, and a profile dropdown. Also a mobile menu, a footer, and an admin sidebar. |
| **Events** | List with search, date filter, location filter, a specific-date picker and pagination. Detail page with register/cancel and a 1–5 star rating with comment. Admins can create/edit with image upload, preview and drag-and-drop, and can delete. |
| **Registrations** | "My registrations" with Upcoming / Past / Cancelled tabs. Each row shows your rating, and upcoming rows can be cancelled. |
| **Feedback** | One review per user per event. You can edit your own. Admins see every review, the average rating and the attendee list. |
| **Announcements** | Audio list with a quick-play button, a detail page with an accessible player, and duration read from the file. Admins can upload, edit the title, publish/unpublish and delete. |
| **Promos** | Video list (paginated by the server), a detail page with the player, captions and a synced transcript. Admins can upload, edit, publish/unpublish and delete. |
| **Notifications** | Bell and slide-in drawer, a full page with All/Unread filter and a detail view that links to the related item. Admins can delete. |
| **Profile** | View and edit name and email. Role is shown but never editable. Activity stats come from `/dashboard/me`. |
| **Admin dashboard** | Summary cards and three charts (Chart.js): new users per month, upcoming vs past events, and content totals. |
| **User management** | Search, status filter, pagination, enable/disable. Roles can't be changed, and admins can't disable themselves. |
| **Errors** | Friendly messages everywhere. 401 signs you out, 403 shows "you don't have permission", network errors show a retry button. Forms are validated before sending, and file type and size are checked before upload. |
| **Polish** | Skeleton loaders, toasts, lazy-loaded images, optimistic updates (register, cancel, publish, delete, enable/disable), and short-lived caching of lists (stale-while-revalidate). |
| **Accessibility** | Semantic landmarks, skip link, labels and `aria-*` on every control, focus rings, keyboard-friendly dialogs (Esc closes, focus returns), live regions for updates, reduced-motion support, and mobile-first layouts. |

### Upload limits (checked in the browser before sending)
| Upload | Types | Max |
|---|---|---|
| Event image | jpg, jpeg, png, gif | 2 MB |
| Announcement audio | mp3, wav, m4a, ogg | 5 MB |
| Promo video | mp4, mov, avi, mkv (mp4 recommended) | 8 MB |

---

## 3. Where the role guards are

Search the code for **`ROLE GUARD`**. They're all marked with comments.

- `assets/js/auth.js` has the four guards:
  - **GUARD 1** `requireLogin()`: every protected page calls it first
  - **GUARD 2** `requireAdmin()`: every page in `/admin/`
  - **GUARD 3** `guestOnly()`: login and signup pages
  - **GUARD 4** `applyRoleVisibility()`: removes anything marked `data-role="admin"` for normal users
- `assets/js/api.js`: a 401 response signs the user out, and a 403 shows a permission message.
- Page scripts (`assets/js/pages/*.js`) and HTML mark admin-only controls with `ROLE GUARD` comments.

These guards are for the user experience only. **The backend is the real security**: it checks the token and role on every request.

---

## 4. Backend limitations and how the frontend handles them

The assignment is frontend-only, so the backend wasn't changed. Where the provided API can't do something the brief asks for, this is what the frontend does:

| The brief asks for | What the backend actually does | What the frontend does |
|---|---|---|
| Service requests (rubric) | No such feature or endpoint | Not built |
| Published toggle on events | Ignores `published` for events | No toggle on events. Announcements and promos keep theirs |
| Server-side search, filters and paging for events | `GET /events` returns everything | Search, filters and pagination run in the browser |
| Average rating and feedback for everyone | Feedback-by-event route is admin-only, with no average | Admins see all reviews and the average. Users see and edit their own |
| Mark notification as read / unread count | No endpoint, and `read` is shared by all users | Opened notification IDs are remembered per user in the browser |
| Admin creates broadcast notifications | No create route | Notifications appear automatically when an admin adds an event, announcement or promo |
| Audio duration and transcript | Not stored | Duration is read from the audio file. No transcript is shown |
| Promo caption file | Only `caption_text` | Text is turned into a WebVTT captions track in the browser, plus a transcript |
| Replace announcement audio | Edit only accepts title and published | Edit form changes the title and visibility only, and says so |
| Block disabled users | Login doesn't check `is_active` | After login the app checks `/users/profile/me` and refuses disabled accounts |
| Register again after cancelling | Cancel sets status to `cancelled`, and re-register returns 409 | The event page explains this. Cancel confirmations warn first |
| Delete an event with registrations | Database foreign key blocks it (500) | Friendly message suggesting edit instead |
| Signup accepts a `role` field | Anyone could send `role: admin` | The signup form never sends `role` |

Other backend notes: the README says `DB_PASSWORD`, but the code reads **`DB_PASS`**. `002_seed_data.sql` doesn't exist, so `npm run db:seed` fails.

---

## 5. Project structure
```
frontend/
  index.html                 landing page for visitors (signed-in users are redirected)
  login.html  signup.html
  events.html  event-detail.html  my-registrations.html
  announcements.html  announcement-detail.html
  promos.html  promo-detail.html
  notifications.html  profile.html
  admin/
    dashboard.html  users.html
    event-form.html  announcement-form.html  promo-form.html
  assets/
    css/styles.css           base styles, skeleton shimmer, focus ring, reduced motion
    js/
      theme.js               Tailwind config: warm stone neutrals + sage accent
      config.js              API base URL
      api.js                 AJAX wrapper: token header, error handling, 401/403
      auth.js                token storage, expiry timer, ROLE GUARDS
      ui.js                  toasts, confirm dialog, skeletons, empty/error states
      shared.js              caching, upload checks, event visuals, date helpers
      layout.js              navbar, notification drawer, footer, admin sidebar
      pages/                 one script per page
```

## 6. Design
- Warm stone neutrals (`#FAFAF9` background, `#1C1917` text) with a single muted **sage** accent (`#436652`) for primary actions.
- **Plus Jakarta Sans** for headings, **Inter** for body text.
- Rounded cards, thin borders, soft shadows and gentle fade-ins. Events without images get a calm generated cover instead of a broken image.
