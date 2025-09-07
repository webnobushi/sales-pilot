import React from 'react';

type ContextInfo = {
  name: string;
  value?: string;
};

type ContextData = {
  currentContext: string;
  userIntent: string;
  currentInfoList?: ContextInfo[];
};

type ContextProps = {
  context: ContextData | null;
  isAnalyzing: boolean;
};

const Context: React.FC<ContextProps> = ({ context, isAnalyzing }) => {
  if (!context) return null;

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg animate-fade-in">
      <h3 className="font-semibold text-blue-800 mb-3">
        AI文脈分析
        {isAnalyzing && (
          <span className="text-xs text-blue-600 ml-2">
            <span className="animate-spin">⏳</span> 分析中...
          </span>
        )}
      </h3>

      <div className="space-y-4 text-sm">
        {/* 現在のエージェント */}
        {context && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-blue-800 mb-2">現在の文脈</h3>
                <p className="text-sm text-blue-700">
                  {context.currentContext === 'plan' ? '営業計画' :
                    context.currentContext === 'list' ? '顧客データ取得' :
                      '営業に関する相談'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-800 mb-2">ユーザー意図</h3>
                <p className="text-sm text-blue-700">
                  {context.userIntent || 'なし'}
                </p>
              </div>
            </div>

            {/* 必要な情報の状況 */}
            {context.currentInfoList && context.currentInfoList.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-blue-800 mb-2">情報収集状況</h3>
                <div className="space-y-2">
                  {context.currentInfoList.map((info, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-blue-700 font-medium">{info.name}:</span>
                      <span className="text-blue-600 ml-2">{info.value ?? '未収集'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Context;
