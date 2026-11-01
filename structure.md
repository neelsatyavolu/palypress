# PALY Press - Codebase Structure

This document provides a comprehensive overview of the PALY Press news app codebase for developers and AI agents.

## 1. Application Overview

**PALY Press** is a React Native mobile application (built with Expo) for Palo Alto High School student publications. It's a cross-platform news reader app that allows users to browse articles, read full content, comment on articles, save articles for later, and manage their profiles.

- **App Name:** PALY Press
- **iOS Bundle ID:** com.palyjournalism.app
- **Android Package:** com.palyvoice.app
- **Version:** 0.1.1
- **Platforms:** iOS, Android, Web

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Mobile UI framework |
| Expo | 54.0.31 | Build and development platform |
| React | 19.1.0 | UI library |
| React Navigation | 7.x | Navigation framework |
| TypeScript | ~5.9.2 | Type safety |
| React Native Reanimated | ~4.1.1 | Animations |
| TanStack React Query | 5.90.7 | Data fetching and caching |
| Zod | 3.24.2 | Schema validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.21.2 | REST API server |
| Node.js (TypeScript) | - | Server runtime |
| PostgreSQL | - | Database |
| Drizzle ORM | 0.39.3 | Type-safe database queries |
| bcrypt | 6.0.0 | Password hashing |
| express-session | 1.18.2 | Session management |

### External APIs
- **WordPress REST API** (palyvoice.com) - Article content, comments, staff profiles

---

## 3. Project Structure

```
paly_journalism_app/
├── client/                          # React Native client app
│   ├── App.tsx                     # Root component with providers
│   ├── index.js                    # Entry point
│   ├── screens/                    # Screen components (14 screens)
│   │   ├── HomeScreen.tsx          # Main article feed
│   │   ├── ArticleDetailScreen.tsx # Full article view
│   │   ├── CommentsScreen.tsx      # Dedicated comments page
│   │   ├── MyCommentsScreen.tsx    # User's own comments
│   │   ├── ProfileScreen.tsx       # User profile
│   │   ├── SavedArticlesScreen.tsx # Bookmarked articles
│   │   ├── SearchScreen.tsx        # Search functionality
│   │   ├── StaffListScreen.tsx     # Staff directory
│   │   ├── StaffDetailScreen.tsx   # Individual staff profile
│   │   ├── SignInScreen.tsx        # Authentication
│   │   ├── SignUpScreen.tsx        # Registration
│   │   ├── VerificationScreen.tsx  # Email verification
│   │   ├── WordPressPageScreen.tsx # CMS page wrapper
│   │   └── PlaceholderScreen.tsx   # Utility screen
│   │
│   ├── navigation/                 # Navigation structure
│   │   ├── RootStackNavigator.tsx  # Root navigation
│   │   ├── MainTabNavigator.tsx    # Bottom tab navigation
│   │   ├── HomeStackNavigator.tsx  # News tab stack
│   │   ├── ProfileStackNavigator.tsx# Profile/Auth tab stack
│   │   └── StaffStackNavigator.tsx # Staff navigation
│   │
│   ├── components/                 # Reusable UI components (17 components)
│   │   ├── ArticleCard.tsx         # Article preview card
│   │   ├── CommentCard.tsx         # Comment display
│   │   ├── CommentInput.tsx        # Comment composition
│   │   ├── CommentsSection.tsx     # Comment preview section
│   │   ├── ContributorCard.tsx     # Staff contributor display
│   │   ├── CategoryTabs.tsx        # Article category filter
│   │   ├── DrawerMenu.tsx          # Sidebar menu
│   │   ├── SearchHeader.tsx        # Search bar
│   │   ├── Button.tsx              # Styled button
│   │   ├── Card.tsx                # Generic card container
│   │   ├── ThemedText.tsx          # Text with theme
│   │   ├── ThemedView.tsx          # View with theme
│   │   ├── ErrorBoundary.tsx       # Error handling
│   │   ├── ErrorFallback.tsx       # Error UI
│   │   ├── HeaderTitle.tsx         # Header title
│   │   ├── KeyboardAwareScrollViewCompat.tsx
│   │   └── Spacer.tsx              # Spacing utility
│   │
│   ├── contexts/                   # State management
│   │   ├── AuthContext.tsx         # Authentication state
│   │   └── SavedArticlesContext.tsx# Saved articles state
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useTheme.ts             # Theme hook
│   │   ├── useColorScheme.ts       # Color scheme detection
│   │   └── useScreenOptions.ts     # Navigation options
│   │
│   ├── lib/                        # Utility functions
│   │   ├── query-client.ts         # React Query setup
│   │   ├── htmlUtils.ts            # HTML parsing helpers
│   │   └── htmlParser.ts           # Advanced HTML parsing
│   │
│   ├── types/                      # TypeScript interfaces
│   │   └── article.ts              # Article, Comment, Staff types
│   │
│   └── constants/                  # Configuration
│       └── theme.ts                # Colors, spacing, typography
│
├── server/                         # Express backend
│   ├── index.ts                    # Express app setup
│   ├── routes.ts                   # API endpoints
│   ├── storage.ts                  # Database operations
│   ├── db.ts                       # Database connection (Drizzle)
│   └── templates/
│       └── landing-page.html       # Landing page HTML
│
├── shared/                         # Shared code
│   └── schema.ts                   # Database schema (Zod + Drizzle)
│
├── assets/                         # Static assets
│   └── images/                     # App icons and images
│
└── Configuration Files
    ├── app.json                    # Expo configuration
    ├── package.json                # Dependencies
    ├── tsconfig.json               # TypeScript config
    ├── drizzle.config.ts           # Drizzle ORM config
    ├── babel.config.js             # Babel configuration
    └── eslint.config.js            # ESLint configuration
```

