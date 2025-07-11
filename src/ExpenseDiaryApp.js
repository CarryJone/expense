import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// 【新增】引入新功能需要的圖示
import { Calendar, DollarSign, BookOpen, PlusCircle, TrendingUp, LogIn, LogOut, User, Cloud, AlertCircle, ListChecks, CheckSquare, Trash2, Search } from 'lucide-react';

// 引入 Firebase 的認證和資料庫實例
import { auth, db } from './firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
// 【新增】引入 Firestore 子集合操作所需的所有函式
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

// 將常數移到組件外部以提升效能
const categories = ['餐飲', '交通', '購物', '娛樂', '醫療', '教育', '其他'];
const categoryColors = {
  '餐飲': '#FF6B6B', '交通': '#4ECDC4', '購物': '#45B7D1',
  '娛樂': '#96CEB4', '醫療': '#FFEAA7', '教育': '#DDA0DD', '其他': '#98D8C8'
};

const ExpenseDiaryApp = () => {
  // --- 狀態管理 (State Management) ---
  const [activeTab, setActiveTab] = useState('expense');
  const [expenses, setExpenses] = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  // 【新增】新功能的狀態
  const [todos, setTodos] = useState([]);
  const [habits, setHabits] = useState([]);

  // UI 和表單相關狀態
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authIsReady, setAuthIsReady] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  
  // 各式表單的狀態
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: '餐飲', description: '', date: new Date().toISOString().split('T')[0] });
  const [diaryForm, setDiaryForm] = useState({ content: '', date: new Date().toISOString().split('T')[0] });
  const [todoForm, setTodoForm] = useState({ text: '' });
  const [habitForm, setHabitForm] = useState({ name: '' });

  // 分析頁面的篩選狀態
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');

  // --- Firebase 即時資料監聽 (Real-time Listeners) ---
  useEffect(() => {
    if (!user) {
      // 清理登出後的狀態
      setExpenses([]);
      setDiaryEntries([]);
      setTodos([]);
      setHabits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const subscriptions = [];
    const collections = {
      expenses: { setter: setExpenses, orderByField: 'date', orderByDirection: 'desc' },
      diaryEntries: { setter: setDiaryEntries, orderByField: 'date', orderByDirection: 'desc' },
      todos: { setter: setTodos, orderByField: 'createdAt', orderByDirection: 'desc' },
      habits: { setter: setHabits, orderByField: 'name', orderByDirection: 'asc' },
    };

    for (const [key, value] of Object.entries(collections)) {
      const collRef = collection(db, 'users', user.uid, key);
      const q = query(collRef, orderBy(value.orderByField, value.orderByDirection));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        value.setter(data);
      }, (err) => {
        console.error(`Error fetching ${key}:`, err);
        setError(`讀取${key}資料失敗。`);
      });
      subscriptions.push(unsubscribe);
    }
    
    setIsLoading(false);

    // 組件卸載時，取消所有監聽以避免內存洩漏
    return () => subscriptions.forEach(unsub => unsub());

  }, [user]);

  // --- 認證處理 ---
  // (此部分程式碼與前一版相同，此處省略以節省篇幅)
  const handleAuth = async (e) => { /* ... */ };
  const handleLogout = () => { /* ... */ };


  // --- 資料新增/修改/刪除函式 (CRUD Operations) ---

  // 新增支出
  const addExpense = async () => {
    if (!expenseForm.amount) return setError('請填寫金額');
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) return setError('請輸入有效的正數金額');
    
    const collRef = collection(db, 'users', user.uid, 'expenses');
    await addDoc(collRef, { ...expenseForm, amount });
    setExpenseForm({ amount: '', category: '餐飲', description: '', date: new Date().toISOString().split('T')[0] });
  };

  // 新增日記
  const addDiaryEntry = async () => {
    if (!diaryForm.content.trim()) return setError('請輸入日記內容');
    const collRef = collection(db, 'users', user.uid, 'diaryEntries');
    await addDoc(collRef, { ...diaryForm });
    setDiaryForm({ content: '', date: new Date().toISOString().split('T')[0] });
  };
  
  // 新增待辦事項
  const addTodo = async () => {
    if (!todoForm.text.trim()) return;
    const collRef = collection(db, 'users', user.uid, 'todos');
    await addDoc(collRef, { text: todoForm.text, completed: false, createdAt: serverTimestamp() });
    setTodoForm({ text: '' });
  };

  // 切換待辦事項狀態
  const toggleTodo = async (todo) => {
    const docRef = doc(db, 'users', user.uid, 'todos', todo.id);
    await updateDoc(docRef, { completed: !todo.completed });
  };

  // 刪除待辦事項
  const deleteTodo = async (id) => {
    const docRef = doc(db, 'users', user.uid, 'todos', id);
    await deleteDoc(docRef);
  };

  // 新增習慣
  const addHabit = async () => {
    if (!habitForm.name.trim()) return;
    const collRef = collection(db, 'users', user.uid, 'habits');
    await addDoc(collRef, { name: habitForm.name, completedDates: [] });
    setHabitForm({ name: '' });
  };
  
  // 切換習慣完成狀態
  const toggleHabit = async (habit, dateString) => {
    const docRef = doc(db, 'users', user.uid, 'habits', habit.id);
    const isCompleted = habit.completedDates.includes(dateString);
    await updateDoc(docRef, {
      completedDates: isCompleted ? arrayRemove(dateString) : arrayUnion(dateString)
    });
  };

  // --- 資料計算與格式化 ---
  const filteredAndSortedExpenses = useMemo(() => {
    return expenses
      .filter(e => e.date.startsWith(selectedMonth) && (e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.includes(searchTerm)))
      .sort((a, b) => {
        switch (sortOrder) {
          case 'date-desc': return new Date(b.date) - new Date(a.date);
          case 'date-asc': return new Date(a.date) - new Date(b.date);
          case 'amount-desc': return b.amount - a.amount;
          case 'amount-asc': return a.amount - b.amount;
          default: return 0;
        }
      });
  }, [expenses, selectedMonth, searchTerm, sortOrder]);

  const pieData = useMemo(() => {
    const categoryTotals = filteredAndSortedExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      name: category, value: amount, color: categoryColors[category]
    }));
  }, [filteredAndSortedExpenses]);
  
  // 其他格式化函式...
  const totalExpense = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);


  // --- 渲染 (Rendering) ---
  // ... 登入頁面和載入中畫面 (與前一版相同) ...

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* ... Header (與前一版類似，可自行美化) ... */}

        {/* 標籤頁導航 (新增了 Todo 和 Habits) */}
        <nav className="flex border-b bg-gray-100">
            <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 px-2 text-sm sm:py-4 sm:px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'expense' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><PlusCircle className="w-5 h-5" />記帳</button>
            <button onClick={() => setActiveTab('chart')} className={`flex-1 py-3 px-2 text-sm sm:py-4 sm:px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'chart' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><TrendingUp className="w-5 h-5" />分析</button>
            <button onClick={() => setActiveTab('diary')} className={`flex-1 py-3 px-2 text-sm sm:py-4 sm:px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'diary' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><BookOpen className="w-5 h-5" />日記</button>
            <button onClick={() => setActiveTab('todo')} className={`flex-1 py-3 px-2 text-sm sm:py-4 sm:px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'todo' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><ListChecks className="w-5 h-5" />待辦</button>
            <button onClick={() => setActiveTab('habit')} className={`flex-1 py-3 px-2 text-sm sm:py-4 sm:px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'habit' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><CheckSquare className="w-5 h-5" />習慣</button>
        </nav>

        <main className="p-6">
          {/* 記帳頁面 (Expense Tab) */}
          {activeTab === 'expense' && (
             <div className="bg-blue-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-800">新增支出</h2>
                {/* ... 新增支出的表單 (與前一版相同) ... */}
             </div>
          )}

          {/* 圖表分析頁面 (Analysis Tab) - 全新佈局 */}
          {activeTab === 'chart' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 左側圖表 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">月度支出分析</h2>
                <div className="bg-white rounded-lg p-4 shadow-md">
                    <ResponsiveContainer width="100%" height={300}>
                        {/* ... PieChart 組件 (與前一版相同) ... */}
                    </ResponsiveContainer>
                    <p className="text-center font-semibold text-lg mt-2">總支出: NT$ {totalExpense.toLocaleString()}</p>
                </div>
              </div>

              {/* 右側明細與篩選 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">消費明細</h2>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-grow">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                     <input type="text" placeholder="搜尋備註或類別..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg"/>
                  </div>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border rounded-lg px-4 py-2">
                    <option value="date-desc">日期由新到舊</option>
                    <option value="date-asc">日期由舊到新</option>
                    <option value="amount-desc">金額由高到低</option>
                    <option value="amount-asc">金額由低到高</option>
                  </select>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                   {filteredAndSortedExpenses.length > 0 ? (
                       filteredAndSortedExpenses.map(exp => (
                           <div key={exp.id} className="flex justify-between items-center p-2 border-b">
                               <div>
                                   <p className="font-medium">{exp.category}</p>
                                   <p className="text-sm text-gray-500">{exp.description || '無備註'}</p>
                               </div>
                               <div className="text-right">
                                   <p className="font-semibold text-red-600">-NT$ {exp.amount.toLocaleString()}</p>
                                   <p className="text-sm text-gray-500">{exp.date}</p>
                               </div>
                           </div>
                       ))
                   ) : <p className="text-center text-gray-500 py-4">沒有符合條件的支出記錄。</p>}
                </div>
              </div>
            </div>
          )}

          {/* 日記頁面 (Diary Tab) - 時間流模式 */}
          {activeTab === 'diary' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="md:col-span-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">寫新日記</h2>
                  <div className="bg-green-50 rounded-lg p-6">
                      {/* ... 新增日記的表單 (與前一版相同) ... */}
                  </div>
               </div>
               <div className="md:col-span-2">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">日記時間流</h2>
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
                      {diaryEntries.map(entry => (
                          <div key={entry.id} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-gray-500 mb-2">{entry.date}</p>
                              <p className="text-gray-800 whitespace-pre-wrap">{entry.content}</p>
                          </div>
                      ))}
                  </div>
               </div>
            </div>
          )}

          {/* 待辦清單頁面 (Todo Tab) - 全新 */}
          {activeTab === 'todo' && (
             <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">待辦清單</h2>
                <div className="bg-yellow-50 rounded-lg p-6">
                   <form onSubmit={(e) => { e.preventDefault(); addTodo(); }} className="flex gap-4 mb-4">
                      <input type="text" placeholder="新增待辦事項..." value={todoForm.text} onChange={e => setTodoForm({text: e.target.value})} className="flex-grow border rounded-lg px-4 py-2"/>
                      <button type="submit" className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-semibold">新增</button>
                   </form>
                   <div className="space-y-2">
                       {todos.map(todo => (
                          <div key={todo.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleTodo(todo)}>
                                  <input type="checkbox" checked={todo.completed} readOnly className="w-5 h-5"/>
                                  <span className={`${todo.completed ? 'line-through text-gray-400' : ''}`}>{todo.text}</span>
                              </div>
                              <button onClick={() => deleteTodo(todo.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>
                          </div>
                       ))}
                   </div>
                </div>
             </div>
          )}

          {/* 習慣追蹤頁面 (Habit Tab) - 全新 */}
          {activeTab === 'habit' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">習慣追蹤</h2>
              <div className="bg-purple-50 rounded-lg p-6">
                <form onSubmit={(e) => { e.preventDefault(); addHabit(); }} className="flex gap-4 mb-6">
                  <input type="text" placeholder="新增要養成的習慣..." value={habitForm.name} onChange={e => setHabitForm({name: e.target.value})} className="flex-grow border rounded-lg px-4 py-2"/>
                  <button type="submit" className="bg-purple-500 text-white px-6 py-2 rounded-lg font-semibold">新增</button>
                </form>
                {/* 習慣追蹤表格 */}
                <div className="overflow-x-auto">
                    <table className="w-full text-center">
                        <thead>
                            <tr className="border-b">
                                <th className="py-2 px-1 font-semibold">習慣</th>
                                {/* 顯示最近七天 */}
                                {Array.from({length: 7}).map((_, i) => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - i);
                                    return <th key={i} className="py-2 px-1 text-sm">{`${d.getMonth()+1}/${d.getDate()}`}</th>
                                }).reverse()}
                            </tr>
                        </thead>
                        <tbody>
                            {habits.map(habit => (
                                <tr key={habit.id} className="border-b">
                                    <td className="py-3 px-1 text-left font-medium">{habit.name}</td>
                                    {Array.from({length: 7}).map((_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - i);
                                        const dateString = d.toISOString().split('T')[0];
                                        const isCompleted = habit.completedDates.includes(dateString);
                                        return (
                                            <td key={i} className="py-3 px-1">
                                                <div className={`w-6 h-6 mx-auto rounded-md cursor-pointer ${isCompleted ? 'bg-green-500' : 'bg-gray-200 hover:bg-gray-300'}`} onClick={() => toggleHabit(habit, dateString)}></div>
                                            </td>
                                        )
                                    }).reverse()}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ExpenseDiaryApp;