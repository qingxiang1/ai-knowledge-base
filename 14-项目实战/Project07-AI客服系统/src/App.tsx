import React from 'react';
import { CustomerService } from './components/CustomerService';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <CustomerService />
    </div>
  );
};

export default App;
