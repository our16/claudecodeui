/**
 * NovelSettings.jsx - 小说平台设置弹窗
 *
 * 小说创作的专属设置，区别于通用设置
 */

import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Palette, Type, Zap, X } from 'lucide-react';

export default function NovelSettings({ isOpen, onClose }) {
  // 状态管理
  const [activeTab, setActiveTab] = useState('general'); // general, writing, export
  const [settings, setSettings] = useState({
    // 写作设置
    dailyWordTarget: 8000,
    autoSaveInterval: 60, // 秒
    showProgressPanel: true,
    enableOutlineMode: false,
    // 显示设置
    fontSize: 'medium',
    fontFamily: 'system',
    lineHeight: 1.8,
    // 导出设置
    defaultExportFormat: 'txt',
    includeStateFiles: true
  });

  // 加载保存的设置
  useEffect(() => {
    const saved = localStorage.getItem('novelSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse novel settings:', error);
      }
    }
  }, []);

  // 保存设置
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('novelSettings', JSON.stringify(newSettings));
  };

  // 如果弹窗未打开，不渲染任何内容（必须在所有 hooks 之后）
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close settings"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">小说平台设置</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">配置你的创作环境和偏好</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings content area - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'general', label: '通用设置', icon: Settings },
              { id: 'writing', label: '写作设置', icon: Type },
              { id: 'export', label: '导出设置', icon: Save }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings panel content */}
          <div className="p-6">
            {activeTab === 'general' && (
              // 通用设置
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">通用设置</h3>

                {/* 默认日更目标 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    默认日更字数目标
                  </label>
                  <input
                    type="number"
                    value={settings.dailyWordTarget}
                    onChange={(e) => saveSettings({ ...settings, dailyWordTarget: parseInt(e.target.value) || 8000 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1000"
                    max="50000"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">设置新创建小说的默认日更目标</p>
                </div>

                {/* 自动保存间隔 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    自动保存间隔（秒）
                  </label>
                  <input
                    type="number"
                    value={settings.autoSaveInterval}
                    onChange={(e) => saveSettings({ ...settings, autoSaveInterval: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="30"
                    max="600"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">章节写作时自动保存草稿的频率</p>
                </div>

                {/* 进度面板设置 */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">显示章节进度面板</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">在工作台顶部显示统计信息</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ ...settings, showProgressPanel: !settings.showProgressPanel })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.showProgressPanel ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`absolute left-0 top-0 w-full h-full rounded-full transition-transform ${
                      settings.showProgressPanel ? 'translate-x-full' : 'translate-x-0'
                    }`}>
                      <div className={`w-6 h-6 rounded-full ${settings.showProgressPanel ? 'bg-white' : 'bg-blue-500'}`} />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'writing' && (
              // 写作设置
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">写作设置</h3>

                {/* 大纲模式 */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用大纲优先模式</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">创作前必须先生成章节大纲</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ ...settings, enableOutlineMode: !settings.enableOutlineMode })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.enableOutlineMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`absolute left-0 top-0 w-full h-full rounded-full transition-transform ${
                      settings.enableOutlineMode ? 'translate-x-full' : 'translate-x-0'
                    }`}>
                      <div className={`w-6 h-6 rounded-full ${settings.enableOutlineMode ? 'bg-white' : 'bg-blue-500'}`} />
                    </div>
                  </button>
                </div>

                {/* AI 行为偏好 */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI 创作风格偏好
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'balanced', label: '平衡', desc: '在质量和速度间平衡' },
                      { id: 'creative', label: '创意优先', desc: '更多创新和自由发挥' },
                      { id: 'efficient', label: '效率优先', desc: '快速完成章节创作' }
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => saveSettings({ ...settings, aiStyle: style.id })}
                        className={`p-4 border-2 rounded-lg text-sm transition-colors ${
                          settings.aiStyle === style.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{style.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{style.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              // 导出设置
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">导出设置</h3>

                {/* 默认导出格式 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    默认导出格式
                  </label>
                  <select
                    value={settings.defaultExportFormat}
                    onChange={(e) => saveSettings({ ...settings, defaultExportFormat: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="txt">TXT - 纯文本</option>
                    <option value="epub">EPUB - 电子书</option>
                    <option value="pdf">PDF - 文档格式</option>
                    <option value="markdown">Markdown - 标记格式</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">选择导出小说时的默认格式</p>
                </div>

                {/* 导出选项 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.includeStateFiles}
                      onChange={(e) => saveSettings({ ...settings, includeStateFiles: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">包含状态文件</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">导出时包含角色、世界观等设定文件</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={() => {
                alert('设置已保存');
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
