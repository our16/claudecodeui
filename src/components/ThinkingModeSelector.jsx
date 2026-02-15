import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Sparkles, PenTool, GitBranch, Users, Wand2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Novel Writing Modes
 *
 * Optimized for fiction writing scenarios:
 * - Daily chat: Regular Q&A, no special prefix
 * - Creative: Free-form creative writing, inspiration
 * - Chapter: Formal chapter content with deep thinking
 * - Outline: Plot structure, chapter planning
 * - Character: Character development, dialogue, psychology
 * - Polish: Refine and improve existing content
 */
const thinkingModes = [
  {
    id: 'none',
    name: 'Daily Chat',
    description: 'Regular conversation, Q&A',
    icon: MessageSquare,
    prefix: '',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Free-form creative writing, inspiration',
    icon: Sparkles,
    prefix: '创意写作',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50'
  },
  {
    id: 'chapter',
    name: 'Chapter',
    description: 'Formal chapter writing with deep thinking',
    icon: PenTool,
    prefix: '章节创作',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'
  },
  {
    id: 'outline',
    name: 'Outline',
    description: 'Plot structure, chapter planning',
    icon: GitBranch,
    prefix: '大纲规划',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50'
  },
  {
    id: 'character',
    name: 'Character',
    description: 'Character development, dialogue, psychology',
    icon: Users,
    prefix: '人物刻画',
    color: 'text-green-500',
    bgColor: 'bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50'
  },
  {
    id: 'polish',
    name: 'Polish',
    description: 'Refine and improve existing content',
    icon: Wand2,
    prefix: '润色优化',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-900/30 dark:hover:bg-pink-900/50'
  }
];

function ThinkingModeSelector({ selectedMode, onModeChange, onClose, className = '' }) {
  const { t } = useTranslation('chat');

  // Create translated modes for display
  const translatedModes = thinkingModes.map(mode => {
    const modeKey = mode.id === 'none' ? 'none' : mode.id;
    return {
      ...mode,
      name: t(`thinkingMode.modes.${modeKey}.name`, mode.name),
      description: t(`thinkingMode.modes.${modeKey}.description`, mode.description),
      prefix: t(`thinkingMode.modes.${modeKey}.prefix`, mode.prefix)
    };
  });

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentMode = translatedModes.find(mode => mode.id === selectedMode) || translatedModes[0];
  const IconComponent = currentMode.icon;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          selectedMode === 'none'
            ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
            : currentMode.bgColor
        }`}
        title={t('thinkingMode.buttonTitle', { mode: currentMode.name })}
      >
        <IconComponent className={`w-5 h-5 ${currentMode.color}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('thinkingMode.selector.title')}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onClose) onClose();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('thinkingMode.selector.description')}
            </p>
          </div>

          <div className="py-1 max-h-80 overflow-y-auto">
            {translatedModes.map((mode) => {
              const ModeIcon = mode.icon;
              const isSelected = mode.id === selectedMode;

              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onModeChange(mode.id);
                    setIsOpen(false);
                    if (onClose) onClose();
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isSelected ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${mode.color}`}>
                      <ModeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${
                          isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {mode.name}
                        </span>
                        {isSelected && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            {t('thinkingMode.selector.active')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {mode.description}
                      </p>
                      {mode.prefix && (
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {mode.prefix}
                        </code>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Tip:</strong> {t('thinkingMode.selector.tip')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThinkingModeSelector;
export { thinkingModes };
