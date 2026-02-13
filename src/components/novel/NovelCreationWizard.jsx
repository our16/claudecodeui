/**
 * NovelCreationWizard.jsx - 小说创建向导
 *
 * 分步引导用户创建新的小说项目
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, Zap } from 'lucide-react';

const STEPS = [
  { id: 'basic', title: '基本信息', description: '设置小说的基本信息' },
  { id: 'structure', title: '结构规划', description: '设计卷/章结构' },
  { id: 'settings', title: '创作偏好', description: '配置 AI 创作偏好' }
];

export default function NovelCreationWizard() {
  const navigate = useNavigate();

  // 状态管理
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // 基本信息
    name: '',
    displayName: '',
    genre: '仙侠', // 默认值
    description: '',
    // 结构规划
    volumeCount: 10,
    chaptersPerVolume: 100,
    totalChapters: 1000,
    // 创作偏好
    aiStyle: 'balanced', // balanced, creative, efficient
    dailyTarget: 8000
  });

  // 验证当前步骤
  const isStepValid = () => {
    switch (currentStep) {
      case 0: // 基本信息
        return formData.name.trim().length > 0 && formData.displayName.trim().length > 0;
      case 1: // 结构规划
        return formData.totalChapters > 0;
      case 2: // 创作偏好
        return formData.dailyTarget > 0;
      default:
        return false;
    }
  };

  // 下一步
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 创建小说
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          displayName: formData.displayName,
          genre: formData.genre,
          description: formData.description
        })
      });

      if (response.ok) {
        const data = await response.json();
        // 跳转到新创建的小说工作台
        navigate(`/novel/${data.novel.id}`);
      } else {
        alert('创建失败');
      }
    } catch (error) {
      console.error('Failed to create novel:', error);
      alert('创建失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/novels')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-lg font-medium">取消创建</span>
          </button>
        </div>

        {/* 主标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">创建新小说</h1>
          <p className="text-gray-500">
            {STEPS.map((step, index) => (
              <span
                key={step.id}
                className={`inline-block px-2 py-1 mx-1 rounded-lg text-sm ${
                  currentStep === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {step.title}
              </span>
            ))}
          </p>
        </div>

        {/* 进度指示器 */}
        <div className="mb-8">
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`h-2 flex-1 ${
                  index < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                } rounded-t-lg relative`}
              >
                {index < currentStep && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-500 font-bold">
                      {index + 1}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 步骤内容 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {currentStep === 0 && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">基本信息</h2>

              <div className="space-y-4">
                {/* 小说名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    小说名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：仙逆、霸道总裁..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 显示名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    显示名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="显示在界面上的名称"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 类型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    类型
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['仙侠', '玄幻', '都市', '历史', '科幻', '言情'].map(genre => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => setFormData({ ...formData, genre })}
                        className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                          formData.genre === genre
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 简介 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    简介
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="简单描述你的小说..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">结构规划</h2>

              <div className="space-y-6">
                {/* 总章节数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预计总章节数
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={formData.totalChapters}
                      onChange={(e) => setFormData({ ...formData, totalChapters: parseInt(e.target.value) || 1000 })}
                      className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="10000"
                    />
                    <span className="text-gray-500">章</span>
                  </div>
                </div>

                {/* 卷数分配 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分为几卷
                  </label>
                  <input
                    type="number"
                    value={formData.volumeCount}
                    onChange={(e) => {
                      const volumes = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, volumeCount: volumes, chaptersPerVolume: Math.ceil(formData.totalChapters / volumes) });
                    }}
                    className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                  <span className="text-gray-500 ml-2">卷 (约 {Math.ceil(formData.totalChapters / formData.volumeCount)} 章/卷)</span>
                </div>

                {/* 说明文本 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    合理的卷数分配有助于管理长篇连载。建议：10-50 万字的小说可分为 5-10 卷，每卷 10-20 万字。
                  </p>
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">创作偏好</h2>

              <div className="space-y-6">
                {/* AI 创作风格 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    AI 创作风格
                  </label>
                  <div className="space-y-3">
                    {[
                      { id: 'balanced', label: '平衡', desc: '在质量和速度间保持平衡' },
                      { id: 'creative', label: '创意优先', desc: '更多创新和自由发挥' },
                      { id: 'efficient', label: '效率优先', desc: '快速完成章节创作' }
                    ].map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, aiStyle: style.id })}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          formData.aiStyle === style.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{style.label}</div>
                        <div className="text-sm text-gray-500">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 日更目标 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    默认日更目标（字数）
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={formData.dailyTarget}
                      onChange={(e) => setFormData({ ...formData, dailyTarget: parseInt(e.target.value) || 8000 })}
                      className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1000"
                      max="50000"
                      step="1000"
                    />
                    <span className="text-gray-500">字/天</span>
                  </div>
                </div>

                {/* 高级选项提示 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-700">
                    <Zap className="w-4 h-4 inline mr-2" />
                    这些设置可以在创建后随时在"设置"中修改。开始创作前，建议先完善角色和世界观设定。
                  </p>
                </div>
              </div>
            </>
          )}

          {/* 导航按钮 */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-6 py-3 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              上一步
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                下一步
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!isStepValid()}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                创建小说
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
