/**
 * ChapterListPanel - 章节列表面板
 *
 * 显示当前小说的所有章节，支持状态筛选
 */

import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText, Plus } from 'lucide-react';

// 状态对应的图标和颜色
const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', label: '待写' },
  planning: { icon: FileText, color: 'text-blue-500 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: '规划中' },
  writing: { icon: AlertCircle, color: 'text-yellow-500 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', label: '写作中' },
  done: { icon: CheckCircle, color: 'text-green-500 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', label: '已完成' },
  failed: { icon: AlertCircle, color: 'text-red-500 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', label: '审核失败' }
};

export default function ChapterListPanel({ novel, chapters, currentChapter, onChapterChange }) {
  const [filter, setFilter] = useState('all'); // all, pending, writing, done

  // 筛选章节
  const filteredChapters = chapters.filter(ch => {
    if (filter === 'all') return true;
    return ch.status === filter;
  });

  // 统计信息
  const stats = {
    total: chapters.length,
    pending: chapters.filter(ch => ch.status === 'pending').length,
    writing: chapters.filter(ch => ch.status === 'writing').length,
    done: chapters.filter(ch => ch.status === 'done').length
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">章节</h3>
          <button className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            新建章节
          </button>
        </div>

        {/* 统计 */}
        <div className="flex gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
          <span>总计 {stats.total} 章</span>
          <span className="text-gray-500 dark:text-gray-500">|</span>
          <span className="text-yellow-600 dark:text-yellow-400">{stats.pending} 待写</span>
          <span className="text-blue-600 dark:text-blue-400">{stats.writing} 写作中</span>
          <span className="text-green-600 dark:text-green-400">{stats.done} 已完成</span>
        </div>

        {/* 筛选 */}
        <div className="flex gap-2 mt-3">
          {['all', 'pending', 'writing', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === f
                  ? 'bg-gray-800 dark:bg-gray-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? '全部' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* 章节列表 */}
      <div className="overflow-y-auto max-h-64">
        {filteredChapters.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            {filter === 'all' ? '暂无章节' : `暂无${STATUS_CONFIG[filter]?.label || filter}的章节`}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredChapters.map((chapter) => {
              const statusConfig = STATUS_CONFIG[chapter.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <li key={chapter.id}>
                  <button
                    onClick={() => onChapterChange(chapter)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      currentChapter?.id === chapter.id
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {/* 状态图标 */}
                    <div className={`p-1.5 rounded-lg ${statusConfig.bgColor}`}>
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                    </div>

                    {/* 章节信息 */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-gray-800 dark:text-gray-100 truncate">
                        第 {chapter.chapter_number} 章 · {chapter.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3 mt-0.5">
                        <span>{chapter.currentWordCount || 0} / {chapter.targetWordCount || 3000} 字</span>
                        {chapter.outline && (
                          <span className="text-green-600 dark:text-green-400">已有大纲</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
