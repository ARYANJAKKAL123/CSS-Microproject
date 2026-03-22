# Front-End Projects Repository

## Overview

This repository contains two independent front-end projects developed using React: a web-based Music Player and a real-time chat application called Connectix. Both projects are built as single-page applications (SPAs) and demonstrate core front-end engineering concepts including component-based architecture, React state management, event-driven interactions, and responsive UI design. Neither project includes a backend server or persistent data storage; all state is managed client-side.

---

## Objectives

- Implement component-based UI architecture using React functional components and hooks
- Manage application state using `useState` and `useEffect` without external state libraries
- Handle browser-native APIs including the HTML `<audio>` element and the `BroadcastChannel` API
- Synchronize UI state with real-time events across browser tabs
- Apply responsive layout techniques using CSS Flexbox
- Implement dynamic DOM updates driven by user interaction and media events
- Demonstrate clean separation of concerns between data, logic, and presentation layers

---

## Tech Stack

| Technology | Role |
|---|---|
| React 19 | Component rendering, state management, lifecycle handling via hooks |
| JavaScript (ES2020+) | Application logic, event handling, DOM interaction, async behavior |
| CSS3 | Layout (Flexbox), animations (`@keyframes`), responsive design, custom scrollbars |
| HTML5 | Semantic structure, native `<audio>` element, `<input type="range">` for seek control |
| Vite | Development server and build tool for the Connectix project |
| Create React App | Development server and build toolchain for the Music Player project |
| BroadcastChannel API | Cross-tab real-time message passing in Connectix (no WebSocket server required) |

---

## Project 1: Music Player

### Description

The Music Player is a React-based audio playback interface that allows users to play, pause, and navigate through a predefined playlist of tracks. It renders track metadata (title, artist, cover image) and provides a synchronized progress bar that reflects the current playback position. The playlist is statically defined in the application source and does not rely on any external API or file upload mechanism.

### Features

- Play and pause toggle with visual state feedback
- Previous and next track navigation with circular playlist wrapping
- Progress bar implemented as an `<input type="range">` element, synchronized bidirectionally with audio playback time
- Elapsed time and total duration display, formatted as `MM:SS`
- Automatic track advancement when a track ends
- Track metadata display: title, artist name, and cover image
- Centered, fixed-width card layout styled for dark-theme presentation

### Working Mechanism

**Audio Management**

Each track change triggers a `useEffect` that pauses the previous `Audio` instance, instantiates a new `Audio` object with the updated source, and attaches the following event listeners:

- `loadedmetadata` — sets the `duration` state once the audio file is parsed
- `timeupdate` — updates the `time` state on each playback tick, driving progress bar position
- `ended` — calls the `next` callback to advance the playlist automatically

The `audioRef` React ref holds the current `Audio` instance, allowing imperative control (`.play()`, `.pause()`, `.currentTime`) without triggering re-renders.

**State Handling**

Three state variables govern the player:

- `isPlaying` (boolean) — tracks whether audio is currently playing; controls the play/pause button label
- `time` (number) — current playback position in seconds; bound to the range input value
- `duration` (number) — total track duration in seconds; sets the range input maximum

**Seek Interaction**

The `seek` function updates both `audioRef.current.currentTime` and the `time` state when the user drags the progress bar, ensuring the audio position and the displayed value remain consistent.

**Track Navigation**

Track index is managed in the parent `App` component using `useState`. The `next` and `prev` functions use modular arithmetic to wrap around the playlist array, and the selected track object is passed down to the `Player` component as a prop.

---

## Project 2: Connectix

### Description

Connectix is a real-time chat application built entirely in the browser without a backend server. It enables multiple users on the same device or across browser tabs to communicate within a shared session identified by a unique session code. Communication between tabs is handled via the browser's native `BroadcastChannel` API, scoped to the session identifier. The application has two screens: a home screen for session creation or joining, and a chat screen for active messaging.

### Features

- Session creation with an auto-generated alphanumeric session code
- Session joining via manual code entry
- Real-time message delivery across browser tabs using `BroadcastChannel`
- Typing indicator that displays animated dots when another participant is composing a message
- System messages for join and leave events
- Member list panel displaying all active participants with online status indicators
- QR code generation for session sharing, rendered via a third-party QR image API (`api.qrserver.com`)
- Avatar component that generates initials and assigns a deterministic background color based on the user's display name
- Animated message bubbles with distinct visual treatment for sent versus received messages
- Smooth CSS animations for bubble entry, panel transitions, and typing indicators

### Working Mechanism

**Session and Communication Architecture**

On entering the chat screen, a `BroadcastChannel` instance is created and scoped to `connectix_chat_<sessionId>`. This channel is stored in a `channelRef` ref to avoid re-instantiation on re-renders. All participants in the same browser session sharing the same session code communicate through this channel.

