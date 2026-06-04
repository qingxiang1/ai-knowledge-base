import React from 'react';
import { Translator } from './components/Translator';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Translator />
    </div>
  );
};

export default App;
