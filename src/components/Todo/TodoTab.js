import React from 'react';
import { Trash2 } from 'lucide-react';

const TodoTab = ({ todos, todoForm, setTodoForm, addTodo, toggleTodo, deleteTodo }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">待辦清單</h2>
      <div className="bg-yellow-50 rounded-lg p-6 max-w-2xl mx-auto">
         <form onSubmit={addTodo} className="flex gap-4 mb-4">
            <input type="text" placeholder="新增待辦事項..." value={todoForm.text} onChange={e => setTodoForm({text: e.target.value})} className="flex-grow border rounded-lg px-4 py-2"/>
            <button type="submit" className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-semibold">新增</button>
         </form>
         <div className="space-y-2">
             {(todos || []).map(todo => (
                <div key={todo.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleTodo(todo)}>
                        <input type="checkbox" checked={todo.completed} readOnly className="w-5 h-5 text-yellow-600 focus:ring-yellow-500"/>
                        <span className={`${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{todo.text}</span>
                    </div>
                    <button onClick={() => deleteTodo(todo.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>
                </div>
             ))}
         </div>
      </div>
    </div>
  );
};

export default TodoTab;
