import React from 'react';
import { DollarSign, LogOut, User } from 'lucide-react';

const Header = ({ user, handleLogout }) => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">記帳日記本</h1>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">管理與成長的個人空間</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="text-sm text-blue-100 hidden sm:inline">{user.email}</span>
          <button onClick={handleLogout} className="ml-2 px-3 py-1 bg-white bg-opacity-20 rounded-md hover:bg-opacity-30 transition-colors text-sm flex items-center gap-1">
            <LogOut className="w-3 h-3" />登出
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
