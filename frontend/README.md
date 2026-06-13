# Shree Loto - Frontend

A full-stack lottery website similar to Shree Loto with real-time draws, number selection grids, and user account management.

## Features

✨ **Real-time Updates** - Socket.io for live countdowns and results  
🎯 **Main Lottery Panel** - Live countdown timer, last draw results, free points balance  
🔢 **Number Selection Grid** - Range filters, category filters, number grid blocks  
📊 **Results & History** - View past draw results and ticket history  
👤 **User Management** - Login/Register with session management  
📱 **Mobile-First Design** - Responsive design optimized for 390px width  

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type-safe code
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Client-side routing
- **Socket.io** - Real-time communication

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your backend and Supabase URLs:
```
VITE_SOCKET_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Header.tsx
│   ├── LotteryPanel.tsx
│   ├── NumberGrid.tsx
│   ├── RangeSelector.tsx
│   ├── CategoryFilter.tsx
│   └── ...
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── ResultsPage.tsx
│   ├── HistoryPage.tsx
│   └── AdvanceDrawPage.tsx
├── hooks/              # Custom React hooks
│   └── useCountdown.ts
├── utils/              # Utility functions
│   └── socket.ts       # Socket.io setup
├── types/              # TypeScript types
│   └── index.ts
├── styles/             # Global styles
│   └── index.css
└── App.tsx             # Main app with routing
```

## Pages

### 1. Login Page (`/login`)
- Username/password authentication
- Register new account
- Redirect to main panel on login

### 2. Main Lottery Panel (`/`)
- Live countdown timer
- Last draw results banner
- Number selection grid with blocks F0-F9
- Range and category filters
- Navigation tabs (Result, History, Advance-Draw)
- Bottom bar with last transaction and logout

### 3. Results Page (`/results`)
- Table of past draw results
- Draw times and winning numbers
- Prize amounts

### 4. History Page (`/history`)
- User's ticket history
- Transaction details
- Status (pending, won, lost)

### 5. Advance Draw Page (`/advance-draw`)
- Select future draw times
- Prepare tickets for advance draws

## Key Components

### Header
- Current date/time display
- Live countdown to next draw
- Free points balance
- Current timeslot indicator

### LastDrawBanner
- Horizontally scrolling winning numbers
- Colored number tiles by range

### NumberGrid
- 10 blocks (F0-F9) with numbers
- Click to select/deselect
- Quantity and amount inputs per row
- "Select All" button per block

### RangeSelector
- Filter by number ranges (1000-1099, etc.)
- Sidebar selection

### CategoryFilter
- Quick filter buttons:
  - Number ranges: 10-19, 30-39, 50-59
  - Game types: 3D GAME, 12D GAME
  - Parity: EVEN, ODD
  - Combination: CP, FP

## Socket.io Events

### Server -> Client
- `countdown` - Time remaining to next draw
- `draw-result` - New draw results
- `last-draw-numbers` - Last winning numbers

### Client -> Server
- `place-bet` - Place a lottery ticket
- `get-status` - Request current status

## Styling

The application uses Tailwind CSS with custom color scheme:
- Primary: `#c91f5a` (lottery-bright)
- Secondary: `#7a2e62` (lottery-purple)
- Dark: `#1a1a2e` (lottery-dark)
- Background: `#0f0f0f`

### Responsive Design
- Mobile: 390px (primary)
- Tablet: 640px+
- Desktop: 1024px+

Grid layout adapts using Tailwind responsive prefixes:
- `sm:` (640px)
- `md:` (768px)
- `lg:` (1024px)

## API Integration (Coming Soon)

The application is set up to connect to a backend API via Socket.io. Update the Socket.io events in `src/utils/socket.ts` to match your backend implementation.

## Running the App

1. **Development mode**:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 in your browser. The app will automatically reload when you make changes.

2. **Production build**:
   ```bash
   npm run build
   npm run preview
   ```

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is proprietary and confidential.
