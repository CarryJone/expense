import React from 'react';

const EditExpenseModal = ({ isOpen, onClose, editingExpense, setEditingExpense, updateExpense, categories }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">編輯支出</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">金額</label>
            <input type="number" value={editingExpense.amount} onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md"/>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">類別</label>
            <select value={editingExpense.category} onChange={(e) => setEditingExpense({...editingExpense, category: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md">
              {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">日期</label>
            <input type="date" value={editingExpense.date} onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md"/>
          </div>
           <div>
            <label className="text-sm font-medium text-gray-700">備註</label>
            <input type="text" value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md"/>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">取消</button>
          <button onClick={updateExpense} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">儲存變更</button>
        </div>
      </div>
    </div>
  );
};

export default EditExpenseModal;
