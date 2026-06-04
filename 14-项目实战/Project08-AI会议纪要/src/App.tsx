import React from 'react';
import { MeetingMinutes } from './components/MeetingMinutes';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <MeetingMinutes />
    </div>
  );
};

export default App;
