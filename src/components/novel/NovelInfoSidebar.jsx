/**
 * NovelInfoSidebar - 小说信息侧边栏
 *
 * 在项目工作台显示当前小说的详细信息：
 * - 小说名字、简介
 * - 主角信息（从 characters.md 状态文件获取）
 * - 卷大纲列表（从 volumes 目录读取）
 * - 章节内容列表
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, User, ChevronDown, ChevronRight,
  CheckCircle, Clock, Edit3, Circle
} from 'lucide-react';

export default function NovelInfoSidebar({ currentNovel }) {
  const navigate = useNavigate();
  const [volumes, setVolumes] = useState([]);
  const [characters, setCharacters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedVolumes, setExpandedVolumes] = useState({});
  const [selectedChapter, setSelectedChapter] = useState(null);

  // 返回项目列表
  const handleBackToList = () => {
    navigate('/novels');
  };

  // 加载卷和章节数据
  useEffect(() => {
    if (!currentNovel) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // 从文件系统加载卷和章节数据
        const volumesResponse = await fetch(`/api/novels/${currentNovel.id}/volumes`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        const volumesData = await volumesResponse.json();
        if (volumesData.volumes) {
          setVolumes(volumesData.volumes);
          // 默认展开第一个卷
          if (volumesData.volumes.length > 0) {
            setExpandedVolumes({ [volumesData.volumes[0].name]: true });
          }
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

  // 切换卷展开/收起
  const toggleVolume = (volumeName) => {
    setExpandedVolumes(prev => ({
      ...prev,
      [volumeName]: !prev[volumeName]
    }));
  };

  // 获取章节状态图标和颜色
  const getChapterStatusInfo = (chapter) => {
    if (chapter.contentCreated) {
      return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', text: '已完成', bg: 'bg-green-100 dark:bg-green-900/30' };
    } else if (chapter.status === 'writing' || chapter.wordCount > 0) {
      return { icon: Edit3, color: 'text-blue-600 dark:text-blue-400', text: '写作中', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    } else if (chapter.outlineCreated) {
      return { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', text: '已规划', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    } else {
      return { icon: Circle, color: 'text-gray-500 dark:text-gray-400', text: '待开始', bg: 'bg-gray-100 dark:bg-gray-700' };
    }
  };

  // 计算卷的统计信息
  const getVolumeStats = (volume) => {
    const total = volume.chapters.length;
    const completed = volume.chapters.filter(ch => ch.contentCreated).length;
    const inProgress = volume.chapters.filter(ch => !ch.contentCreated && ch.wordCount > 0).length;
    const totalWords = volume.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    return { total, completed, inProgress, totalWords };
  };

  // 获取章节大纲摘要
  const getOutlineSummary = (outline) => {
    if (!outline) return null;

    const lines = outline.split('\n');
    const summary = {
      coreEvent: null,
      keyPoints: [],
      characters: []
    };

    let inCoreEvent = false;
    let inKeyPoints = false;
    let inCharacters = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.includes('核心事件')) {
        inCoreEvent = true;
        inKeyPoints = false;
        inCharacters = false;
        continue;
      }
      if (trimmedLine.includes('剧情要点') || trimmedLine.includes('场景安排')) {
        inCoreEvent = false;
        inKeyPoints = true;
        inCharacters = false;
        continue;
      }
      if (trimmedLine.includes('人物出场')) {
        inCoreEvent = false;
        inKeyPoints = false;
        inCharacters = true;
        continue;
      }
      if (trimmedLine.startsWith('#')) {
        inCoreEvent = false;
        inKeyPoints = false;
        inCharacters = false;
        continue;
      }

      if (inCoreEvent && trimmedLine && !summary.coreEvent) {
        summary.coreEvent = trimmedLine;
      }
      if (inKeyPoints && trimmedLine.startsWith('-') && summary.keyPoints.length < 3) {
        summary.keyPoints.push(trimmedLine.replace(/^-\s*/, ''));
      }
      if (inCharacters && trimmedLine.startsWith('-') && summary.characters.length < 4) {
        summary.characters.push(trimmedLine.replace(/^-\s*/, ''));
      }
    }

    return summary;
  };

  if (!currentNovel) {
    return null;
  }

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
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
            <div className="space-y-3">
              {volumes.map((volume, volIndex) => {
                const stats = getVolumeStats(volume);
                const isExpanded = expandedVolumes[volume.name];

                return (
                  <div key={volume.name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* 卷标题 */}
                    <button
                      onClick={() => toggleVolume(volume.name)}
                      className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          第 {volIndex + 1} 卷
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({stats.completed}/{stats.total} 章)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {stats.totalWords.toLocaleString()} 字
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* 进度条 */}
                    <div className="h-1 bg-gray-200 dark:bg-gray-600">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      />
                    </div>

                    {/* 章节列表 */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {volume.chapters.map((chapter) => {
                          const statusInfo = getChapterStatusInfo(chapter);
                          const StatusIcon = statusInfo.icon;
                          const isSelected = selectedChapter === `${volume.name}-${chapter.number}`;

                          return (
                            <div key={chapter.number}>
                              <div
                                className={`px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                onClick={() => setSelectedChapter(isSelected ? null : `${volume.name}-${chapter.number}`)}
                              >
                                <div className="flex items-start gap-2">
                                  <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusInfo.color}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        第 {chapter.number} 章
                                      </p>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusInfo.bg} ${statusInfo.color}`}>
                                        {statusInfo.text}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                      {chapter.title}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                      {chapter.wordCount.toLocaleString()} 字
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* 展开的大纲详情 */}
                              {isSelected && chapter.outline && (
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                                  {(() => {
                                    const summary = getOutlineSummary(chapter.outline);
                                    if (!summary) return null;

                                    return (
                                      <div className="space-y-2">
                                        {summary.coreEvent && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">核心事件</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{summary.coreEvent}</p>
                                          </div>
                                        )}
                                        {summary.keyPoints.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">剧情要点</p>
                                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                              {summary.keyPoints.map((point, idx) => (
                                                <li key={idx} className="flex items-start gap-1">
                                                  <span className="text-gray-400">•</span>
                                                  <span className="line-clamp-1">{point}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {summary.characters.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">出场人物</p>
                                            <div className="flex flex-wrap gap-1">
                                              {summary.characters.map((char, idx) => (
                                                <span key={idx} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                                  {char}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
