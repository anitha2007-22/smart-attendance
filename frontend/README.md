# Smart Attendance System — Frontend

Pure HTML5 / CSS3 / Vanilla JavaScript (ES6) / Bootstrap 5 / Chart.js. No build step required.

## Structure
```
frontend/
├── public/              <- Serve this folder as your web root
│   ├── index.html        Redirects to login or dashboard
│   ├── shared/login.html Unified login for all 3 roles
│   ├── admin/             Admin portal (10 pages)
│   ├── faculty/           Faculty portal (6 pages)
│   ├── student/           Student portal (6 pages)
│   └── src/                Shared CSS/JS assets (theme, API client, auth guard, layout)
└── src/                  <- Source copy (mirrored into public/src for serving)
```

## Running locally

Any static file server works. Example:

```bash
cd frontend/public
python3 -m http.server 8080
# or
npx serve -l 8080
```

Then open `http://localhost:8080`.

## Connecting to the backend

By default the API client points to `http://localhost:5000/api/v1` (see
`src/js/api/client.js`). To point elsewhere without editing the file, set
`window.__API_BASE_URL__` before the script loads, e.g. add to `<head>`:

```html
<script>window.__API_BASE_URL__ = 'https://your-api-domain.com/api/v1';</script>
```

## Key features implemented
- **Auth**: JWT login, auto-refresh on 401, role-based route guarding (`data-roles` attribute on the guard script)
- **Light/Dark mode**: persisted via localStorage, toggle in the topbar
- **Fully responsive**: sidebar collapses to off-canvas below 992px; stat grids and tables reflow on mobile
- **Admin**: dashboard, students/faculty/departments/subjects/timetable CRUD, analytics charts, PDF/Excel report downloads, notification broadcast
- **Faculty**: dashboard, weekly schedule, live attendance session with **rotating QR code** (auto-refreshes per backend TTL), manual roster marking, flagged (low Trust Score) record review, leave approval
- **Student**: dashboard with attendance gauge + subject chart, **camera-based QR scanner** (html5-qrcode) with manual token fallback, attendance history, timetable, leave application, notifications

## Browser QR Scanning
Uses `html5-qrcode` (CDN) which requires camera permission and (for non-localhost
deployments) HTTPS. A manual token-entry fallback is included for demo purposes
or when camera access isn't available.

## Notes
- All pages use a shared `renderLayout()` call to inject the sidebar/topbar — see `src/js/components/layout.js`.
- All list pages follow the same pattern: search/filter → paginated table → modal CRUD form, using `src/js/utils/helpers.js` for badges, toasts, and pagination.