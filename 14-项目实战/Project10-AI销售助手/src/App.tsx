import React from 'react';
import { SalesAssistant } from './components/SalesAssistant';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <SalesAssistant />
    </div>
  );
};

export default App;
