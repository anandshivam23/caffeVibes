import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Feed from './pages/Feed'
import About from './pages/About'
import Terms from './pages/Terms'
import SearchResults from './pages/SearchResults'
import Notifications from './pages/Notifications'
import MilestoneCelebration from './components/MilestoneCelebration'
import Subscriptions from './pages/Subscriptions'
import Playlists from './pages/Playlists'
import PlaylistDetail from './pages/PlaylistDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import { Coffee } from 'lucide-react'

// Code-split heavy routes
const VideoPlayer = lazy(() => import('./pages/VideoPlayer'))
const Profile = lazy(() => import('./pages/Profile'))

const CoffeeSuspenseLoader = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
    <div className="w-16 h-16 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary animate-pulse border border-primary/20">
      <Coffee className="animate-bounce" size={28} />
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Brewing page...</span>
  </div>
);
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
          <Toaster position="top-center" toastOptions={{ style: { background: '#1c1c1e', color: '#f3f4f6', border: '1px solid #2c2c2e' } }} />
          <MilestoneCelebration />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Feed />} />
            <Route path="video/:id" element={<Suspense fallback={<CoffeeSuspenseLoader />}><VideoPlayer /></Suspense>} />
            <Route path="profile/:id" element={<Suspense fallback={<CoffeeSuspenseLoader />}><Profile /></Suspense>} />
            <Route path="about" element={<About />} />
            <Route path="terms" element={<Terms />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="tweets" element={<Feed />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="playlists" element={<Playlists />} />
            <Route path="playlist/:id" element={<PlaylistDetail />} />
            <Route path="liked" element={<Feed />} />
            <Route path="disliked" element={<Feed />} />
          </Route>
        </Routes>
        </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
export default App