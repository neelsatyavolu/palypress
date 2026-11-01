# PALY Press

PALY Press is a React Native mobile application for Paly journalism, featuring unified article browsing across multiple publications (Paly Voice, Campanile, Verde Magazine), user authentication, saved articles, and commenting functionality.

## Tech Stack

- **Frontend:** React Native (Expo)
- **Backend:** Express.js (hosted on Railway)
- **Database:** PostgreSQL (hosted on Railway)
- **ORM:** Drizzle ORM
- **Authentication:** Session-based with bcrypt
- **Content Sources:** Multiple WordPress REST APIs (Paly Voice, Campanile, Verde Magazine)
- **Deployment:** Railway (backend and database)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on your phone

## Installation

This app is pre-configured with a hosted backend and database, so you can get started immediately:

1. Clone the repository:
   ```bash
   git clone https://github.com/neelsatyavolu/palypress.git
   cd palypress
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm run expo
   ```

4. Open the app:
   - **iOS Simulator:** Press `i` in the terminal
   - **Android Emulator:** Press `a` in the terminal
   - **Physical Device:** Open the Expo Go app and scan the QR code

That's it! The app connects to a hosted Railway backend with a PostgreSQL database, so no additional setup is required.

## Backend & Database

The app uses a centralized backend deployed on Railway:

- **Database:** PostgreSQL hosted on Railway
- **Backend Server:** Express.js API hosted on Railway
- **Data Persistence:** Drizzle ORM with the following tables:
  - `users` - User accounts with authentication
  - `saved_articles` - User's saved articles

All environment configuration is handled automatically. The mobile app connects to the production backend, so you can focus on development without worrying about infrastructure setup.

## Available Scripts

- `npm run expo` - Start Expo development server (alias for expo:dev)
- `npm run expo:dev` - Start Expo development server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run check:types` - Type check with TypeScript
- `npm run format` - Format code with Prettier

### Backend Development Scripts (Advanced)

These scripts are only needed if you're working on the backend server locally:

- `npm run server:dev` - Start Express backend server (development)
- `npm run server:prod` - Start Express backend server (production)
- `npm run db:push` - Push schema changes to database

## Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| email | TEXT | Unique email address |
| password | TEXT | Bcrypt hashed password |
| display_name | TEXT | User's display name (optional) |
| verification_code | TEXT | 6-digit email verification code |
| is_verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Account creation timestamp |

### Saved Articles Table

| Column | Type | Description |
|--------|------|-------------|
| user_id | VARCHAR | Foreign key to users.id |
| article_id | INTEGER | WordPress article ID |
| article_title | TEXT | Article title |
| article_excerpt | TEXT | Article excerpt (optional) |
| article_author | TEXT | Author name (optional) |
| article_date | TEXT | Publication date (optional) |
| article_image_url | TEXT | Featured image URL (optional) |
| saved_at | TIMESTAMP | When article was saved |

**Note:** Primary key is composite of (user_id, article_id) to prevent duplicate saves.

## Features

- **Unified Inbox:** Aggregate view of articles from all PALY publications (Paly Voice, Campanile, Verde Magazine)
  - Smart diversity algorithm ensures balanced representation from each publication
  - Cross-publication category filtering with intelligent merging
  - Publication badges show the source of each article
  - Easily switch between unified view and individual publication feeds
- **Article Browsing:** Browse articles from multiple PALY WordPress sites
- **User Authentication:** Email/password signup with verification
- **Save Articles:** Bookmark articles to read later
- **Comments:** Read and post comments on articles
- **Staff Profiles:** View staff writer profiles
- **Search:** Search articles by title and content

### Unified Inbox Details

The **Unified Inbox** is the default home view that aggregates content across all PALY publications:

- **Home View:** Shows articles from Paly Voice, Campanile, and Verde Magazine in a single feed
- **Diverse Feed Algorithm:** Intelligently mixes articles to ensure balanced representation:
  1. Displays the most recent article from each publication first
  2. Fills remaining slots with articles sorted chronologically across all sources
- **Smart Category Merging:** Categories are intelligently merged across publications:
  - Plural forms are normalized to match (e.g., "Stories" matches with "Story")
  - Internal/admin categories are filtered out
  - Only popular categories (3+ combined articles) are displayed
  - Top 8 categories shown for easy navigation
- **Publication Switcher:** Quick navigation between the unified inbox and individual publication feeds
- **Article Attribution:** Each article displays a color-coded badge indicating its source publication

## Architecture

```
┌─────────────────────────┐
│   React Native Client   │
│  (Expo, React Query)    │
└───────────┬─────────────┘
            │ HTTPS
┌───────────▼─────────────┐
│   Express.js Server     │
│  (Session Auth, CORS)   │
│    Hosted on Railway    │
└───────────┬─────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼────┐   ┌──────▼──────────────────────┐
│Postgres│   │  WordPress REST APIs        │
│Railway │   │  - Paly Voice               │
└────────┘   │  - Campanile                │
             │  - Verde Magazine           │
             └─────────────────────────────┘
```

## Troubleshooting

**App won't connect:**
- Check your internet connection
- Ensure you're not behind a restrictive firewall
- Try restarting the Expo development server

**Import errors:**
- Clear Metro cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**App crashes on startup:**
- Make sure you're using Node.js v18 or higher
- Clear the app data in Expo Go or reinstall the app on the simulator

## Recent Updates

- **Unified Inbox (v1.1):** Added aggregated feed across all PALY publications with smart diversity algorithm
- **Multi-Publication Support:** App now connects to three PALY publications (Paly Voice, Campanile, Verde Magazine)
- **Publication Switcher:** Easy navigation between unified and individual publication views
- **Enhanced Session Management:** Improved cookie handling for better authentication reliability

## Configuration

Copy `.env.example` to `.env` (or `.dev.vars` for the Cloudflare Worker) and fill in your own values. Never commit real secrets.

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for copyright details.
