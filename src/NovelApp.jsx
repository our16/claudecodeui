/**
 * NovelApp.jsx - Novel Platform Main Application
 *
 * Main application architecture with novel creation as the primary focus
 * Replaces the original Claude Code UI-centric structure
 */

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Home, PenTool } from 'lucide-react';

// Import Novel Platform Components
import NovelHome from './components/novel/NovelHome';
import NovelWorkspace from './components/novel/NovelWorkspace';
import NovelCreationWizard from './components/novel/NovelCreationWizard';

// Import Contexts
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Main Navigation Configuration
const MAIN_NAV = [
  { id: 'home', path: '/novels', label: '主页', icon: Home }
];

function NovelApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeNav, setActiveNav] = useState('home');

  // Set current navigation based on path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/novel/')) {
      setActiveNav('workspace');
    } else if (path.startsWith('/novels')) {
      if (path.includes('/new')) {
        setActiveNav('create');
      } else {
        setActiveNav('home');
      }
    } else {
      setActiveNav('home');
    }
  }, [location.pathname]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div
            onClick={() => navigate('/novels')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <PenTool className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Novel Platform
            </h1>
          </div>

          {/* Main Navigation */}
          <nav className="flex gap-1">
            {MAIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{isActive ? item.label : `回到${item.label}`}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Settings are now accessible from the workspace sidebar */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <Routes>
          {/* Novels Home - List all novel projects */}
          <Route
            path="/novels"
            element={
              <ProtectedRoute>
                <NovelHome />
              </ProtectedRoute>
            }
          />

          {/* Create New Novel */}
          <Route
            path="/novels/new"
            element={
              <ProtectedRoute>
                <NovelCreationWizard />
              </ProtectedRoute>
            }
          />

          {/* Novel Workspace */}
          <Route
            path="/novel/:novelId"
            element={
              <ProtectedRoute>
                <NovelWorkspace />
              </ProtectedRoute>
            }
          />

          {/* Default redirect to Novels Home */}
          <Route
            path="/"
            element={<NovelHome />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
            <NovelApp />
          </Router>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
