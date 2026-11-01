# Design Guidelines: PALY Press News App

## Architecture Decisions

### Authentication
**No authentication required.**
- This is a content consumption app for a high school publication
- Data is fetched from a public WordPress API
- No user accounts or personalization features needed in MVP
- Future consideration: Add bookmarking/favorites feature that would require local storage only

### Navigation
**Stack-Only Navigation (Single Screen MVP)**
- Current scope: Single news feed homepage
- Future expansion will require Tab Navigation with:
  - Home (news feed)
  - Categories/Sections
  - Search
  - About/Settings

## Screen Specifications

### Home Screen (News Feed)
**Purpose:** Display recent articles from The Paly Voice publication in a scrollable feed.

**Layout:**
- **Header:** Custom header with transparent background
  - Left: School publication logo/name "The Paly Voice"
  - Right: Reserved for future search/filter icon
  - Top inset: `insets.top + Spacing.xl`
  
- **Main Content:** Scrollable FlatList
  - Uses FlatList component for optimal performance
  - Pull-to-refresh capability
  - Loading state: Centered ActivityIndicator during initial fetch
  - Empty state: Message if no articles available
  - Bottom inset: `insets.bottom + Spacing.xl`

- **Article Card Component:** Repeated for each news item
  - Full-width cards with internal padding
  - Card spacing: `Spacing.lg` between cards
  - Touchable with subtle press feedback (opacity: 0.7)
  - No drop shadow (clean, flat design)

**Card Structure (Top to Bottom):**
1. **Featured Image**
   - Aspect ratio: 16:9 (mandatory)
   - Border radius: 12px (top corners only if stacked, all corners if isolated)
   - Conditional rendering: Only show if image exists in API
   - Fallback: Gradient placeholder OR skip image entirely (reduce vertical space)
   
2. **Headline**
   - Font: Bold, 18pt
   - Color: Black
   - Line height: 1.3
   - Padding top: Spacing.md
   - Strip HTML tags and decode entities (e.g., &#8217; → ')
   
3. **Excerpt**
   - Font: Regular, 14pt
   - Color: Dark gray (#4A4A4A)
   - Max lines: 2 (ellipsis truncation)
   - Padding top: Spacing.sm
   - Strip HTML tags (remove <p>, etc.)
   
4. **Byline + Date**
   - Font: Regular, 12pt
   - Color: Light gray (#9E9E9E)
   - Format: "By [Author Name] · [Date]"
   - Date format: "Oct 24, 2024" (readable, abbreviated month)
   - Padding top: Spacing.sm
   - Padding bottom: Spacing.md

**Interaction:**
- Tap card → Navigate to article detail (future state)
- Current behavior: Console log for development
- Visual feedback: Reduce opacity to 0.7 on press

## Design System

### Color Palette
**Primary Colors:**
- Background: White (#FFFFFF)
- Primary Text: Black (#000000)
- Secondary Text: Dark Gray (#4A4A4A)
- Tertiary Text: Light Gray (#9E9E9E)
- Accent: School colors (to be defined, consider burgundy/gold for high school theme)

**Functional Colors:**
- Loading Spinner: #666666
- Placeholder/Skeleton: #E0E0E0
- Press State: 70% opacity overlay

### Typography
**Font Family:** System default (San Francisco on iOS, Roboto on Android)

**Type Scale:**
- Headline: 18pt, Bold, Line height 1.3
- Body/Excerpt: 14pt, Regular, Line height 1.5
- Byline/Meta: 12pt, Regular, Line height 1.4
- Header Title: 20pt, Bold

**Text Treatment:**
- All content must strip HTML tags from API responses
- Decode HTML entities (&#8217;, &amp;, etc.)
- Truncate excerpts at 2 lines with ellipsis

### Spacing Scale
```
Spacing.sm: 8px
Spacing.md: 12px
Spacing.lg: 16px
Spacing.xl: 24px
```

### Layout Specifications
- **Card Padding:** Horizontal 16px, Internal vertical spacing as defined above
- **Card Margins:** 16px between cards
- **Screen Margins:** 0px (cards span full width for modern look)
- **Image Border Radius:** 12px
- **Minimum Touch Target:** 44x44pt (cards exceed this)

## Visual Design

### Design Philosophy
- **Clean and modern:** Inspired by NY Times mobile app
- **Content-first:** Let journalism shine, minimal decorative elements
- **Readable:** High contrast text, generous spacing
- **Professional:** Appropriate for school publication credibility

### Component Specifications

**Article Card:**
- Background: White
- No border or drop shadow (flat design)
- Press state: 70% opacity
- Border radius: 12px for images only (card itself has no border)

**Loading State:**
- Centered ActivityIndicator
- Color: #666666
- Size: "large"

**Image Handling:**
- Always check for image existence before rendering
- Aspect ratio must be maintained (16:9)
- Use `resizeMode: 'cover'` for images
- Placeholder strategy if no image: Skip entirely OR show light gray box with newspaper icon

**Icons:**
- Use Feather icons from @expo/vector-icons for future features
- No emojis in UI
- Standard system icons for navigation elements

### Accessibility Requirements
- All cards must be accessible touchable areas
- Minimum font size: 12pt (meets WCAG guidelines)
- Color contrast ratio: 4.5:1 minimum for body text
- Support for Dynamic Type (iOS) and font scaling (Android)
- Semantic labeling for screen readers on interactive elements

### Error & Empty States
**Loading State:** Full-screen centered spinner

**Error State:** Simple centered message
- Text: "Unable to load articles. Pull to refresh."
- Color: Secondary text color

**Empty State:**
- Text: "No articles available."
- Color: Secondary text color

### Data Integrity
**Critical:** All API data must be sanitized:
1. HTML tag stripping for titles and excerpts
2. HTML entity decoding (&#8217;, &amp;, etc.)
3. Safe image URL checking (prevent undefined access)
4. Date formatting for readability
5. Author name fallback if missing

### Future Considerations
- Add search functionality in header
- Category filtering/tabs
- Article detail screen with full content
- Social sharing capability
- Bookmarking/save for later (local storage)
- Dark mode support
- Skeleton loading screens for better UX
