/**
 * NovelInfoSidebar - 小说信息侧边栏
 *
 * 在项目工作台显示当前小说的详细信息：
 * - 小说名字、简介
 * - 主角信息（从 characters.md 状态文件获取）
 * - 卷大纲列表
 * - 章节内容列表
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, User, FileText, ChevronDown, ChevronRight } from 'lucide-react';

export default function NovelInfoSidebar({ currentNovel }) {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [characters, setCharacters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedVolumes, setExpandedVolumes] = useState({});

  // 返回项目列表
  const handleBackToList = () => {
    navigate('/novels');
  };

  // 加载章节数据
  useEffect(() => {
    if (!currentNovel) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // 加载章节数据
        const chaptersResponse = await fetch(`/api/novels/${currentNovel.id}/chapters`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        const chaptersData = await chaptersResponse.json();
        if (chaptersData.chapters) {
          setChapters(chaptersData.chapters);
        }

        // 加载角色数据（从 characters.md 状态文件）
        try {
          const charactersResponse = await fetch(`/api/novels/${currentNovel.id}/state-files/characters.md`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            }
          });
          const charactersData = await charactersResponse.json();
          if (charactersData.content) {
            setCharacters(parseCharactersData(charactersData.content));
          }
        } catch (error) {
          console.warn('Failed to load characters:', error);
        }
      } catch (error) {
        console.error('Failed to load novel info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentNovel]);

  // 解析角色数据（简单的 Markdown 解析）
  const parseCharactersData = (content) => {
    const lines = content.split('\n');
    const result = {
      protagonist: null,
      supporting: []
    };

    let currentSection = null;

    for (const line of lines) {
      if (line.includes('主角') || line.toLowerCase().includes('protagonist')) {
        currentSection = 'protagonist';
      } else if (line.includes('配角') || line.toLowerCase().includes('supporting')) {
        currentSection = 'supporting';
      } else if (line.startsWith('##') || line.startsWith('#')) {
        continue;
      } else if (line.trim() && currentSection === 'protagonist' && !result.protagonist) {
        result.protagonist = line.trim();
      } else if (line.trim() && currentSection === 'supporting' && line.startsWith('-')) {
        result.supporting.push(line.trim().replace(/^-\s*/, ''));
      }
    }

    return result;
  };

  // 将章节按卷分组（简单实现：每10章一卷）
  const groupChaptersByVolume = (chapters) => {
    const volumes = {};
    const CHAPTERS_PER_VOLUME = 10;

    chapters.forEach(chapter => {
      const volumeNum = Math.ceil(chapter.chapter_number / CHAPTERS_PER_VOLUME);
      const volumeKey = `volume_${volumeNum}`;

      if (!volumes[volumeKey]) {
        volumes[volumeKey] = {
          number: volumeNum,
          chapters: [],
          title: `第 ${volumeNum} 卷`
        };
      }

      volumes[volumeKey].chapters.push(chapter);
    });

    return Object.values(volumes).sort((a, b) => a.number - b.number);
  };

  // 切换卷展开/收起
  const toggleVolume = (volumeNum) => {
    setExpandedVolumes(prev => ({
      ...prev,
      [volumeNum]: !prev[volumeNum]
    }));
  };

  // 获取章节状态样式
  const getChapterStatusClass = (status) => {
    switch (status) {
      case 'done':
        return 'text-green-600 dark:text-green-400';
      case 'writing':
        return 'text-blue-600 dark:text-blue-400';
      case 'planning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  // 获取章节状态文本
  const getChapterStatusText = (status) => {
    switch (status) {
      case 'done':
        return '已完成';
      case 'writing':
        return '写作中';
      case 'planning':
        return '规划中';
      default:
        return '待开始';
    }
  };

  const volumes = groupChaptersByVolume(chapters);

  if (!currentNovel) {
    return null;
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
      {/* 顶部返回按钮 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回项目列表</span>
        </button>
      </div>

      {/* 小说基本信息 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          {currentNovel.displayName || currentNovel.name}
        </h1>
        {currentNovel.genre && (
          <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded mb-2">
            {currentNovel.genre}
          </span>
        )}
        {currentNovel.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
            {currentNovel.description}
          </p>
        )}
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 主角信息 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">主角信息</h3>
          </div>
          {characters?.protagonist ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 pl-6">
              {characters.protagonist}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">
              暂无主角信息
            </p>
          )}
        </div>

        {/* 卷大纲列表 */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">卷大纲</h3>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">加载中...</p>
            </div>
          ) : volumes.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">暂无章节数据</p>
          ) : (
            <div className="space-y-2">
              {volumes.map((volume) => (
                <div key={volume.number} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* 卷标题 */}
                  <button
                    onClick={() => toggleVolume(volume.number)}
                    className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {volume.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({volume.chapters.length} 章)
                    </span>
                    {expandedVolumes[volume.number] ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {/* 章节列表 */}
                  {expandedVolumes[volume.number] && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {volume.chapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <FileText className={`w-3 h-3 mt-1 flex-shrink-0 ${getChapterStatusClass(chapter.status)}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                第 {chapter.chapter_number} 章
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {chapter.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs ${getChapterStatusClass(chapter.status)}`}>
                                  {getChapterStatusText(chapter.status)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {chapter.currentWordCount || 0} / {chapter.targetWordCount || 3000} 字
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
