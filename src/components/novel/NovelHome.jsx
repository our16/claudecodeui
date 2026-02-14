/**
 * NovelHome.jsx - 小说项目列表首页
 *
 * 显示用户的所有小说项目，支持创建新小说
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit2, Trash2 } from 'lucide-react';
import { api, authenticatedFetch } from '../../utils/api';

export default function NovelHome() {
  const navigate = useNavigate();

  // 状态管理
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, writing, completed

  // 加载小说列表
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch('/api/novels');
        const data = await response.json();
        if (data.novels) {
          setNovels(data.novels);
        }
      } catch (error) {
        console.error('Failed to fetch novels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  // 删除小说
  const handleDeleteNovel = async (novelId, novelName) => {
    if (!confirm(`确定要删除小说《${novelName}》吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await fetch(`/api/novels/${novelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      // 从列表中移除
      setNovels(prev => prev.filter(n => n.id !== novelId));
    } catch (error) {
      console.error('Failed to delete novel:', error);
      alert('删除失败');
    }
  };

  // 筛选小说
  const filteredNovels = novels.filter(novel => {
    if (filter === 'all') return true;
    if (filter === 'writing') {
      return novel.stats?.completedChapters < novel.stats?.totalChapters;
    }
    if (filter === 'completed') {
      return novel.stats?.completedChapters >= novel.stats?.totalChapters;
    }
    return true;
  });

  // 搜索过滤
  const searchedNovels = filteredNovels.filter(novel =>
    novel.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (novel.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 统计数据
  const stats = {
    total: novels.length,
    totalChapters: novels.reduce((sum, n) => sum + (n.stats?.totalChapters || 0), 0),
    totalWords: novels.reduce((sum, n) => sum + (n.stats?.totalWordCount || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">我的小说</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                共 {stats.total} 部作品 · {stats.totalChapters} 章 · {stats.totalWords.toLocaleString()} 字
              </p>
            </div>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索小说..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'writing', 'completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === f
                      ? 'bg-gray-800 dark:bg-gray-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'writing' ? '写作中' : '已完成'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">加载中...</p>
          </div>
        ) : searchedNovels.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4">
              {searchQuery ? '未找到匹配的小说' : '暂无小说项目'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {searchQuery
                ? '尝试使用其他关键词搜索'
                : '点击"创建新小说"开始你的创作之旅'}
            </p>
            <button
              onClick={() => navigate('/novels/new')}
              className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              创建新小说
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchedNovels.map((novel) => (
              <div
                key={novel.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* 卡片头部 */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {novel.displayName || novel.name}
                      </h3>
                      {novel.genre && (
                        <span className="inline-block ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                          {novel.genre}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/novel/${novel.id}`)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="进入工作台"
                    >
                      <Edit2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  {novel.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                      {novel.description}
                    </p>
                  )}
                </div>

                {/* 卡片内容 */}
                <div className="p-6">
                  {/* 进度统计 */}
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {novel.stats?.completedChapters || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">已完成章节</div>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {novel.stats?.totalChapters || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">总章节</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {Math.round((novel.stats?.totalWordCount || 0) / 1000)}k
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">总字数</div>
                    </div>
                  </div>

                  {/* 状态文件预览 */}
                  <div className="space-y-2">
                    {['characters.md', 'world_rules.md', 'timeline.md'].map(fileName => {
                      const exists = novel.stateFiles?.some(sf => sf.name === fileName);
                      return (
                        <div
                          key={fileName}
                          className={`flex items-center gap-2 text-sm ${
                            exists ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <span className={exists ? 'font-medium' : ''}>
                            {fileName === 'characters.md' ? '角色档案' :
                             fileName === 'world_rules.md' ? '世界观设定' :
                             fileName === 'timeline.md' ? '时间线' : fileName}
                          </span>
                          {exists ? '✓' : '—'}
                        </div>
                      );
                    })}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/novel/${novel.id}`)}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                    >
                      进入工作台
                    </button>
                    <button
                      onClick={() => handleDeleteNovel(novel.id, novel.displayName || novel.name)}
                      className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="删除小说"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
