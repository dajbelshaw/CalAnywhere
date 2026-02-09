## CalAnywhere

Privacy-first scheduling that works with any calendar. The only open-source scheduling tool built for Proton Calendar, Fastmail, and every iCal-compatible provider.

![Screenshot](https://github.com/dajbelshaw/Scheduler/blob/main/scheduler-screenshot.png?raw=true)

### Why CalAnywhere?

Existing scheduling tools (Calendly, Cal.com, SavvyCal) only work with Google, Microsoft, and Apple calendars via OAuth. If you use Proton Calendar, Fastmail, Tutanota, or any other privacy-focused provider, you're out of luck.

CalAnywhere works with **any calendar** that provides an ICS subscription link — which is all of them. Paste your link, share your availability, and let people book time with you.

- **Any calendar provider** — Google, Outlook, Proton, Fastmail, Apple, Tutanota, or any ICS feed
- **Merge up to 5 calendars** — aggregate availability across work, personal, and other calendars
- **Temporary links** — scheduling pages expire on your schedule (1 hour to 30 days)
- **Email-verified requests** — spam-free appointment requests with bot detection
- **Fully configurable** — appointment duration, buffer time, minimum notice, working days, date range
- **Self-hostable** — run your own instance with Docker Compose
- **Open source** — AGPL-3.0 licensed, auditable code

### Self-hosting with Docker

```bash
# Clone the repo
git clone https://github.com/dajbelshaw/Scheduler.git
cd Scheduler

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Mailgun credentials

# Start everything
docker compose up -d
```

This starts PostgreSQL, the backend API, and the frontend on port 80. Put a reverse proxy (Caddy, nginx, Traefik) in front for HTTPS.

### Local development

**Backend:**

```bash
cd backend
cp .env.example .env
# Fill in your Mailgun credentials in .env
npm install
npm run dev
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend on port 4000.

### Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL (optional — runs in ephemeral in-memory mode without it)
- **Email**: Mailgun transactional email via HTTP API

### Environment variables

See [`backend/.env.example`](backend/.env.example) for the full list. The key ones:

| Variable | Required | Description |
|---|---|---|
| `MAILGUN_API_KEY` | Yes | Mailgun API key |
| `MAILGUN_DOMAIN` | Yes | Mailgun sending domain |
| `MAILGUN_FROM_EMAIL` | Yes | From address for emails |
| `BASE_PUBLIC_URL` | Yes | Public URL of the frontend |
| `DATABASE_URL` | No | PostgreSQL connection string (omit for in-memory mode) |

### License

[AGPL-3.0](LICENSE) — you can use, modify, and self-host freely. If you deploy a modified version publicly, you must share your source code.

### Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

---

Built by [Dynamic Skillset](https://dynamicskillset.com).
