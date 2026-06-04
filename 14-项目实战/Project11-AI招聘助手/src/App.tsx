import React from 'react';
import { RecruitmentAssistant } from './components/RecruitmentAssistant';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <RecruitmentAssistant />
    </div>
  );
};

export default App;