---

## 4. Database Schema

### Users Table
```typescript
users {
  id: uuid (PRIMARY KEY, auto-generated)
  email: text (UNIQUE, NOT NULL)
  password: text (hashed with bcrypt)
  displayName: text (optional, max 50 chars)
  verificationCode: text (6-digit code)
  isVerified: boolean (default: false)
  createdAt: timestamp (auto-set)
}
```

### Saved Articles Table
```typescript
savedArticles {
  userId: varchar (FK -> users.id, CASCADE delete)
  articleId: integer (NOT NULL)
  articleTitle: text (NOT NULL)
  articleExcerpt: text (optional)
  articleAuthor: text (optional)
  articleDate: text (optional)
  articleImageUrl: text (optional)
  savedAt: timestamp (auto-set)
  PRIMARY KEY: (userId, articleId)
}
```

---

## 5. State Management

### AuthContext
Manages user authentication state:
- `user` - Current logged-in user
- `isAuthenticated` - Boolean check
- `signIn(email, password)` - Login
- `signUp(email, password)` - Register
- `verify(email, code)` - Email verification
- `signOut()` - Logout
- `updateProfile(displayName)` - Update profile

### SavedArticlesContext
Manages bookmarked articles:
- `savedArticleIds` - Set of saved article IDs
- `saveArticle(article)` - Save to bookmarks
- `unsaveArticle(articleId)` - Remove from bookmarks
- `isArticleSaved(articleId)` - Check if saved

### TanStack React Query
Handles server data fetching with:
- Automatic caching
- Manual refresh (no auto-refetch)
- Credentials included in requests

---

## 6. Navigation Structure

```
RootStackNavigator
└── MainTabNavigator
    ├── NewsTab (HomeStackNavigator)
    │   ├── Home (article feed)
    │   ├── ArticleDetail
    │   ├── Staff
    │   ├── StaffDetail
    │   ├── Search
    │   ├── Comments
    │   └── WordPressPages (About, Policies, etc.)
    │
    └── ProfileTab (ProfileStackNavigator)
        ├── SignIn / SignUp / Verification (unauthenticated)
        └── Profile / SavedArticles / MyComments (authenticated)
```

---

## 7. API Endpoints

### Authentication (`/api/auth/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/verify` | Verify email with code |
| POST | `/api/auth/signin` | Login |
| POST | `/api/auth/signout` | Logout |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update display name |

### Articles (`/api/articles/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/articles/save` | Save article to bookmarks |
| DELETE | `/api/articles/save/:id` | Remove from bookmarks |
| GET | `/api/articles/saved` | Get all saved articles |
| GET | `/api/articles/saved/ids` | Get just the IDs |

### Comments (`/api/comments/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments/article/:postId` | Get article comments |
| GET | `/api/comments/mine` | Get user's comments |
| POST | `/api/comments` | Post new comment |
| PATCH | `/api/comments/:id` | Edit comment |
| DELETE | `/api/comments/:id` | Delete comment |

