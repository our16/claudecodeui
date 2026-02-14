/**
 * ChapterEditor - 章节编辑器组件
 *
 * 集成 AI 对话界面和章节内容编辑
 */

import { useState, useEffect, useContext, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import WebSocketContext from '../../contexts/WebSocketContext';
import { Send, StopCircle, RotateCw, Save, FileText } from 'lucide-react';

export default function ChapterEditor({ novel, chapter, stateFiles }) {
  const { user } = useAuth();
  const { sendMessage, isConnected, latestMessage } = useContext(WebSocketContext) || { sendMessage: () => {}, isConnected: false, latestMessage: null };
  const messagesEndRef = useRef(null);

  // 状态管理
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [chapterContent, setChapterContent] = useState('');
  const [showContentPreview, setShowContentPreview] = useState(false);

  // 加载章节会话历史
  useEffect(() => {
    if (!chapter) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/novels/${novel.id}/chapters/${chapter.id}/sessions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        const data = await response.json();
        if (data.sessions && data.sessions.length > 0) {
          // 加载最新会话的消息
          const latestSession = data.sessions[0];
          if (latestSession.messages) {
            setMessages(latestSession.messages);
          }
        }
      } catch (error) {
        console.error('Failed to fetch chapter messages:', error);
      }
    };

    fetchMessages();
  }, [chapter, novel]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息给 AI
  const handleSend = async () => {
    if (!input.trim() || isWriting || !isConnected) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsWriting(true);

    // 通过 WebSocket 发送
    sendMessage({
      type: 'claude-command',
      command: input,
      options: {
        novelId: novel.id,
        chapterId: chapter.id,
        cwd: novel.projectPath
      }
    });
  };

  // 停止 AI 写作
  const handleStop = () => {
    sendMessage({
      type: 'claude-abort',
      sessionId: chapter.id
    });
    setIsWriting(false);
  };

  // 保存章节内容
  const handleSave = async () => {
    if (!chapter) return;

    try {
      await fetch(`/api/novels/${novel.id}/chapters/${chapter.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: chapterContent
        })
      });
      // 显示保存成功提示
      alert('章节已保存');
    } catch (error) {
      console.error('Failed to save chapter:', error);
      alert('保存失败');
    }
  };

  // WebSocket 消息处理
  useEffect(() => {
    if (!latestMessage) return;

    if (latestMessage.type === 'claude-response') {
      // AI 响应消息
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: latestMessage.data.content || '',
        timestamp: new Date().toISOString()
      }]);

      // 如果包含章节内容，更新预览
      if (latestMessage.data.chapterContent) {
        setChapterContent(latestMessage.data.chapterContent);
      }
    } else if (latestMessage.type === 'claude-complete') {
      // AI 写作完成
      setIsWriting(false);
    } else if (latestMessage.type === 'session-created') {
      // 会话创建
      console.log('Session created:', latestMessage.sessionId);
    }
  }, [latestMessage]);

  if (!chapter) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>请选择一个章节开始创作</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            第 {chapter.chapter_number} 章 · {chapter.title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {chapter.currentWordCount || 0} / {chapter.targetWordCount || 3000} 字
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowContentPreview(!showContentPreview)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              showContentPreview
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showContentPreview ? '显示对话' : '显示内容'}
          </button>
          {chapterContent && (
            <button
              onClick={handleSave}
              className="px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 对话区域 */}
        {!showContentPreview && (
          <div className="flex-1 flex flex-col">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-2">开始与 AI 对话创作这一章</p>
                  <p className="text-sm">输入你的创作要求，AI 将根据大纲和设定进行创作</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-2xl rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isWriting && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      <span className="text-sm">AI 正在写作...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入创作要求..."
                  disabled={isWriting}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  rows={2}
                />
                {isWriting ? (
                  <button
                    onClick={handleStop}
                    className="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 flex items-center gap-2"
                  >
                    <StopCircle className="w-5 h-5" />
                    停止
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    发送
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                按 Enter 发送，Shift + Enter 换行
              </p>
            </div>
          </div>
        )}

        {/* 内容预览 */}
        {showContentPreview && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {chapterContent ? (
              <div className="prose prose-sm max-w-none">
                {chapterContent.split('\n').map((para, idx) => (
                  <p key={idx} className="mb-4 text-gray-800 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>暂无内容，请先与 AI 对话进行创作</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 状态文件参考 */}
      {stateFiles.length > 0 && (
        <div className="w-64 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 text-sm">状态文件参考</h3>
          </div>
          <div className="px-4 py-2 space-y-2">
            {stateFiles.map((sf) => (
              <div key={sf.name} className="text-sm">
                <div className="font-medium text-gray-700">{sf.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(sf.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
