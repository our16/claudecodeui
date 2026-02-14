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

// 工作目录验证
const isValidPath = (path) => {
  if (!path || !path.trim()) return false;
  // 基本路径格式验证
  return /^[a-zA-Z]:\\|^[\/\~]/.test(path.trim());
};

export default function NovelCreationWizard() {
  const navigate = useNavigate();

  // 状态管理
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // 基本信息
    name: '',
    displayName: '',
    genre: '仙侠',
    description: '',
    projectPath: '',  // 工作目录（必填）
    // 结构规划
    volumeCount: 10,
    chaptersPerVolume: 100,
    totalChapters: 1000,
    // 创作偏好
    aiStyle: 'balanced',
    dailyTarget: 8000
  });

  // 验证当前步骤
  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.name.trim().length > 0 &&
               formData.displayName.trim().length > 0 &&
               isValidPath(formData.projectPath);
      case 1:
        return formData.totalChapters > 0;
      case 2:
        return formData.dailyTarget > 0;
      default:
        return false;
    }
  };

  // 下一步
  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && isStepValid()) {
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
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          displayName: formData.displayName,
          genre: formData.genre,
          description: formData.description,
          projectPath: formData.projectPath  // 工作目录（必填）
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/novels')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-lg font-medium">取消创建</span>
          </button>
        </div>

        {/* 主标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">创建新小说</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {STEPS.map((step, index) => (
              <span
                key={step.id}
                className={`inline-block px-3 py-1.5 mx-1 rounded-lg text-sm ${
                  currentStep === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
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
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                } rounded-t-lg relative`}
              >
                {index < currentStep && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {index + 1}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 步骤内容 - 可滚动区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-h-[70vh] overflow-y-auto">
          {currentStep === 0 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">基本信息</h2>

              <div className="space-y-5">
                {/* 小说名称 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    小说名称 <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：仙逆、霸道总裁..."
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                {/* 显示名称 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    显示名称 <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="显示在界面上的名称"
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                {/* 类型选择 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    类型
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {['仙侠', '玄幻', '都市', '历史', '科幻', '言情'].map(genre => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => setFormData({ ...formData, genre })}
                        className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                          formData.genre === genre
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 简介 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    简介
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="简单描述你的小说..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
                  />
                </div>

                {/* 工作目录 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    工作目录 <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.projectPath}
                    onChange={(e) => setFormData({ ...formData, projectPath: e.target.value })}
                    placeholder="例如：C:\Users\YourName\Novels\MyNovel 或 ~/novels/my-novel"
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    AI 将在此目录中工作，目录必须已存在
                  </p>
                </div>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">结构规划</h2>

              <div className="space-y-6">
                {/* 总章节数 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    预计总章节数
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.totalChapters}
                      onChange={(e) => setFormData({ ...formData, totalChapters: parseInt(e.target.value) || 1000 })}
                      className="w-full max-w-[200px] px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      min="1"
                      max="10000"
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">章</span>
                  </div>
                </div>

                {/* 卷数分配 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    分为几卷
                  </label>
                  <input
                    type="number"
                    value={formData.volumeCount}
                    onChange={(e) => {
                      const volumes = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, volumeCount: volumes, chaptersPerVolume: Math.ceil(formData.totalChapters / volumes) });
                    }}
                    className="w-full max-w-[200px] px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    min="1"
                    max="100"
                  />
                  <span className="text-gray-600 dark:text-gray-400 ml-3">
                    约 {Math.ceil(formData.totalChapters / formData.volumeCount)} 章/卷
                  </span>
                </div>

                {/* 说明文本 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    <BookOpen className="w-5 h-5 inline-block mr-3" />
                    合理的卷数分配有助于管理长篇连载。建议：10-50 万字的小说可分为 5-10 卷，每卷 10-20 万字。
                  </p>
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">创作偏好</h2>

              <div className="space-y-6">
                {/* AI 创作风格 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    AI 创作风格
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'balanced', label: '平衡', desc: '在质量和速度间保持平衡' },
                      { id: 'creative', label: '创意优先', desc: '更多创新和自由发挥' },
                      { id: 'efficient', label: '效率优先', desc: '快速完成章节创作' }
                    ].map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, aiStyle: style.id })}
                        className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                          formData.aiStyle === style.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-semibold text-base">{style.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 日更目标 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    默认日更目标（字数）
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.dailyTarget}
                      onChange={(e) => setFormData({ ...formData, dailyTarget: parseInt(e.target.value) || 8000 })}
                      className="w-full max-w-[200px] px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      min="1000"
                      max="50000"
                      step="1000"
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">字/天</span>
                  </div>
                </div>

                {/* 高级选项提示 */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-xl p-5">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                    <Zap className="w-5 h-5 inline-block mr-3" />
                    这些设置可以在创建后随时在"设置"中修改。开始创作前，建议先完善角色和世界观设定。
                  </p>
                </div>
              </div>
            </>
          )}

          {/* 导航按钮 */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-300 dark:border-gray-700">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-6 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              上一步
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="px-6 py-3 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                下一步
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!isStepValid()}
                className="px-6 py-3 rounded-xl font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
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