---

## 8. Key Features

1. **Browse Articles** - Infinite scroll feed with category filtering
2. **Read Full Articles** - HTML content rendering with author attribution
3. **Commenting System** - Post, edit, delete comments (requires auth)
4. **User Accounts** - Email/password registration with verification
5. **Save Articles** - Bookmark articles for later reading
6. **Search** - Search articles by keyword
7. **Staff Directory** - View all staff members and their articles
8. **CMS Pages** - About, Policies, Contact, Archives, etc.

---

## 9. Design System

### Colors
| Mode | Text | Background | Active Tab |
|------|------|------------|------------|
| Light | #11181C | #FFFFFF / #F2F2F2 | #007AFF |
| Dark | #ECEDEE | #1F2123 / #2A2C2E | #0A84FF |

### Spacing Scale
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 20px
- 2xl: 24px, 3xl: 32px, 4xl: 40px, 5xl: 48px

### Typography
| Level | Size | Weight |
|-------|------|--------|
| h1 | 32px | 700 |
| h2 | 28px | 700 |
| h3 | 24px | 600 |
| h4 | 20px | 600 |
| body | 16px | 400 |
| small | 14px | 400 |

---

## 10. Development Commands

```bash
# Development
npm run server:dev          # Start Express server (port 5000)
npm run expo:dev            # Start Expo dev client (port 8081)

# Code Quality
npm run lint                # ESLint check
npm run check:types         # TypeScript check
npm run format              # Auto-format code

# Database
npm run db:push             # Push schema to PostgreSQL

# Production Build
npm run expo:static:build   # Build static Expo bundle
npm run server:build        # Bundle server with esbuild
npm run server:prod         # Run production server
```

---

## 11. Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session signing key
- `EXPO_PUBLIC_DOMAIN` - Frontend domain for API requests
- `WP_USERNAME` - WordPress REST API credentials
- `WP_PASSWORD` - WordPress REST API credentials

### Optional
- `NODE_ENV` - "development" or "production"
- `PORT` - Express server port (default: 5000)

---

## 12. External Integrations

### WordPress REST API (palyvoice.com)
- **Articles:** `wp-json/wp/v2/posts?_embed`
- **Comments:** `wp-json/wp/v2/comments`
- **Staff:** Custom post type queries
- **Authentication:** Basic auth for protected operations

---

## 13. Path Aliases

Configured in `tsconfig.json`:
- `@/*` -> `./client/*`
- `@shared/*` -> `./shared/*`

---

## 14. Authentication Flow

1. User signs up with email/password
2. Backend generates 6-digit verification code
3. User enters code on verification screen
4. Email marked as verified
5. User can sign in (requires verified email)
6. Server creates session cookie (7-day expiration)
7. Session persists across app restarts

---

## 15. File Counts

- **Screens:** 14
- **Components:** 17
- **Navigation files:** 5
- **Context providers:** 2
- **Custom hooks:** 6+
- **Server files:** 4
- **Shared files:** 1 (schema)

---

## 16. Summary: What This Code Does

PALY Press is a mobile news app built for Palo Alto High School's student publications. Think of it like a custom news reader app (similar to Apple News or Flipboard) but specifically designed for the school's journalism programs. The app lets students, parents, and community members read articles published by the student journalists, browse through different news categories like Sports, Opinion, or Arts, and search for specific topics they're interested in.

The app connects to the school newspaper's existing WordPress website (palyvoice.com) to pull in all the article content, so when student journalists publish a new story on the website, it automatically shows up in the app. Users can create accounts to unlock additional features like saving articles to read later (bookmarking), leaving comments on articles to engage in discussions, and viewing their comment history. The commenting system integrates with WordPress so comments appear both in the app and on the website. There's also a staff directory where readers can browse all the student journalists, see their photos and bios, and find all the articles written by a specific author.

On the technical side, the app is built with React Native and Expo, which means a single codebase can run on both iPhones and Android phones. The backend is a Node.js server that handles user accounts, saved articles, and acts as a bridge to the WordPress API for comment operations. User passwords are securely hashed, and new accounts require email verification before they can sign in. The whole system is designed to give the student newspaper a professional, modern mobile presence while leveraging their existing WordPress infrastructure for content management.