The channel handles five message types:

- `MSG` — a user-sent chat message; appended to the `messages` state array
- `JOIN` — announces a new participant; updates the `members` state and appends a system message
- `LEAVE` — announces a departure; removes the member from state and appends a system message
- `TYPING` — broadcasts typing activity; updates the `typing` state array to show or hide the indicator
- `PING` — requests all active participants to re-announce their presence upon a new join

On component unmount (tab close or leaving the session), a `LEAVE` message is broadcast and the channel is closed.

**State Management**

Key state variables:

- `screen` — controls which view is rendered (`home` or `chat`)
- `messages` — array of message objects rendered as chat bubbles or system notices
- `members` — array of active participant objects used to populate the members panel
- `typing` — array of names currently composing a message, used to render the typing indicator
- `input` — controlled input value for the message composition field

**Typing Indicator**

The `handleTyping` function broadcasts a `TYPING` event with `active: true` on each keystroke and schedules a debounced `active: false` broadcast after 1500ms of inactivity using `setTimeout` stored in a `typingTimerRef`.

**Layout**

The chat screen uses a CSS Flexbox column layout for the full viewport height, with the message list occupying the remaining space via `flex: 1` and `overflow-y: auto`. The members panel slides in as a fixed-width sidebar using a conditional render with a `slideUp` CSS animation.

---

## Folder Structure

```
repository-root/
├── Music-Player/
│   ├── public/
│   │   ├── index.html
│   │   └── music/
│   │       ├── song1.mp3
│   │       └── song2.mp3
│   └── src/
│       ├── App.js          # Playlist state, track navigation logic
│       ├── App.css         # Full-viewport centering layout
│       ├── Player.js       # Audio engine, playback controls, progress bar
│       └── Player.css      # Player card styling, dark theme
│
├── connectix/
│   ├── index.html
│   └── src/
│       ├── App.jsx         # All application logic and UI (single-file architecture)
│       └── App.css         # Supplementary styles (Vite scaffold remnants)
│
└── README.md
```

---

## How to Run

### Music Player

This project uses Create React App.

```bash
cd Music-Player
npm install
npm start
```

Open `http://localhost:3000` in a browser. Audio files must be present in `public/music/` and cover images in `public/covers/` for full functionality.

### Connectix

This project uses Vite.

```bash
cd connectix
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`). To test multi-user behavior, open the same URL in two or more browser tabs, create a session in one tab, and join using the session code in the other.

---

## Key Learnings

- Managing imperative browser APIs (HTMLAudioElement) within React's declarative model using `useRef` and `useEffect` cleanup functions
- Synchronizing controlled React state with asynchronous native events (`timeupdate`, `loadedmetadata`, `ended`)
- Using the `BroadcastChannel` API as a zero-infrastructure pub/sub mechanism for cross-tab communication
- Implementing debounced event broadcasting to avoid excessive channel messages during continuous input
- Applying deterministic hash functions to derive consistent UI properties (avatar color) from string input
- Structuring CSS animations with `@keyframes` and applying them conditionally based on component render state
- Scoping side effects with `useEffect` dependency arrays and returning cleanup functions to prevent memory leaks and stale event listeners

---

## Limitations

- Connectix does not use a WebSocket server or any backend; communication is limited to tabs within the same browser on the same device. Cross-device communication is not supported.
- No message persistence: all chat history is lost on page refresh or tab close.
- The Music Player playlist is hardcoded in the source file; there is no mechanism for users to upload or select audio files at runtime.
- Cover images for the Music Player must be manually placed in the `public/covers/` directory; missing images will result in broken image elements.
- No authentication or user identity verification exists in either project.
- The QR code in Connectix is generated by an external third-party API (`api.qrserver.com`) and requires an active internet connection to render.
- Connectix has not been tested for cross-browser compatibility beyond Chromium-based browsers; `BroadcastChannel` support may vary.

---

## Future Improvements

- Integrate a WebSocket server (e.g., using Node.js with `ws` or `socket.io`) into Connectix to enable genuine cross-device, cross-network real-time communication
- Add message persistence to Connectix using a database (e.g., Firebase Firestore or a REST API with PostgreSQL)
- Implement user authentication in Connectix to support persistent identities and private sessions
- Extend the Music Player to support dynamic playlist management, allowing users to upload audio files via the File API
- Add volume control and mute functionality to the Music Player using the `HTMLAudioElement.volume` property
- Implement shuffle and repeat modes in the Music Player with corresponding state flags
- Add end-to-end encryption for Connectix messages to ensure privacy in multi-tab sessions
- Introduce unit and integration tests for both projects using React Testing Library and Jest
