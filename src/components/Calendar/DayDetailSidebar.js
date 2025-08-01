import React from 'react';
import { X, CheckSquare } from 'lucide-react';

const DayDetailSidebar = ({ isOpen, onClose, details, handleNavigate }) => {
  if (!isOpen || !details) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}>
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform translate-x-0 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{details.date}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={() => handleNavigate('expense', details.date)} className="flex-1 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200">新增此日支出</button>
            <button onClick={() => handleNavigate('diary', details.date)} className="flex-1 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-200">寫這天日記</button>
          </div>

          {/* Expenses Section */}
          <div>
            <h3 className="font-semibold text-lg mb-2 text-red-600">
              支出明細
              <span className="text-sm font-normal text-gray-600 ml-2">
                (總計: NT$ {details.expenses.reduce((acc, exp) => acc + exp.amount, 0).toLocaleString()})
              </span>
            </h3>
            <div className="space-y-2">
              {details.expenses.length > 0 ? (
                details.expenses.map(exp => (
                  <div key={exp.id} className="bg-gray-50 p-3 rounded-md flex justify-between">
                    <span>{exp.category}: {exp.description || 'N/A'}</span>
                    <span className="font-medium">-NT$ {exp.amount.toLocaleString()}</span>
                  </div>
                ))
              ) : <p className="text-gray-500 text-sm">本日無支出紀錄。</p>}
            </div>
          </div>

          {/* Diary Section */}
          <div>
            <h3 className="font-semibold text-lg mb-2 text-green-600">日記</h3>
            {details.diary ? (
              <div className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap text-gray-800">
                {details.diary.content}
              </div>
            ) : <p className="text-gray-500 text-sm">本日無日記。</p>}
          </div>

          {/* Habits Section */}
          <div>
            <h3 className="font-semibold text-lg mb-2 text-purple-600">習慣追蹤</h3>
            <div className="space-y-2">
              {details.habits.length > 0 ? (
                details.habits.map(habit => {
                  const isCompleted = habit.completedDates.includes(details.date);
                  return (
                    <div key={habit.id} className={`bg-gray-50 p-3 rounded-md flex items-center gap-3 ${isCompleted ? 'text-black' : 'text-gray-400'}`}>
                      <CheckSquare size={18} className={isCompleted ? 'text-green-500' : 'text-gray-300'} />
                      <span>{habit.name}</span>
                    </div>
                  );
                })
              ) : <p className="text-gray-500 text-sm">尚未建立任何習慣。</p>}
            </div>
          </div>

          {/* Todos Section */}
          <div>
            <h3 className="font-semibold text-lg mb-2 text-yellow-600">待辦事項</h3>
            <div className="space-y-2">
              {details.todos.length > 0 ? (
                details.todos.map(todo => (
                  <div key={todo.id} className={`bg-gray-50 p-3 rounded-md flex items-center gap-3 ${todo.completed ? 'text-gray-400 line-through' : 'text-black'}`}>
                    <input type="checkbox" checked={todo.completed} readOnly className="w-4 h-4"/>
                    <span>{todo.text}</span>
                  </div>
                ))
              ) : <p className="text-gray-500 text-sm">本日無相關待辦。</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayDetailSidebar;
