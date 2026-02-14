/**
 * NovelWorkspace - 小说工作台主组件
 *
 * 布局：
 * - 左侧：小说列表侧边栏
 * - 中间：工作空间
 * - 右侧：章节信息（只在有章节时显示）
 */

import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WebSocketContext from '../../contexts/WebSocketContext';
import NovelSidebar from './NovelSidebar';
import ChatInterface from '../ChatInterface';

export default function NovelWorkspace() {
  const { user } = useAuth();
  const { sendMessage, isConnected, latestMessage } = useContext(WebSocketContext) || { sendMessage: () => {}, isConnected: false, latestMessage: null };
  const { novelId } = useParams();
  const navigate = useNavigate();

  // 状态管理
  const [novels, setNovels] = useState([]);
  const [currentNovel, setCurrentNovel] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [processingSessions, setProcessingSessions] = useState(new Set());

  // 加载小说列表
  useEffect(() => {
    if (!user) return;

    const fetchNovels = async () => {
      try {
        const response = await fetch('/api/novels', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        const data = await response.json();
        if (data.novels) {
          setNovels(data.novels);
          // 设置当前小说
          if (novelId) {
            // 尝试通过 id 或 _id 查找
            const novel = data.novels.find(n => n.id === novelId || n._id === novelId || String(n.id) === String(novelId) || String(n._id) === String(novelId));
            console.log('Looking for novel with ID:', novelId, 'Found:', novel, 'Available novels:', data.novels);
            if (novel) {
              setCurrentNovel(novel);
            } else {
              console.warn('Novel not found with ID:', novelId);
              // 如果找不到，使用第一个小说
              if (data.novels.length > 0) {
                console.log('Falling back to first novel');
                setCurrentNovel(data.novels[0]);
              }
            }
          } else if (data.novels.length > 0) {
            setCurrentNovel(data.novels[0]);
            navigate(`/novel/${data.novels[0].id}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch novels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, [user, novelId]);

  // 切换小说
  const handleNovelChange = (novel) => {
    setCurrentNovel(novel);
    setCurrentChapter(null);
    navigate(`/novel/${novel.id}`);
  };

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
  };

  const handleNavigateToSession = (sessionId) => {
    setSelectedSession(sessionId);
  };

  const handleShowSettings = () => {
    navigate('/settings');
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
      {/* 左侧：小说列表 */}
      <NovelSidebar
        novels={novels}
        currentNovel={currentNovel}
        onNovelChange={handleNovelChange}
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

      {/* 右侧：章节信息（只在有章节时显示） */}
      {currentChapter && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">章节信息</h3>
          </div>
          <div className="px-4 py-2 space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">章节号</label>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                第 {currentChapter.chapter_number} 章
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">标题</label>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {currentChapter.title}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">字数</label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentChapter.currentWordCount || 0} / {currentChapter.targetWordCount || 3000} 字
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
