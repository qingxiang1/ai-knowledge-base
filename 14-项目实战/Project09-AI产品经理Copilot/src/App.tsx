import React from 'react';
import { PMCopilot } from './components/PMCopilot';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <PMCopilot />
    </div>
  );
};

export default App;
