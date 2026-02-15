/**
 * ContextPanel - 上下文管理面板
 *
 * 显示和管理章节写作的上下文信息：
 * - 事实层（角色、世界观）
 * - 世界线层（时间线、伏笔）
 * - 最近章节摘要
 */

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Globe,
  Clock,
  GitBranch,
  Flag,
  Settings,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Plus,
  Check
} from 'lucide-react';

export default function ContextPanel({ novelId, chapterId, onContextChange }) {
  const [config, setConfig] = useState(null);
  const [context, setContext] = useState(null);
  const [plotThreads, setPlotThreads] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    facts: true,
    worldline: true,
    recent: true,
    threads: false,
    milestones: false,
    config: false
  });
  const [showAddThread, setShowAddThread] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newThread, setNewThread] = useState({ name: '', description: '' });
  const [newMilestone, setNewMilestone] = useState({ title: '', chapterNumber: '', description: '' });

  // 加载上下文配置和数据
  useEffect(() => {
    if (!novelId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth-token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 并行加载配置、上下文、伏笔和里程碑
        const [configRes, threadsRes, milestonesRes] = await Promise.all([
          fetch(`/api/novels/${novelId}/context/config`, { headers }),
          fetch(`/api/novels/${novelId}/plot-threads`, { headers }),
          fetch(`/api/novels/${novelId}/milestones`, { headers })
        ]);

        if (configRes.ok) {
          setConfig((await configRes.json()).config);
        }

        if (threadsRes.ok) {
          setPlotThreads((await threadsRes.json()).threads || []);
        }

        if (milestonesRes.ok) {
          setMilestones((await milestonesRes.json()).milestones || []);
        }

        // 如果有章节ID，加载章节上下文
        if (chapterId) {
          const contextRes = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/context`, { headers });
          if (contextRes.ok) {
            const data = await contextRes.json();
            setContext(data);
          }
        }
      } catch (error) {
        console.error('Failed to load context:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [novelId, chapterId]);

  // 刷新上下文
  const refreshContext = async () => {
    if (!novelId || !chapterId) return;

    try {
      const token = localStorage.getItem('auth-token');
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/context`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setContext(data);
        onContextChange?.(data);
      }
    } catch (error) {
      console.error('Failed to refresh context:', error);
    }
  };

  // 更新配置
  const updateConfig = async (updates) => {
    if (!novelId) return;

    try {
      const token = localStorage.getItem('auth-token');
      await fetch(`/api/novels/${novelId}/context/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      setConfig(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  // 添加伏笔
  const addPlotThread = async () => {
    if (!newThread.name.trim()) return;

    try {
      const token = localStorage.getItem('auth-token');
      await fetch(`/api/novels/${novelId}/plot-threads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newThread)
      });

      // 刷新列表
      const res = await fetch(`/api/novels/${novelId}/plot-threads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPlotThreads((await res.json()).threads || []);
      }

      setNewThread({ name: '', description: '' });
      setShowAddThread(false);
    } catch (error) {
      console.error('Failed to add plot thread:', error);
    }
  };

  // 添加里程碑
  const addMilestone = async () => {
    if (!newMilestone.title.trim()) return;

    try {
      const token = localStorage.getItem('auth-token');
      await fetch(`/api/novels/${novelId}/milestones`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newMilestone,
          chapterNumber: newMilestone.chapterNumber ? parseInt(newMilestone.chapterNumber, 10) : null
        })
      });

      // 刷新列表
      const res = await fetch(`/api/novels/${novelId}/milestones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMilestones((await res.json()).milestones || []);
      }

      setNewMilestone({ title: '', chapterNumber: '', description: '' });
      setShowAddMilestone(false);
    } catch (error) {
      console.error('Failed to add milestone:', error);
    }
  };

  // 解决伏笔
  const resolveThread = async (threadId, resolvedChapter) => {
    try {
      const token = localStorage.getItem('auth-token');
      await fetch(`/api/novels/${novelId}/plot-threads/${threadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'resolved',
          resolvedChapter
        })
      });

      // 刷新列表
      const res = await fetch(`/api/novels/${novelId}/plot-threads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPlotThreads((await res.json()).threads || []);
      }
    } catch (error) {
      console.error('Failed to resolve thread:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <RefreshCw className="w-5 h-5 mx-auto animate-spin" />
        <p className="mt-2 text-sm">加载上下文...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">上下文管理</h3>
          <button
            onClick={refreshContext}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="刷新上下文"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 上下文元信息 */}
        {context?.meta && (
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-3 h-3 text-green-500" />
              <span>上下文已构建</span>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              <span>最近章节: {context.meta.recentChaptersCount}</span>
              <span>事实层: {context.meta.hasFacts ? '✓' : '✗'}</span>
              <span>世界线: {context.meta.hasWorldline ? '✓' : '✗'}</span>
              <span>里程碑: {context.meta.hasHistory ? '✓' : '✗'}</span>
            </div>
          </div>
        )}

        {/* 最近章节摘要 */}
        {context?.context?.recentChapters?.length > 0 && (
          <Section
            title="最近章节"
            icon={<Clock className="w-4 h-4" />}
            expanded={expandedSections.recent}
            onToggle={() => toggleSection('recent')}
          >
            <div className="space-y-3">
              {context.context.recentChapters.map((ch, idx) => (
                <div key={idx} className="text-sm">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    第{ch.number}章: {ch.title}
                  </div>
                  {ch.summary && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {ch.summary}
                    </p>
                  )}
                  {ch.keyEvents?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ch.keyEvents.slice(0, 3).map((event, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded">
                          {event}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 伏笔追踪 */}
        <Section
          title="伏笔追踪"
          icon={<GitBranch className="w-4 h-4" />}
          expanded={expandedSections.threads}
          onToggle={() => toggleSection('threads')}
          action={
            <button
              onClick={() => setShowAddThread(true)}
              className="p-1 text-gray-500 hover:text-blue-500"
            >
              <Plus className="w-4 h-4" />
            </button>
          }
        >
          {plotThreads.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无活跃的伏笔</p>
          ) : (
            <div className="space-y-2">
              {plotThreads.map(thread => (
                <div key={thread.id} className="text-sm bg-white dark:bg-gray-800 rounded p-2">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {thread.name}
                    {thread.introduced_chapter && (
                      <span className="ml-2 text-xs text-gray-400">
                        (第{thread.introduced_chapter}章引入)
                      </span>
                    )}
                  </div>
                  {thread.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {thread.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 里程碑 */}
        <Section
          title="里程碑"
          icon={<Flag className="w-4 h-4" />}
          expanded={expandedSections.milestones}
          onToggle={() => toggleSection('milestones')}
          action={
            <button
              onClick={() => setShowAddMilestone(true)}
              className="p-1 text-gray-500 hover:text-blue-500"
            >
              <Plus className="w-4 h-4" />
            </button>
          }
        >
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无里程碑</p>
          ) : (
            <div className="space-y-2">
              {milestones.map(ms => (
                <div key={ms.id} className="text-sm bg-white dark:bg-gray-800 rounded p-2">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {ms.title}
                    {ms.chapter_number && (
                      <span className="ml-2 text-xs text-gray-400">
                        (第{ms.chapter_number}章)
                      </span>
                    )}
                  </div>
                  {ms.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {ms.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 配置 */}
        <Section
          title="配置"
          icon={<Settings className="w-4 h-4" />}
          expanded={expandedSections.config}
          onToggle={() => toggleSection('config')}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">最近章节数</span>
              <select
                value={config?.recentChaptersCount || 3}
                onChange={(e) => updateConfig({ recentChaptersCount: parseInt(e.target.value, 10) })}
                className="text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">包含伏笔追踪</span>
              <input
                type="checkbox"
                checked={config?.includePlotThreads ?? true}
                onChange={(e) => updateConfig({ includePlotThreads: e.target.checked })}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">包含里程碑</span>
              <input
                type="checkbox"
                checked={config?.includeMilestones ?? true}
                onChange={(e) => updateConfig({ includeMilestones: e.target.checked })}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">包含角色变化</span>
              <input
                type="checkbox"
                checked={config?.includeCharacterChanges ?? true}
                onChange={(e) => updateConfig({ includeCharacterChanges: e.target.checked })}
                className="rounded"
              />
            </label>
          </div>
        </Section>
      </div>

      {/* 添加伏笔弹窗 */}
      {showAddThread && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-80">
            <h4 className="font-medium mb-3 dark:text-white">添加伏笔</h4>
            <input
              type="text"
              placeholder="伏笔名称"
              value={newThread.name}
              onChange={(e) => setNewThread({ ...newThread, name: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <textarea
              placeholder="描述（可选）"
              value={newThread.description}
              onChange={(e) => setNewThread({ ...newThread, description: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3 dark:bg-gray-700 dark:border-gray-600"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddThread(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
              >
                取消
              </button>
              <button
                onClick={addPlotThread}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加里程碑弹窗 */}
      {showAddMilestone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-80">
            <h4 className="font-medium mb-3 dark:text-white">添加里程碑</h4>
            <input
              type="text"
              placeholder="里程碑标题"
              value={newMilestone.title}
              onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="number"
              placeholder="关联章节号（可选）"
              value={newMilestone.chapterNumber}
              onChange={(e) => setNewMilestone({ ...newMilestone, chapterNumber: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <textarea
              placeholder="描述（可选）"
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3 dark:bg-gray-700 dark:border-gray-600"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddMilestone(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
              >
                取消
              </button>
              <button
                onClick={addMilestone}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 可折叠的区块组件
function Section({ title, icon, expanded, onToggle, action, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          {icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        {action && (
          <div onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
      {expanded && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}
