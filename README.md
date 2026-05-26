# ☕ CaffeVibes

A modern full-stack MERN social media platform for coffee lovers — share videos, post vibes, connect with others, and enjoy a premium cinematic experience.

---

## 🚀 Features

### Core Platform
- 🧑‍💻 User Authentication (JWT-based login/signup with refresh tokens)
- 📝 Post creation (tweets, videos, vibes)
- ❤️ Like & Comment system with real-time counts
- 📂 Playlist management
- 🔔 Real-time Notifications (Socket.IO)
- 🌐 Fully Responsive UI (mobile + desktop)
- ⚡ Live updates using Socket.IO

### New in v2.0
- 📱 **Progressive Web App (PWA)** — installable, works offline with service worker caching
- 🤖 **Brew AI Chatbot** — coffee-themed AI assistant with smart intent parsing, markdown support, and contextual action buttons
- 🎬 **Framer Motion Animations** — page transitions, 3D card tilts, like burst animations, staggered list reveals
- 👤 **Modern Profile Page** — parallax cover, glassmorphism, animated stats, searchable followers/following modals, About tab
- 🏆 **Achievement Streaks & Badges** — milestone celebrations with confetti, streak counters
- 🌐 **Offline Support** — feed cached for offline viewing, action queue for likes/comments synced on reconnect
- 💤 **Skeleton Loaders** — smooth loading states across all pages
- 🔍 **Advanced Search** — filter by type (video/tweet/user), sort by relevance/date/views

---

## 🛠️ Tech Stack

### Frontend:
- React.js (Vite)
- Framer Motion (animations)
- Socket.IO Client
- Axios
- Vanilla CSS (custom design system)
- PWA (Service Worker + Web App Manifest)

### Backend:
- Node.js + Express.js
- MongoDB (Mongoose)
- JWT Authentication (access + refresh tokens)
- Socket.IO
- Cloudinary (media storage)
- Google Gemini AI (chatbot)

---

## 📁 Project Structure

```
caffeVibes/
├── caffeVibesBackend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/        # AI service (Gemini)
│   │   └── utils/
│   └── public/temp/         # Temp upload staging (git-ignored)
├── caffeVibesFrontend/
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   └── service-worker.js
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── api/
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/anandshivam23/caffeVibes.git
cd caffeVibes
```

---

### 2. Install dependencies

#### Backend:

```bash
cd caffeVibesBackend
npm install
```

#### Frontend:

```bash
cd ../caffeVibesFrontend
npm install
```

---

### 3. Environment Variables

Create a `.env` file in `caffeVibesBackend/`:

```env
PORT=8000
MONGODB_URI=your_mongodb_uri
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=http://localhost:5173
API_KEY=your_gemini_api_key
```

Create a `.env` file in `caffeVibesFrontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
```

---

### 4. Run the app

#### Backend:

```bash
cd caffeVibesBackend
npm run dev
```

#### Frontend:

```bash
cd caffeVibesFrontend
npm run dev
```

---

## 🌍 Deployment

| Service  | Platform |
|----------|----------|
| Frontend | Vercel   |
| Backend  | Render   |

> **Note:** Set environment variables in Vercel/Render dashboards. Update `CORS_ORIGIN` to your Vercel frontend URL.

---

## 👥 Contributors & Roles

### 🧑‍💻 Shivam Anand (Project Owner)
- Full-stack development & architecture
- Backend (Node.js, Express, MongoDB)
- Authentication system (JWT + refresh tokens)
- Deployment (Vercel + Render)
- API design & integration

---

### 👨‍💻 Jayesh More
- Frontend UI development (React)
- Responsive design & mobile optimization
- UI/UX improvements and component design

---

### 👨‍💻 Vinay Kumar
- Feature implementation & testing
- PWA integration (Service Worker, Manifest)
- Framer Motion animation system
- AI Chatbot (Brew AI) integration
- Profile page modernization
- Real-time notifications & socket integration
- Performance improvements & bug fixing

---

## 🤝 Collaboration

- Git-based workflow with feature branches and pull requests
- Modular, component-driven code structure
- Continuous testing and debugging for stable releases

---

## 📌 Notes

- Ensure MongoDB Atlas is properly configured
- Set correct `CORS_ORIGIN` for your deployment environment
- Backend must be running before starting the frontend
- Cloudinary account required for media uploads
- Google Gemini API key required for the AI chatbot

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!