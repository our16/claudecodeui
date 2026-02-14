/**
 * NovelWorkspace - 小说工作台主组件
 *
 * 三栏布局：
 * - 左侧：小说列表侧边栏
 * - 中间：章节列表和编辑器
 * - 右侧：状态文件面板
 */

import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WebSocketContext from '../../contexts/WebSocketContext';
import NovelSidebar from './NovelSidebar';
import ChapterListPanel from './ChapterListPanel';
import ChapterEditor from './ChapterEditor';
import StateFilesPanel from './StateFilesPanel';

export default function NovelWorkspace() {
  const { user } = useAuth();
  const { sendMessage, isConnected, latestMessage } = useContext(WebSocketContext) || { sendMessage: () => {}, isConnected: false, latestMessage: null };
  const { novelId } = useParams();
  const navigate = useNavigate();

  // 状态管理
  const [novels, setNovels] = useState([]);
  const [currentNovel, setCurrentNovel] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [stateFiles, setStateFiles] = useState([]);
  const [loading, setLoading] = useState(true);

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
            const novel = data.novels.find(n => n.id === novelId);
            if (novel) setCurrentNovel(novel);
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

  // 加载当前小说的章节
  useEffect(() => {
    if (!currentNovel) return;

    const fetchChapters = async () => {
      try {
        const response = await fetch(`/api/novels/${currentNovel.id}/chapters`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        const data = await response.json();
        if (data.chapters) {
          setChapters(data.chapters);
        }
      } catch (error) {
        console.error('Failed to fetch chapters:', error);
      }
    };

    fetchChapters();
  }, [currentNovel]);

  // 加载状态文件
  useEffect(() => {
    if (!currentNovel) return;

    const fetchStateFiles = async () => {
      try {
        const response = await fetch(`/api/novels/${currentNovel.id}/state-files`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        const data = await response.json();
        if (data.stateFiles) {
          setStateFiles(data.stateFiles);
        }
      } catch (error) {
        console.error('Failed to fetch state files:', error);
      }
    };

    fetchStateFiles();
  }, [currentNovel]);

  // WebSocket 消息处理
  useEffect(() => {
    if (!latestMessage) return;

    if (latestMessage.type === 'chapter-updated') {
      // 更新章节列表
      setChapters(prev => prev.map(ch =>
        ch.id === latestMessage.data.chapterId
          ? { ...ch, ...latestMessage.data }
          : ch
      ));
    } else if (latestMessage.type === 'state-file-changed') {
      // 更新状态文件
      setStateFiles(prev => prev.map(sf =>
        sf.name === latestMessage.data.name
          ? { ...sf, ...latestMessage.data }
          : sf
      ));
    }
  }, [latestMessage]);

  // 切换小说
  const handleNovelChange = (novel) => {
    setCurrentNovel(novel);
    setCurrentChapter(null);
    navigate(`/novel/${novel.id}`);
  };

  // 切换章节
  const handleChapterChange = (chapter) => {
    setCurrentChapter(chapter);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧：小说列表 */}
      <NovelSidebar
        novels={novels}
        currentNovel={currentNovel}
        onNovelChange={handleNovelChange}
      />

      {/* 中间：章节列表和编辑器 */}
      <div className="flex-1 flex flex-col">
        {currentNovel ? (
          <>
            <ChapterListPanel
              novel={currentNovel}
              chapters={chapters}
              currentChapter={currentChapter}
              onChapterChange={handleChapterChange}
            />
            <div className="flex-1 overflow-hidden">
              <ChapterEditor
                novel={currentNovel}
                chapter={currentChapter}
                stateFiles={stateFiles}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">请先创建一个小说项目</p>
              <button
                onClick={() => navigate('/novels/new')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                创建新小说
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 右侧：状态文件面板 */}
      {currentNovel && (
        <StateFilesPanel
          novel={currentNovel}
          stateFiles={stateFiles}
        />
      )}
    </div>
  );
}
