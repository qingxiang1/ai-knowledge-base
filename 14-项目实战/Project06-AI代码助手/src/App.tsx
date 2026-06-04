import React from 'react';
import { CodeAssistant } from './components/CodeAssistant';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <CodeAssistant />
    </div>
  );
};

export default App;
