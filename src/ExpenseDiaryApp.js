import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Calendar, DollarSign, BookOpen, PlusCircle, TrendingUp, LogIn, LogOut, User, Cloud, AlertCircle, ListChecks, CheckSquare, Trash2, Search, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// 引入 Firebase 的認證和資料庫實例
import { auth, db } from './firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy,
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
  // --- 狀態管理 ---
  const [activeTab, setActiveTab] = useState('expense');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [todos, setTodos] = useState([]);
  const [habits, setHabits] = useState([]);

  // UI 和表單相關狀態
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authIsReady, setAuthIsReady] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  
  // 各式表單狀態
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: '餐飲', description: '', date: new Date().toISOString().split('T')[0] });
  const [diaryForm, setDiaryForm] = useState({ content: '', date: new Date().toISOString().split('T')[0] });
  const [todoForm, setTodoForm] = useState({ text: '' });
  const [habitForm, setHabitForm] = useState({ name: '' });

  // 編輯功能的相關狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingDiaryId, setEditingDiaryId] = useState(null);
  const [editingDiaryContent, setEditingDiaryContent] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingHabitName, setEditingHabitName] = useState('');

  // 習慣追蹤的日期導覽狀態
  const [habitViewDate, setHabitViewDate] = useState(new Date());

  // 分析頁面的篩選狀態
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');

  // 日記搜尋與篩選狀態
  const [diarySearch, setDiarySearch] = useState('');
  // 融合日期/月份篩選狀態
  const [diaryDateMode, setDiaryDateMode] = useState('date'); // 'date' or 'month'
  const [diaryDateValue, setDiaryDateValue] = useState('');

  // 日記統計與回顧狀態
  const [randomDiary, setRandomDiary] = useState(null);
  const [showRandomDiary, setShowRandomDiary] = useState(false);
  // 日記展開狀態
  const [expandedDiaryIds, setExpandedDiaryIds] = useState([]);

  // 分析頁面圖表型態與篩選狀態
  const [chartType, setChartType] = useState('pie'); // 'pie' | 'bar' | 'line'
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('全部');
  const [expenseDateStart, setExpenseDateStart] = useState('');
  const [expenseDateEnd, setExpenseDateEnd] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const expensesPerPage = 10;

  // 習慣頁面：計算每月完成率（只宣告一次）
  const getMonthDays = (year, month) => new Date(year, month, 0).getDate();
  const today = new Date();
  const thisMonthStr = today.toISOString().slice(0, 7);
  const thisMonthDays = getMonthDays(today.getFullYear(), today.getMonth() + 1);
  const getHabitMonthStats = (habit) => {
    const completed = (habit.completedDates || []).filter(d => d.startsWith(thisMonthStr)).length;
    return {
      completed,
      total: thisMonthDays,
      percent: thisMonthDays ? Math.round((completed / thisMonthDays) * 100) : 0
    };
  };

  // 整合每日狀態
  const getDayStatus = (dateStr) => {
    const hasDiary = diaryEntries.some(e => e.date === dateStr);
    const hasExpense = expenses.some(e => e.date === dateStr);
    const hasTodo = todos.some(e => e.createdAt && new Date(e.createdAt.seconds*1000).toISOString().split('T')[0] === dateStr);
    const habitsDone = habits.filter(h => h.completedDates.includes(dateStr)).length;
    return { hasDiary, hasExpense, hasTodo, habitsDone };
  };

  // --- Firebase 即時資料監聽 ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthIsReady(true);
      setIsLoading(false); 
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setDiaryEntries([]);
      setTodos([]);
      setHabits([]);
      return;
    }

    const subscriptions = [];
    const collectionsToListen = {
      expenses: { setter: setExpenses, orderByField: 'date', orderByDirection: 'desc' },
      diaryEntries: { setter: setDiaryEntries, orderByField: 'date', orderByDirection: 'desc' },
      todos: { setter: setTodos, orderByField: 'createdAt', orderByDirection: 'desc' },
      habits: { setter: setHabits, orderByField: 'createdAt', orderByDirection: 'asc' },
    };

    for (const [key, value] of Object.entries(collectionsToListen)) {
      const collRef = collection(db, 'users', user.uid, key);
      const q = query(collRef, orderBy(value.orderByField, value.orderByDirection));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        value.setter(data);
      }, (err) => {
        console.error(`Error fetching ${key}:`, err);
        setError(`讀取 ${key} 資料失敗。`);
      });
      subscriptions.push(unsubscribe);
    }
    
    return () => subscriptions.forEach(unsub => unsub());
  }, [user]);


  // --- 認證處理 ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setError('請填寫所有欄位');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      } else {
        await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      }
      setLoginForm({ email: '', password: '' });
    } catch (err) {
      setError(err.message.includes('auth/invalid-credential') ? '信箱或密碼錯誤' : '認證失敗，請檢查輸入');
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // --- CRUD 操作 (Create, Read, Update, Delete) ---
  const getCollRef = (collName) => collection(db, 'users', user.uid, collName);

  // Expense CRUD
  const addExpense = async () => {
    if (!expenseForm.amount) return setError('請填寫金額');
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) return setError('請輸入有效的正數金額');
    await addDoc(getCollRef('expenses'), { ...expenseForm, amount, createdAt: serverTimestamp() });
    setExpenseForm(prev => ({ ...prev, amount: '', description: '', category: '餐飲' }));
  };

  const updateExpense = async () => {
    if (!editingExpense) return;
    const docRef = doc(db, 'users', user.uid, 'expenses', editingExpense.id);
    await updateDoc(docRef, {
      amount: parseFloat(editingExpense.amount) || 0,
      category: editingExpense.category,
      date: editingExpense.date,
      description: editingExpense.description,
    });
    setIsEditModalOpen(false);
    setEditingExpense(null);
  };

  const deleteExpense = async (id) => {
    if (window.confirm('您確定要刪除這筆支出嗎？')) {
      const docRef = doc(db, 'users', user.uid, 'expenses', id);
      await deleteDoc(docRef);
    }
  };

  // Diary CRUD
  const addDiaryEntry = async () => {
    if (!diaryForm.content.trim()) return setError('請輸入日記內容');
    await addDoc(getCollRef('diaryEntries'), { ...diaryForm, createdAt: serverTimestamp() });
    setDiaryForm(prev => ({ ...prev, content: '' }));
  };

  const updateDiary = async () => {
    if (!editingDiaryId) return;
    const docRef = doc(db, 'users', user.uid, 'diaryEntries', editingDiaryId);
    await updateDoc(docRef, { content: editingDiaryContent });
    setEditingDiaryId(null);
    setEditingDiaryContent('');
  };

  const deleteDiary = async (id) => {
    if (window.confirm('您確定要刪除這篇日記嗎？')) {
      const docRef = doc(db, 'users', user.uid, 'diaryEntries', id);
      await deleteDoc(docRef);
    }
  };

  // Todo CRUD
  const addTodo = async (e) => {
    e.preventDefault();
    if (!todoForm.text.trim()) return;
    await addDoc(getCollRef('todos'), { text: todoForm.text, completed: false, createdAt: serverTimestamp() });
    setTodoForm({ text: '' });
  };

  const toggleTodo = async (todo) => {
    const docRef = doc(db, 'users', user.uid, 'todos', todo.id);
    await updateDoc(docRef, { completed: !todo.completed });
  };

  const deleteTodo = async (id) => {
    const docRef = doc(db, 'users', user.uid, 'todos', id);
    await deleteDoc(docRef);
  };

  // Habit CRUD
  const addHabit = async (e) => {
    e.preventDefault();
    if (!habitForm.name.trim()) return;
    await addDoc(getCollRef('habits'), { name: habitForm.name, createdAt: serverTimestamp(), completedDates: [] });
    setHabitForm({ name: '' });
  };
  
  const toggleHabit = async (habit, dateString) => {
    const docRef = doc(db, 'users', user.uid, 'habits', habit.id);
    const isCompleted = habit.completedDates.includes(dateString);
    await updateDoc(docRef, {
      completedDates: isCompleted ? arrayRemove(dateString) : arrayUnion(dateString)
    });
  };

  const updateHabit = async () => {
    if (!editingHabitId || !editingHabitName.trim()) return;
    const docRef = doc(db, 'users', user.uid, 'habits', editingHabitId);
    await updateDoc(docRef, { name: editingHabitName });
    setEditingHabitId(null);
    setEditingHabitName('');
  };

  const deleteHabit = async (id) => {
    if (window.confirm('您確定要刪除這個習慣嗎？')) {
      const docRef = doc(db, 'users', user.uid, 'habits', id);
      await deleteDoc(docRef);
    }
  };

  // 展開/收合日記
  const toggleDiaryExpand = (id) => {
    setExpandedDiaryIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };


  // --- 資料計算與格式化 ---
  const expensesForSelectedDate = useMemo(() => {
    return (expenses || []).filter(e => e.date === expenseForm.date);
  }, [expenses, expenseForm.date]);

  // 【修正】增加了防禦性檢查，確保 e.date, e.description, e.category 存在
  const filteredAndSortedExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => {
        const descriptionMatch = e.description ? e.description.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const categoryMatch = e.category ? e.category.includes(searchTerm) : false;
        const dateMatch = e.date ? e.date.startsWith(selectedMonth) : false;
        
        if (!searchTerm) {
          return dateMatch;
        }
        return dateMatch && (descriptionMatch || categoryMatch);
      })
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
    const categoryTotals = (filteredAndSortedExpenses || []).reduce((acc, expense) => {
      // 防禦性檢查，確保 expense.category 存在
      if (expense.category) {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      }
      return acc;
    }, {});
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      name: category, value: amount, color: categoryColors[category]
    }));
  }, [filteredAndSortedExpenses]);
  
  const totalExpense = useMemo(() => (pieData || []).reduce((sum, item) => sum + item.value, 0), [pieData]);

  // 分析頁面資料過濾
  const filteredExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => {
        const matchCategory = expenseCategoryFilter === '全部' || e.category === expenseCategoryFilter;
        const matchStart = expenseDateStart ? e.date >= expenseDateStart : true;
        const matchEnd = expenseDateEnd ? e.date <= expenseDateEnd : true;
        return matchCategory && matchStart && matchEnd;
      });
  }, [expenses, expenseCategoryFilter, expenseDateStart, expenseDateEnd]);

  // 分頁資料
  const pagedExpenses = useMemo(() => {
    const startIdx = (expensePage - 1) * expensesPerPage;
    return filteredExpenses.slice(startIdx, startIdx + expensesPerPage);
  }, [filteredExpenses, expensePage]);
  const totalExpensePages = Math.ceil(filteredExpenses.length / expensesPerPage);

  // 統計摘要
  const dailyTotals = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      if (!map[e.date]) map[e.date] = 0;
      map[e.date] += e.amount;
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }, [filteredExpenses]);
  const maxDay = dailyTotals.reduce((max, cur) => cur.amount > max.amount ? cur : max, { amount: 0, date: '' });
  const avgPerDay = dailyTotals.length ? (filteredExpenses.reduce((sum, e) => sum + e.amount, 0) / dailyTotals.length) : 0;
  const categoryRank = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      if (!map[e.category]) map[e.category] = 0;
      map[e.category] += e.amount;
    });
    return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // 日記搜尋與篩選後的資料
  const filteredDiaryEntries = useMemo(() => {
    return (diaryEntries || [])
      .filter(entry => {
        const matchContent = entry.content?.toLowerCase().includes(diarySearch.toLowerCase());
        let matchDate = true;
        if (diaryDateValue) {
          if (diaryDateMode === 'date') {
            matchDate = entry.date === diaryDateValue;
          } else if (diaryDateMode === 'month') {
            matchDate = entry.date && entry.date.slice(0,7) === diaryDateValue;
          }
        }
        return (!diarySearch || matchContent) && matchDate;
      });
  }, [diaryEntries, diarySearch, diaryDateMode, diaryDateValue]);

  // 日記統計
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + (6 - today.getDay()));
  const diaryCountMonth = (diaryEntries || []).filter(entry => entry.date?.slice(0,7) === thisMonthStr).length;
  const diaryCountWeek = (diaryEntries || []).filter(entry => {
    if (!entry.date) return false;
    const d = new Date(entry.date);
    return d >= thisWeekStart && d <= thisWeekEnd;
  }).length;

  // 隨機回顧日記
  const handleRandomDiary = () => {
    if (!diaryEntries || diaryEntries.length === 0) return;
    const idx = Math.floor(Math.random() * diaryEntries.length);
    setRandomDiary(diaryEntries[idx]);
    setShowRandomDiary(true);
  };

  // --- 渲染 (Rendering) ---
  if (!authIsReady) {
    return <div className="flex justify-center items-center h-screen font-bold text-xl">載入中...</div>;
  }
  
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 sm:mt-20 p-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <Cloud className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">記帳日記本 v3</h1>
          <p className="text-gray-600 mt-2">{isSignUp ? '註冊新帳號' : '登入開始記錄您的生活'}</p>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">電子郵件</label>
            <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="請輸入電子郵件" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="請輸入密碼 (至少6位)" required />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <LogIn className="w-4 h-4" />}
            {isSignUp ? '註冊' : '登入'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-blue-600 hover:text-blue-800 text-sm">
            {isSignUp ? '已有帳號？點此登入' : '沒有帳號？點此註冊'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isEditModalOpen && editingExpense && (
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
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">取消</button>
              <button onClick={updateExpense} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">儲存變更</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-2 sm:p-4 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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

          <nav className="flex border-b bg-gray-100">
            <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'expense' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><PlusCircle className="w-5 h-5" /><span className="text-xs sm:text-sm">記帳</span></button>
            <button onClick={() => setActiveTab('chart')} className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'chart' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><TrendingUp className="w-5 h-5" /><span className="text-xs sm:text-sm">分析</span></button>
            <button onClick={() => setActiveTab('diary')} className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'diary' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><BookOpen className="w-5 h-5" /><span className="text-xs sm:text-sm">日記</span></button>
            <button onClick={() => setActiveTab('todo')} className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'todo' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><ListChecks className="w-5 h-5" /><span className="text-xs sm:text-sm">待辦</span></button>
            <button onClick={() => setActiveTab('habit')} className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'habit' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><CheckSquare className="w-5 h-5" /><span className="text-xs sm:text-sm">習慣</span></button>
            <button onClick={() => setActiveTab('calendar')} className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'calendar' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}><Calendar className="w-5 h-5" /><span className="text-xs sm:text-sm">日曆</span></button>
          </nav>

          <main className="p-4 sm:p-6">
            {activeTab === 'expense' && (
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
            )}

            {activeTab === 'chart' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">支出分析</h2>
                  {/* 圖表型態切換 */}
                  <div className="flex justify-center gap-2 mb-2">
                    <button onClick={() => setChartType('pie')} className={`px-3 py-1 rounded ${chartType==='pie'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>圓餅圖</button>
                    <button onClick={() => setChartType('bar')} className={`px-3 py-1 rounded ${chartType==='bar'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>長條圖</button>
                    <button onClick={() => setChartType('line')} className={`px-3 py-1 rounded ${chartType==='line'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>折線圖</button>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <ResponsiveContainer width="100%" height={300}>
                      {chartType === 'pie' && (
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={110} fill="#8884d8" dataKey="value">
                            {pieData.map((entry) => (<Cell key={`cell-${entry.name}`} fill={entry.color} />))}
                          </Pie>
                          <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                        </PieChart>
                      )}
                      {chartType === 'bar' && (
                        <BarChart data={categoryRank} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                          <Legend />
                          <Bar dataKey="amount" fill="#4ECDC4" animationDuration={800} />
                        </BarChart>
                      )}
                      {chartType === 'line' && (
                        <LineChart data={dailyTotals} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                          <Legend />
                          <Line type="monotone" dataKey="amount" stroke="#FF6B6B" strokeWidth={2} dot={{ r: 3 }} animationDuration={800} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                    <p className="text-center font-semibold text-lg mt-2">總支出: NT$ {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
                  </div>
                  {/* 統計摘要 */}
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                    <div>平均每日支出：<span className="font-bold text-blue-700">NT$ {avgPerDay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                    <div>最高單日支出：<span className="font-bold text-red-600">NT$ {maxDay.amount.toLocaleString()} {maxDay.date && `（${maxDay.date}）`}</span></div>
                    <div>消費類別排行：</div>
                    <ol className="list-decimal ml-6">
                      {categoryRank.map((item, idx) => (
                        <li key={item.category} className="text-gray-700">{item.category} <span className="text-gray-500">NT$ {item.amount.toLocaleString()}</span></li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">消費明細</h2>
                  {/* 篩選區塊 */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-grow">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                       <input type="text" placeholder="搜尋備註或類別..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg"/>
                    </div>
                    <select value={expenseCategoryFilter} onChange={e => { setExpenseCategoryFilter(e.target.value); setExpensePage(1); }} className="border rounded-lg px-4 py-2">
                      <option value="全部">全部類別</option>
                      {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                    <input type="date" value={expenseDateStart} onChange={e => { setExpenseDateStart(e.target.value); setExpensePage(1); }} className="border rounded-lg px-4 py-2"/>
                    <span className="self-center">~</span>
                    <input type="date" value={expenseDateEnd} onChange={e => { setExpenseDateEnd(e.target.value); setExpensePage(1); }} className="border rounded-lg px-4 py-2"/>
                  </div>
                  {/* 明細分頁顯示 */}
                  <div className="bg-gray-50 rounded-lg p-2 max-h-[400px] overflow-y-auto">
                     {(pagedExpenses || []).map(exp => (
                         <div key={exp.id} className="flex justify-between items-center p-2 border-b group hover:bg-blue-50 transition-colors">
                             <div>
                               <p className="font-medium">{exp.category}</p>
                               <p className="text-sm text-gray-500">{exp.description || '無備註'}</p>
                             </div>
                             <div className="flex items-center gap-4">
                               <div className="text-right">
                                 <p className="font-semibold text-red-600">-NT$ {exp.amount.toLocaleString()}</p>
                                 <p className="text-sm text-gray-500">{exp.date}</p>
                               </div>
                               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { setEditingExpense(exp); setIsEditModalOpen(true); }} className="p-1 text-gray-500 hover:text-blue-600"><Pencil size={16}/></button>
                                   <button onClick={() => deleteExpense(exp.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                               </div>
                             </div>
                         </div>
                     ))}
                     {pagedExpenses.length === 0 && (
                       <p className="text-gray-400 text-center py-8">查無符合條件的明細</p>
                     )}
                  </div>
                  {/* 分頁按鈕 */}
                  <div className="flex justify-center gap-2 mt-2">
                    <button disabled={expensePage===1} onClick={()=>setExpensePage(p=>p-1)} className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50">上一頁</button>
                    <span className="self-center text-sm">{expensePage} / {totalExpensePages || 1}</span>
                    <button disabled={expensePage===totalExpensePages || totalExpensePages===0} onClick={()=>setExpensePage(p=>p+1)} className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50">下一頁</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'diary' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="md:col-span-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">寫新日記</h2>
                    <div className="bg-green-50 rounded-lg p-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
                            <input type="date" value={diaryForm.date} onChange={(e) => setDiaryForm({...diaryForm, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg"/>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">日記內容</label>
                            <textarea value={diaryForm.content} onChange={(e) => setDiaryForm({...diaryForm, content: e.target.value})} rows={10} className="w-full px-3 py-2 border rounded-lg" placeholder="記錄今天..."/>
                          </div>
                          <button onClick={addDiaryEntry} className="w-full bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">保存日記</button>
                        </div>
                    </div>
                    {/* 日記統計與回顧 */}
                    <div className="mt-6 p-4 bg-white rounded-lg shadow flex flex-col gap-2">
                      <div className="text-gray-700 text-sm">本月日記篇數：<span className="font-bold text-green-700">{diaryCountMonth}</span></div>
                      <div className="text-gray-700 text-sm">本週日記篇數：<span className="font-bold text-green-700">{diaryCountWeek}</span></div>
                      <button onClick={handleRandomDiary} className="mt-2 bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded text-sm">隨機回顧一篇日記</button>
                    </div>
                    {/* 隨機日記彈窗 */}
                    {showRandomDiary && randomDiary && (
                      <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
                          <button onClick={() => setShowRandomDiary(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"><X size={20}/></button>
                          <h3 className="text-lg font-bold mb-2 text-green-700">隨機日記回顧</h3>
                          <div className="text-sm text-gray-500 mb-2">{randomDiary.date}</div>
                          <div className="whitespace-pre-wrap text-gray-800">{randomDiary.content}</div>
                        </div>
                      </div>
                    )}
                 </div>
                 <div className="md:col-span-2">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">日記時間流</h2>
                    {/* 搜尋與篩選欄位 */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="搜尋日記內容..."
                        value={diarySearch}
                        onChange={e => setDiarySearch(e.target.value)}
                        className="flex-1 border rounded-lg px-4 py-2"
                      />
                      {/* 日期/月份融合選擇器 */}
                      <div className="flex gap-1 items-center">
                        <select value={diaryDateMode} onChange={e => { setDiaryDateMode(e.target.value); setDiaryDateValue(''); }} className="border rounded-lg px-2 py-2 text-sm">
                          <option value="date">依日期</option>
                          <option value="month">依月份</option>
                        </select>
                        <input
                          type={diaryDateMode}
                          value={diaryDateValue}
                          onChange={e => setDiaryDateValue(e.target.value)}
                          className="border rounded-lg px-4 py-2"
                        />
                        {diaryDateValue && (
                          <button onClick={() => setDiaryDateValue('')} className="px-2 py-1 text-xs bg-gray-200 rounded">清除</button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
                        {(filteredDiaryEntries || []).map(entry => {
                          const isExpanded = expandedDiaryIds.includes(entry.id);
                          const contentLines = entry.content?.split('\n') || [];
                          const preview = contentLines.slice(0, 3).join('\n');
                          const isLong = contentLines.length > 3;
                          return (
                            <div key={entry.id} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-400 transition-shadow group hover:shadow-2xl cursor-pointer" onClick={() => !isExpanded && isLong && toggleDiaryExpand(entry.id)}>
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-semibold text-gray-500 mb-2">{entry.date}</p>
                                    {editingDiaryId !== entry.id && (
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setEditingDiaryId(entry.id); setEditingDiaryContent(entry.content); }} className="p-1 text-gray-500 hover:text-blue-600"><Pencil size={16}/></button>
                                        <button onClick={() => deleteDiary(entry.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                                      </div>
                                    )}
                                </div>
                                {editingDiaryId === entry.id ? (
                                  <div onClick={e => e.stopPropagation()}>
                                    <textarea value={editingDiaryContent} onChange={(e) => setEditingDiaryContent(e.target.value)} rows={5} className="w-full p-2 border rounded-md"/>
                                    <div className="flex justify-end gap-2 mt-2">
                                      <button onClick={() => setEditingDiaryId(null)} className="px-3 py-1 bg-gray-200 rounded-md text-sm">取消</button>
                                      <button onClick={updateDiary} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">儲存</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-gray-800 whitespace-pre-wrap select-text">{isExpanded || !isLong ? entry.content : preview + (isLong ? '\n⋯⋯' : '')}</p>
                                    {isLong && (
                                      <button
                                        className="mt-2 text-green-600 text-xs underline hover:text-green-800"
                                        onClick={e => { e.stopPropagation(); toggleDiaryExpand(entry.id); }}
                                      >{isExpanded ? '收合全文' : '展開全文'}</button>
                                    )}
                                  </>
                                )}
                            </div>
                          );
                        })}
                        {(filteredDiaryEntries.length === 0) && (
                          <p className="text-gray-400 text-center py-8">查無符合條件的日記</p>
                        )}
                    </div>
                 </div>
              </div>
            )}
            
            {activeTab === 'todo' && (
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
            )}

            {activeTab === 'habit' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">習慣追蹤</h2>
                   <div className="flex items-center gap-4">
                      <button onClick={() => setHabitViewDate(d => new Date(d.setDate(d.getDate() - 7)))} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeft/></button>
                      <span className="font-semibold">{`${habitViewDate.getFullYear()} / ${habitViewDate.getMonth() + 1}`}</span>
                      <button onClick={() => setHabitViewDate(d => new Date(d.setDate(d.getDate() + 7)))} className="p-2 rounded-full hover:bg-gray-200"><ChevronRight/></button>
                   </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 sm:p-6">
                  <form onSubmit={addHabit} className="flex gap-4 mb-6 max-w-xl mx-auto">
                    <input type="text" placeholder="新增要養成的習慣..." value={habitForm.name} onChange={e => setHabitForm({name: e.target.value})} className="flex-grow border rounded-lg px-4 py-2"/>
                    <button type="submit" className="bg-purple-500 text-white px-6 py-2 rounded-lg font-semibold">新增</button>
                  </form>
                  <div className="overflow-x-auto mt-6">
                    <table className="w-full min-w-[500px] text-center border-collapse">
                      <thead>
                        <tr className="border-b-2">
                          <th className="py-2 px-2 font-semibold text-left">習慣</th>
                          <th className="py-2 px-2 font-semibold">本月完成率</th>
                          {Array.from({length: 7}).map((_, i) => {
                            const d = new Date(habitViewDate);
                            d.setDate(d.getDate() - d.getDay() + i);
                            return <th key={i} className="py-2 px-1 text-sm font-normal text-gray-600">{`${d.getMonth()+1}/${d.getDate()}`}</th>
                          })}
                          <th className="py-2 px-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(habits || []).map(habit => {
                          const stats = getHabitMonthStats(habit);
                          const percentColor = stats.percent >= 80 ? 'bg-green-400' : stats.percent >= 50 ? 'bg-yellow-400' : 'bg-red-300';
                          return (
                            <tr key={habit.id} className="border-b hover:bg-purple-100 transition-colors group">
                              {editingHabitId === habit.id ? (
                                <td colSpan="9" className="p-2">
                                  <div className="flex items-center gap-2">
                                    <input type="text" value={editingHabitName} onChange={e => setEditingHabitName(e.target.value)} className="flex-grow border rounded-lg px-3 py-1"/>
                                    <button onClick={updateHabit} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">儲存</button>
                                    <button onClick={() => setEditingHabitId(null)} className="px-3 py-1 bg-gray-200 rounded-md text-sm">取消</button>
                                  </div>
                                </td>
                              ) : (
                                <>
                                  <td className="py-3 px-2 text-left font-medium flex flex-col items-start gap-1">
                                    <span>{habit.name}</span>
                                    {/* 進度條與百分比 */}
                                    <div className="w-full bg-gray-200 rounded h-2 mt-1">
                                      <div className={`h-2 rounded ${percentColor} transition-all`} style={{width: `${stats.percent}%`}}></div>
                                    </div>
                                    <span className="text-xs text-gray-500 mt-1">{stats.completed} / {stats.total} 天（{stats.percent}%）</span>
                                  </td>
                                  <td className="py-3 px-2 align-middle">
                                    <span className={`font-bold ${stats.percent>=80?'text-green-600':stats.percent>=50?'text-yellow-600':'text-red-500'}`}>{stats.percent}%</span>
                                  </td>
                                  {Array.from({length: 7}).map((_, i) => {
                                    const d = new Date(habitViewDate);
                                    d.setDate(d.getDate() - d.getDay() + i);
                                    const dateString = d.toISOString().split('T')[0];
                                    const isCompleted = habit.completedDates.includes(dateString);
                                    return (
                                      <td key={i} className="py-3 px-1">
                                        <div className={`w-6 h-6 mx-auto rounded-md cursor-pointer transition-colors ${isCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300'}`} onClick={() => toggleHabit(habit, dateString)}></div>
                                      </td>
                                    )
                                  })}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setEditingHabitId(habit.id); setEditingHabitName(habit.name); }} className="p-1 text-gray-500 hover:text-blue-600"><Pencil size={16}/></button>
                                      <button onClick={() => deleteHabit(habit.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="max-w-3xl mx-auto p-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">日曆視覺化</h2>
                <CustomCalendar
                  value={calendarDate}
                  onChange={setCalendarDate}
                  tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    const dateStr = date.toISOString().split('T')[0];
                    const status = getDayStatus(dateStr);
                    return (
                      <div className="flex justify-center gap-1 mt-1">
                        {status.hasDiary && <span title="有日記">📝</span>}
                        {status.hasExpense && <span title="有支出">💰</span>}
                        {status.habitsDone > 0 && <span title="有習慣打卡">✅</span>}
                        {status.hasTodo && <span title="有待辦">📋</span>}
                      </div>
                    );
                  }}
                  onClickDay={(date) => {
                    setSelectedCalendarDay(date);
                    const dateStr = date.toISOString().split('T')[0];
                    const status = getDayStatus(dateStr);
                    alert(`【${dateStr}】\n日記：${status.hasDiary?'有':'無'}\n支出：${status.hasExpense?'有':'無'}\n習慣打卡：${status.habitsDone} 項\n待辦：${status.hasTodo?'有':'無'}`);
                  }}
                  className="mx-auto rounded-lg shadow"
                  locale="zh-TW"
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default ExpenseDiaryApp;
