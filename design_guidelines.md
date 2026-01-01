# Mementiq Admin Settings - Design Guidelines

## Design Approach
**System-Based Approach**: Drawing from Linear and Vercel's dark mode patterns - clean, functional interfaces prioritizing clarity and efficiency. Professional developer/admin tool aesthetic with restrained visual elements.

## Typography System
- **Primary Font**: Inter or SF Pro Display via Google Fonts CDN
- **Hierarchy**:
  - Page Title: 32px/2rem, semibold (600)
  - Section Headers: 18px/1.125rem, semibold (600)
  - Subsection Titles: 14px/0.875rem, medium (500), uppercase tracking-wide
  - Body Text: 14px/0.875rem, regular (400)
  - Helper Text: 12px/0.75rem, regular (400), reduced opacity
  - Monospace (status/codes): JetBrains Mono, 13px

## Layout & Spacing
**Spacing Scale**: Tailwind units of 2, 4, 6, 8, 12, 16
- Page padding: p-8
- Section spacing: mb-12
- Component gaps: gap-6 for major divisions, gap-4 for related items
- Card padding: p-6

**Grid Structure**:
- Main container: max-w-6xl, two-column layout (sidebar + main content)
- Left sidebar (navigation): w-64, fixed
- Main content area: flex-1, single column stack
- Settings cards: full-width within content area

## Component Library

### Navigation Sidebar
- Vertical list of setting categories
- Active state: cyan accent border-left (3px), background subtle highlight
- Icons from Heroicons (outline style)
- Item padding: px-4 py-3
- Sticky positioning

### Status Dashboard Cards
- Background: slightly lighter than page background
- Border: 1px, subtle
- Corner radius: rounded-lg (8px)
- Contains: Status indicator dot, label, value/metric, timestamp
- Indicator dots: 8px diameter, positioned inline with title

### Connection Control Panels
- Toggle switches: Large (h-6 w-11), cyan when active
- Connection cards with icon, service name, status badge, action buttons
- Status badges: Pill-shaped (rounded-full), px-3 py-1, uppercase text (10px)

### Settings Forms
- Label above input pattern
- Input fields: h-10, px-4, border-width 1px, rounded-md
- Focus state: cyan border with subtle glow
- Spacing between fields: mb-6
- Helper text below inputs: mt-2

### Action Buttons
- Primary: filled cyan background, px-4 py-2, rounded-md, font-medium
- Secondary: border-only, px-4 py-2, rounded-md
- Danger: red variant for destructive actions
- Spacing between buttons: gap-3

### Data Tables (if showing logs/history)
- Minimal borders: border-b on rows only
- Row padding: py-4 px-2
- Zebra striping: very subtle background variation
- Hover state: slightly lighter background

## Page Structure

**Header Section**:
- Page title + breadcrumb navigation
- User profile/avatar in top-right
- Search bar (if managing multiple settings)
- Height: py-6, border-bottom

**Main Content Layout**:
Three primary sections stacked vertically:

1. **System Status Overview** (top):
   - Grid of 4 status cards (2x2 on desktop, stacked mobile)
   - Real-time metrics: Server status, API health, Storage usage, Active connections

2. **Connection Controls** (middle):
   - List of integration cards (Slack, GitHub, Cloud storage, etc.)
   - Each card: Service logo/icon, connection status, disconnect/configure buttons

3. **System Preferences** (bottom):
   - Expandable accordion sections or tabbed interface
   - Settings: Notifications, Security, API keys, Backup settings
   - Each setting group in its own card container

## Images
**No hero images needed** - This is a utility interface. Only functional icons from Heroicons library for navigation, status indicators, and service logos (use placeholder divs with service names for external service logos).

## Interactions
- Minimal animations: transitions on hover/focus (150ms duration)
- Loading states: subtle pulse animation on status cards during refresh
- Toast notifications for saved settings (top-right corner)
- Avoid flashy effects - maintain professional utility aesthetic