import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import './styles/studio.css'
import { HomePage } from './pages/HomePage'
import { CharacterDesignPage } from './pages/CharacterDesignPage'
import { StoryDesignPage } from './pages/StoryDesignPage'
import { GeneratePage } from './pages/GeneratePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/character" element={<CharacterDesignPage />} />
        <Route path="/story" element={<StoryDesignPage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
