import React from 'react';
import { PlusCircle, TrendingUp, BookOpen, ListChecks, CheckSquare, Calendar } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'expense', icon: PlusCircle, label: '記帳' },
    { id: 'chart', icon: TrendingUp, label: '分析' },
    { id: 'diary', icon: BookOpen, label: '日記' },
    { id: 'todo', icon: ListChecks, label: '待辦' },
    { id: 'habit', icon: CheckSquare, label: '習慣' },
    { id: 'calendar', icon: Calendar, label: '日曆' },
  ];

  return (
    <nav className="flex border-b bg-gray-100">
      {navItems.map(item => (
        <button 
          key={item.id} 
          onClick={() => setActiveTab(item.id)} 
          className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 font-medium transition-colors ${activeTab === item.id ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
          <item.icon className="w-5 h-5" />
          <span className="text-xs sm:text-sm">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
