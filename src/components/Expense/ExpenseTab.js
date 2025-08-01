import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const ExpenseTab = ({ 
  expenseForm, 
  setExpenseForm, 
  addExpense, 
  expensesForSelectedDate, 
  setEditingExpense, 
  setIsEditModalOpen, 
  deleteExpense,
  categories
}) => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">新增支出</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金額</label>
            <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="請輸入金額" min="0" step="0.01"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">類別</label>
            <select value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
            <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">備註</label>
            <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="備註說明"/>
          </div>
        </div>
        <button onClick={addExpense} className="mt-4 w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">新增支出</button>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{expenseForm.date} 的支出明細</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {(expensesForSelectedDate.length > 0) ? (
            expensesForSelectedDate.map(exp => (
              <div key={exp.id} className="flex justify-between items-center bg-white p-3 rounded border group">
                <div>
                  <span className="font-medium">{exp.category}</span>
                  {exp.description && <span className="text-gray-500 ml-2">{exp.description}</span>}
                </div>
                <div className="flex items-center gap-4">
                   <div className="font-semibold text-red-600 text-right">-NT$ {exp.amount.toLocaleString()}</div>
                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => { setEditingExpense(exp); setIsEditModalOpen(true); }} className="p-1 text-gray-500 hover:text-blue-600"><Pencil size={16}/></button>
                       <button onClick={() => deleteExpense(exp.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                   </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">本日尚無支出記錄</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseTab;
