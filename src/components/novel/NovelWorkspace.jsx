/**
 * NovelWorkspace - 小说工作台主组件
 *
 * 布局：
 * - 左侧：小说列表侧边栏
 * - 中间：工作空间
 * - 右侧：上下文管理面板（章节写作时显示）
 *
 * 支持两种会话模式：
 * - 日常会话：使用完整上下文，不隔离
 * - 章节写作：使用隔离的上下文，只注入必要信息
 */

import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WebSocketContext from '../../contexts/WebSocketContext';
import NovelInfoSidebar from './NovelInfoSidebar';
import NovelSettings from './NovelSettings';
import ContextPanel from './ContextManager';
import ChatInterface from '../ChatInterface';
import { BookOpen, MessageSquare } from 'lucide-react';

export default function NovelWorkspace() {
  const { user } = useAuth();
  const { sendMessage, isConnected, latestMessage } = useContext(WebSocketContext) || { sendMessage: () => {}, isConnected: false, latestMessage: null };
  const { novelId } = useParams();
  const navigate = useNavigate();

  // 状态管理
  const [currentNovel, setCurrentNovel] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [processingSessions, setProcessingSessions] = useState(new Set());
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showNovelSettings, setShowNovelSettings] = useState(false);
  const [selectedStateFile, setSelectedStateFile] = useState(null);

  // 上下文管理状态
  const [sessionMode, setSessionMode] = useState('normal'); // 'normal' | 'chapter_writing'
  const [chapterSession, setChapterSession] = useState(null); // 当前章节写作会话
  const [showContextPanel, setShowContextPanel] = useState(true);

  // 加载当前小说
  useEffect(() => {
    if (!user || !novelId) return;

    const fetchNovel = async () => {
      try {
        const response = await fetch(`/api/novels/${novelId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        const data = await response.json();
        if (data.novel) {
          setCurrentNovel(data.novel);
        } else {
          // 如果找不到，返回项目列表
          navigate('/novels');
        }
      } catch (error) {
        console.error('Failed to fetch novel:', error);
        navigate('/novels');
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [user, novelId, navigate]);

  // Load sessions for the current novel project
  useEffect(() => {
    if (!currentNovel) return;

    const loadSessions = async () => {
      try {
        setSessionsLoading(true);
        const encodedProjectName = currentNovel.name;

        // Only load the most recent session (limit=1) for faster initial load
        const response = await fetch(`/api/projects/${encodedProjectName}/sessions?limit=1&offset=0`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });

        const data = await response.json();

        if (data.sessions && data.sessions.length > 0) {
          // Auto-select the most recent session
          setSelectedSession(data.sessions[0]);
        } else {
          setSelectedSession(null);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [currentNovel]);

  // ChatInterface 回调函数
  const handleFileOpen = (filePath) => {
    console.log('File opened:', filePath);
  };

  const handleInputFocusChange = (isFocused) => {
    console.log('Input focus changed:', isFocused);
  };

  const handleSessionActive = () => {
    console.log('Session active');
  };

  const handleSessionInactive = () => {
    console.log('Session inactive');
  };

  const handleSessionProcessing = (sessionId) => {
    setProcessingSessions(prev => new Set(prev).add(sessionId));
  };

  const handleSessionNotProcessing = (sessionId) => {
    setProcessingSessions(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
  };

  const handleReplaceTemporarySession = (tempId, realSessionId) => {
    console.log('Replace temporary session:', tempId, 'with:', realSessionId);
    // When a new session is created, reload sessions to get the latest data
    if (currentNovel && realSessionId) {
      const encodedProjectName = currentNovel.name;
      fetch(`/api/projects/${encodedProjectName}/sessions?limit=10&offset=0`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.sessions && data.sessions.length > 0) {
          // Find the session with the real session ID
          const newSession = data.sessions.find(s => s.id === realSessionId);
          if (newSession) {
            setSelectedSession(newSession);
          }
        }
      })
      .catch(error => {
        console.error('Failed to reload sessions after creation:', error);
      });
    }
  };

  const handleNavigateToSession = (sessionId) => {
    setSelectedSession(sessionId);
  };

  const handleShowSettings = () => {
    setShowNovelSettings(true);
  };

  // 处理状态文件选择 - 在右侧面板显示文件内容
  const handleStateFileSelect = async (fileName) => {
    if (!currentNovel) return;

    try {
      const response = await fetch(`/api/novels/${currentNovel.id}/state-files/${fileName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedStateFile({ name: fileName, content: data.content });
      }
    } catch (error) {
      console.error('Failed to load state file:', error);
    }
  };

  // 创建章节写作会话（隔离上下文）
  const createChapterWritingSession = async (chapterId) => {
    if (!currentNovel) return;

    try {
      const response = await fetch(`/api/novels/${currentNovel.id}/chapters/${chapterId}/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionType: 'writing' })
      });

      if (response.ok) {
        const data = await response.json();
        setChapterSession(data);
        setSessionMode('chapter_writing');
        console.log('Chapter writing session created:', data.sessionId);
        return data;
      }
    } catch (error) {
      console.error('Failed to create chapter session:', error);
    }
  };

  // 关闭章节写作会话
  const closeChapterWritingSession = async () => {
    if (!chapterSession || !currentNovel) return;

    try {
      await fetch(
        `/api/novels/${currentNovel.id}/chapters/${chapterSession.chapter.id}/sessions/${chapterSession.sessionId}/close`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        }
      );

      setChapterSession(null);
      setSessionMode('normal');
    } catch (error) {
      console.error('Failed to close chapter session:', error);
    }
  };

  // 切换会话模式
  const toggleSessionMode = () => {
    if (sessionMode === 'normal') {
      // 如果有当前章节，创建章节写作会话
      if (currentChapter) {
        createChapterWritingSession(currentChapter.id);
      }
    } else {
      // 关闭章节写作会话
      closeChapterWritingSession();
    }
  };

  // 上下文变化回调
  const handleContextChange = (newContext) => {
    console.log('Context updated:', newContext?.meta);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* 左侧：小说信息 */}
      <NovelInfoSidebar
        currentNovel={currentNovel}
        onStateFileSelect={handleStateFileSelect}
      />

      {/* 中间：工作空间 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentNovel ? (
          <div className="flex-1 min-h-0 h-full">
            <ChatInterface
                selectedProject={currentNovel}
                selectedSession={selectedSession}
                ws={isConnected}
                sendMessage={sendMessage}
                latestMessage={latestMessage}
                onFileOpen={handleFileOpen}
                onInputFocusChange={handleInputFocusChange}
                onSessionActive={handleSessionActive}
                onSessionInactive={handleSessionInactive}
                onSessionProcessing={handleSessionProcessing}
                onSessionNotProcessing={handleSessionNotProcessing}
                processingSessions={processingSessions}
                onReplaceTemporarySession={handleReplaceTemporarySession}
                onNavigateToSession={handleNavigateToSession}
                onShowSettings={handleShowSettings}
              />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Please create a novel project first</p>
              <button
                onClick={() => navigate('/novels/new')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Create New Novel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 右侧：上下文管理面板（章节写作时显示） */}
      {currentNovel && showContextPanel && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
          {/* 模式切换 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">上下文管理</h3>
              <button
                onClick={() => setShowContextPanel(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => {
                  if (sessionMode !== 'normal') {
                    closeChapterWritingSession();
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                  sessionMode === 'normal'
                    ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                日常会话
              </button>
              <button
                onClick={() => {
                  if (sessionMode !== 'chapter_writing' && currentChapter) {
                    createChapterWritingSession(currentChapter.id);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                  sessionMode === 'chapter_writing'
                    ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                disabled={!currentChapter}
              >
                <BookOpen className="w-3.5 h-3.5" />
                章节写作
              </button>
            </div>
          </div>

          {/* 章节信息（如果有当前章节） */}
          {currentChapter && (
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">当前章节</span>
                {sessionMode === 'chapter_writing' && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded">
                    隔离模式
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mt-1">
                第 {currentChapter.chapter_number} 章: {currentChapter.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {currentChapter.currentWordCount || 0} / {currentChapter.targetWordCount || 3000} 字
              </p>
            </div>
          )}

          {/* 上下文面板内容 */}
          <div className="flex-1 overflow-hidden">
            <ContextPanel
              novelId={currentNovel?.id}
              chapterId={currentChapter?.id}
              onContextChange={handleContextChange}
            />
          </div>
        </div>
      )}

      {/* 显示上下文面板按钮（当面板隐藏时） */}
      {currentNovel && !showContextPanel && (
        <button
          onClick={() => setShowContextPanel(true)}
          className="absolute right-4 top-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          title="显示上下文管理"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      )}

      {/* 状态文件查看面板 */}
      {selectedStateFile && (
        <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
              {selectedStateFile.name}
            </h3>
            <button
              onClick={() => setSelectedStateFile(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {selectedStateFile.content || '(空文件)'}
            </pre>
          </div>
        </div>
      )}

      {/* 小说平台设置弹窗 */}
      <NovelSettings
        isOpen={showNovelSettings}
        onClose={() => setShowNovelSettings(false)}
      />
    </div>
  );
}
