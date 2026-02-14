/**
 * NovelSidebar - 小说列表侧边栏
 *
 * 显示所有小说项目，支持创建新小说和切换
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Edit2, Trash2, Settings } from 'lucide-react';

export default function NovelSidebar({ novels, currentNovel, onNovelChange, onShowSettings }) {
  const navigate = useNavigate();
  const [showNewModal, setShowNewModal] = useState(false);

  // 创建新小说
  const handleCreateNovel = () => {
    navigate('/novels/new');
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">我的小说</h2>
          <button
            onClick={handleCreateNovel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="创建新小说"
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索小说..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 小说列表 */}
      <div className="flex-1 overflow-y-auto">
        {novels.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            暂无小说项目
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {novels.map((novel) => (
              <li key={novel.id}>
                <button
                  onClick={() => onNovelChange(novel)}
                  className={`w-full px-4 py-3 flex items-start gap-3 transition-colors ${
                    currentNovel?.id === novel.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <BookOpen className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    currentNovel?.id === novel.id ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                  }`} />

                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-gray-800 dark:text-gray-100 truncate">
                      {novel.displayName || novel.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {novel.genre && <span className="mr-2">{novel.genre}</span>}
                      {novel.stats?.completedChapters !== undefined && (
                        <span>
                          {novel.stats.completedChapters} / {novel.stats.totalChapters} 章
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onShowSettings}
          className="w-full px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm">设置</span>
        </button>
      </div>
    </div>
  );
}
