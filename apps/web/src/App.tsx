import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import './styles/studio.css'
import { AuthProvider } from './auth/AuthContext'
import { CharacterDesignPage } from './pages/CharacterDesignPage.tsx'
import { GeneratePage } from './pages/GeneratePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { StoryDesignPage } from './pages/StoryDesignPage.tsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/me" element={<ProfilePage />} />
          <Route path="/character" element={<CharacterDesignPage />} />
          <Route path="/story" element={<StoryDesignPage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
