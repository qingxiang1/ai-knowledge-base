import React from 'react';
import { DataAnalyzer } from './components/DataAnalyzer';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <DataAnalyzer />
    </div>
  );
};

export default App;
