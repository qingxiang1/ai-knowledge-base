import React from 'react';
import { AgentChat } from './components/AgentChat';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <AgentChat />
    </div>
  );
};

export default App;
