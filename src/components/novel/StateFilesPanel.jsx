/**
 * StateFilesPanel - 状态文件面板
 *
 * 显示和管理状态文件（角色、世界观、时间线等）
 */

import { useState, useEffect } from 'react';
import { Users, Globe, Clock, Book, Plus, Edit2, Eye } from 'lucide-react';

// 状态文件类型配置
const STATE_FILE_TYPES = {
  characters: { icon: Users, label: '角色', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  timeline: { icon: Clock, label: '时间线', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  world_rules: { icon: Globe, label: '世界观', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  glossary: { icon: Book, label: '术语表', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  custom: { icon: Edit2, label: '自定义', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' }
};

export default function StateFilesPanel({ novel, stateFiles }) {
  const [activeTab, setActiveTab] = useState('characters');
  const [editingFile, setEditingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // 获取文件内容
  const fetchFileContent = async (fileName) => {
    try {
      const response = await fetch(`/api/novels/${novel.id}/state-files/${fileName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
        return data.content;
      }
    } catch (error) {
      console.error('Failed to fetch file content:', error);
    }
  };

  // 保存文件内容
  const saveFileContent = async (fileName, content) => {
    try {
      await fetch(`/api/novels/${novel.id}/state-files/${fileName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  };

  // 按类型分组文件
  const filesByType = stateFiles.reduce((acc, sf) => {
    const type = sf.type || 'custom';
    if (!acc[type]) acc[type] = [];
    acc[type].push(sf);
    return acc;
  }, {});

  // 当前类型对应的文件
  const currentFiles = filesByType[activeTab] || [];

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* 标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {Object.entries(STATE_FILE_TYPES).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => {
                  setActiveTab(type);
                  setShowPreview(false);
                  setEditingFile(null);
                }}
                className={`flex-1 px-3 py-3 flex items-center gap-2 text-sm transition-colors border-b-2 ${
                  activeTab === type
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 文件列表或编辑器 */}
      <div className="flex-1 overflow-y-auto">
        {editingFile ? (
          // 编辑模式
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="font-medium text-gray-800 dark:text-gray-100">{editingFile}</span>
              <button
                onClick={() => {
                  setEditingFile(null);
                  setShowPreview(false);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                取消
              </button>
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 p-4 resize-none focus:outline-none text-sm text-gray-800 dark:text-gray-100 dark:bg-gray-800 font-mono"
              placeholder="输入文件内容..."
            />
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={async () => {
                  const success = await saveFileContent(editingFile, fileContent);
                  if (success) {
                    setEditingFile(null);
                    setShowPreview(false);
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? '隐藏预览' : '预览'}
              </button>
            </div>
            {showPreview && (
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  {fileContent.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2 text-gray-800 dark:text-gray-200">
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 浏览模式
          <>
            {currentFiles.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                暂无{STATE_FILE_TYPES[activeTab]?.label || activeTab}文件
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {currentFiles.map((sf) => {
                  const config = STATE_FILE_TYPES[sf.type] || STATE_FILE_TYPES.custom;
                  const Icon = config.icon;
                  return (
                    <li key={sf.name}>
                      <button
                        onClick={async () => {
                          const content = await fetchFileContent(sf.name);
                          setFileContent(content || '');
                          setEditingFile(sf.name);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium text-gray-800 dark:text-gray-100 truncate text-sm">
                            {sf.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(sf.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            const newFileName = `custom_${Date.now()}.md`;
            setFileContent('');
            setEditingFile(newFileName);
          }}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建自定义文件
        </button>
      </div>
    </div>
  );
}
