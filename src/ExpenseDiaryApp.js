import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Calendar, DollarSign, BookOpen, PlusCircle, TrendingUp, LogIn, LogOut, User, Cloud, AlertCircle, ListChecks, CheckSquare, Trash2, Search, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Firebase
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

// Utils
import { formatDate } from './utils';

// Layout Components
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';

// Tab Components
import ExpenseTab from './components/Expense/ExpenseTab';
import AnalysisTab from './components/Analysis/AnalysisTab';
import DiaryTab from './components/Diary/DiaryTab';
import TodoTab from './components/Todo/TodoTab';
import HabitTab from './components/Habit/HabitTab';
import CalendarTab from './components/Calendar/CalendarTab';

// Shared Components
import EditExpenseModal from './components/Shared/EditExpenseModal';
import DayDetailSidebar from './components/Calendar/DayDetailSidebar';

// Constants
const categories = ['餐飲', '交通', '購物', '娛樂', '醫療', '教育', '其他'];
const categoryColors = {
  '餐飲': '#FF6B6B', '交通': '#4ECDC4', '購物': '#45B7D1',
  '娛樂': '#96CEB4', '醫療': '#FFEAA7', '教育': '#DDA0DD', '其他': '#98D8C8'
};

const ExpenseDiaryApp = () => {
  // --- 狀態管理 ---
  const [activeTab, setActiveTab] = useState('expense');
  const [calendarDate, setCalendarDate] = useState(new Date());
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
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: '餐飲', description: '', date: formatDate(new Date()) });
  const [diaryForm, setDiaryForm] = useState({ content: '', date: formatDate(new Date()) });
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
  const [selectedMonth, setSelectedMonth] = useState(formatDate(new Date()).slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');

  // 日記搜尋與篩選狀態
  const [diarySearch, setDiarySearch] = useState('');
  const [diaryDateMode, setDiaryDateMode] = useState('date');
  const [diaryDateValue, setDiaryDateValue] = useState('');

  // 日記統計與回顧狀態
  const [randomDiary, setRandomDiary] = useState(null);
  const [showRandomDiary, setShowRandomDiary] = useState(false);
  const [expandedDiaryIds, setExpandedDiaryIds] = useState([]);

  // 分析頁面圖表型態與篩選狀態
  const [chartType, setChartType] = useState('pie');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('全部');
  const [expenseDateStart, setExpenseDateStart] = useState('');
  const [expenseDateEnd, setExpenseDateEnd] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const expensesPerPage = 10;

  // 日曆詳情側邊欄狀態
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedDateForDetail, setSelectedDateForDetail] = useState(null);

  // --- Callback 和計算函式 ---
  const getHabitMonthStats = useCallback((habit, viewDate) => {
    const targetMonthStr = formatDate(viewDate).slice(0, 7);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const completed = (habit.completedDates || []).filter(d => d.startsWith(targetMonthStr)).length;
    return {
      completed,
      total: daysInMonth,
      percent: daysInMonth > 0 ? Math.round((completed / daysInMonth) * 100) : 0
    };
  }, []);

  const getDayStatus = (dateStr) => {
    const hasDiary = diaryEntries.some(e => e.date === dateStr);
    const hasExpense = expenses.some(e => e.date === dateStr);
    const hasTodo = todos.some(e => e.createdAt && formatDate(new Date(e.createdAt.seconds*1000)) === dateStr);
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

  // --- UI 操作 ---
  const handleNavigateAndSetDate = (tab, date) => {
    setActiveTab(tab);
    if (tab === 'expense') {
      setExpenseForm(prev => ({ ...prev, date }));
    } else if (tab === 'diary') {
      setDiaryForm(prev => ({ ...prev, date }));
    }
    setIsDetailViewOpen(false);
  };

  // --- CRUD 操作 ---
  const getCollRef = (collName) => collection(db, 'users', user.uid, collName);

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

  const toggleDiaryExpand = (id) => {
    setExpandedDiaryIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  // --- 資料計算 (Memos) ---
  const expensesForSelectedDate = useMemo(() => {
    return (expenses || []).filter(e => e.date === expenseForm.date);
  }, [expenses, expenseForm.date]);

  const filteredAndSortedExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => {
        const descriptionMatch = e.description ? e.description.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const categoryMatch = e.category ? e.category.includes(searchTerm) : false;
        const dateMatch = e.date ? e.date.startsWith(selectedMonth) : false;
        const matchCategory = expenseCategoryFilter === '全部' || e.category === expenseCategoryFilter;
        const matchStart = expenseDateStart ? e.date >= expenseDateStart : true;
        const matchEnd = expenseDateEnd ? e.date <= expenseDateEnd : true;
        if (!searchTerm) {
          return dateMatch && matchCategory && matchStart && matchEnd;
        }
        return dateMatch && (descriptionMatch || categoryMatch) && matchCategory && matchStart && matchEnd;
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
  }, [expenses, selectedMonth, searchTerm, sortOrder, expenseCategoryFilter, expenseDateStart, expenseDateEnd]);

  const pieData = useMemo(() => {
    const categoryTotals = (filteredAndSortedExpenses || []).reduce((acc, expense) => {
      if (expense.category) {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      }
      return acc;
    }, {});
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      name: category, value: amount, color: categoryColors[category]
    }));
  }, [filteredAndSortedExpenses]);

  const pagedExpenses = useMemo(() => {
    const startIdx = (expensePage - 1) * expensesPerPage;
    return filteredAndSortedExpenses.slice(startIdx, startIdx + expensesPerPage);
  }, [filteredAndSortedExpenses, expensePage]);
  const totalExpensePages = Math.ceil(filteredAndSortedExpenses.length / expensesPerPage);

  const dailyTotals = useMemo(() => {
    const map = {};
    filteredAndSortedExpenses.forEach(e => {
      if (!map[e.date]) map[e.date] = 0;
      map[e.date] += e.amount;
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }, [filteredAndSortedExpenses]);
  const maxDay = dailyTotals.reduce((max, cur) => cur.amount > max.amount ? cur : max, { amount: 0, date: '' });
  const avgPerDay = dailyTotals.length ? (filteredAndSortedExpenses.reduce((sum, e) => sum + e.amount, 0) / dailyTotals.length) : 0;
  const categoryRank = useMemo(() => {
    const map = {};
    filteredAndSortedExpenses.forEach(e => {
      if (!map[e.category]) map[e.category] = 0;
      map[e.category] += e.amount;
    });
    return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredAndSortedExpenses]);

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

  const today = new Date();
  const thisMonthStr = formatDate(today).slice(0, 7);
  const diaryCountMonth = (diaryEntries || []).filter(entry => entry.date?.slice(0,7) === thisMonthStr).length;
  const diaryCountWeek = (diaryEntries || []).filter(entry => {
    if (!entry.date) return false;
    const d = new Date(entry.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekEnd = new Date(d);
    weekEnd.setDate(d.getDate() + (6 - d.getDay()));
    return d >= weekStart && d <= weekEnd;
  }).length;

  const handleRandomDiary = () => {
    if (!diaryEntries || diaryEntries.length === 0) return;
    const idx = Math.floor(Math.random() * diaryEntries.length);
    setRandomDiary(diaryEntries[idx]);
    setShowRandomDiary(true);
  };

  const detailsForSelectedDate = useMemo(() => {
    if (!selectedDateForDetail) return null;

    const dateStr = formatDate(selectedDateForDetail);

    const dailyExpenses = expenses.filter(e => e.date === dateStr);
    const dailyDiary = diaryEntries.find(e => e.date === dateStr);
    const dailyTodos = todos.filter(t => t.createdAt && formatDate(new Date(t.createdAt.seconds * 1000)) === dateStr);
    
    return {
      date: dateStr,
      expenses: dailyExpenses,
      diary: dailyDiary,
      todos: dailyTodos,
      habits: habits, // Pass all habits
    };
  }, [selectedDateForDetail, expenses, diaryEntries, todos, habits]);

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
      <EditExpenseModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingExpense={editingExpense}
        setEditingExpense={setEditingExpense}
        updateExpense={updateExpense}
        categories={categories}
      />
      <DayDetailSidebar 
        isOpen={isDetailViewOpen}
        onClose={() => setIsDetailViewOpen(false)}
        details={detailsForSelectedDate}
        handleNavigate={handleNavigateAndSetDate}
      />

      <div className="max-w-7xl mx-auto p-2 sm:p-4 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <Header user={user} handleLogout={handleLogout} />
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="p-4 sm:p-6">
            {activeTab === 'expense' && (
              <ExpenseTab 
                expenseForm={expenseForm} 
                setExpenseForm={setExpenseForm} 
                addExpense={addExpense} 
                expensesForSelectedDate={expensesForSelectedDate} 
                setEditingExpense={setEditingExpense} 
                setIsEditModalOpen={setIsEditModalOpen} 
                deleteExpense={deleteExpense}
                categories={categories}
              />
            )}
            {activeTab === 'chart' && (
              <AnalysisTab 
                pieData={pieData}
                categoryRank={categoryRank}
                dailyTotals={dailyTotals}
                filteredAndSortedExpenses={filteredAndSortedExpenses}
                pagedExpenses={pagedExpenses}
                totalExpensePages={totalExpensePages}
                expensePage={expensePage}
                setExpensePage={setExpensePage}
                chartType={chartType}
                setChartType={setChartType}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                expenseCategoryFilter={expenseCategoryFilter}
                setExpenseCategoryFilter={setExpenseCategoryFilter}
                expenseDateStart={expenseDateStart}
                setExpenseDateStart={setExpenseDateStart}
                expenseDateEnd={expenseDateEnd}
                setExpenseDateEnd={setExpenseDateEnd}
                avgPerDay={avgPerDay}
                maxDay={maxDay}
                categories={categories}
                setEditingExpense={setEditingExpense}
                setIsEditModalOpen={setIsEditModalOpen}
                deleteExpense={deleteExpense}
              />
            )}
            {activeTab === 'diary' && (
              <DiaryTab 
                diaryForm={diaryForm}
                setDiaryForm={setDiaryForm}
                addDiaryEntry={addDiaryEntry}
                diaryCountMonth={diaryCountMonth}
                diaryCountWeek={diaryCountWeek}
                handleRandomDiary={handleRandomDiary}
                showRandomDiary={showRandomDiary}
                randomDiary={randomDiary}
                setShowRandomDiary={setShowRandomDiary}
                filteredDiaryEntries={filteredDiaryEntries}
                diarySearch={diarySearch}
                setDiarySearch={setDiarySearch}
                diaryDateMode={diaryDateMode}
                setDiaryDateMode={setDiaryDateMode}
                diaryDateValue={diaryDateValue}
                setDiaryDateValue={setDiaryDateValue}
                expandedDiaryIds={expandedDiaryIds}
                toggleDiaryExpand={toggleDiaryExpand}
                editingDiaryId={editingDiaryId}
                setEditingDiaryId={setEditingDiaryId}
                editingDiaryContent={editingDiaryContent}
                setEditingDiaryContent={setEditingDiaryContent}
                updateDiary={updateDiary}
                deleteDiary={deleteDiary}
              />
            )}
            {activeTab === 'todo' && (
              <TodoTab 
                todos={todos}
                todoForm={todoForm}
                setTodoForm={setTodoForm}
                addTodo={addTodo}
                toggleTodo={toggleTodo}
                deleteTodo={deleteTodo}
              />
            )}
            {activeTab === 'habit' && (
              <HabitTab 
                habits={habits}
                habitForm={habitForm}
                setHabitForm={setHabitForm}
                addHabit={addHabit}
                habitViewDate={habitViewDate}
                setHabitViewDate={setHabitViewDate}
                getHabitMonthStats={getHabitMonthStats}
                editingHabitId={editingHabitId}
                setEditingHabitId={setEditingHabitId}
                editingHabitName={editingHabitName}
                setEditingHabitName={setEditingHabitName}
                updateHabit={updateHabit}
                deleteHabit={deleteHabit}
                toggleHabit={toggleHabit}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarTab 
                calendarDate={calendarDate}
                setCalendarDate={setCalendarDate}
                getDayStatus={getDayStatus}
                setSelectedDateForDetail={setSelectedDateForDetail}
                setIsDetailViewOpen={setIsDetailViewOpen}
              />
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default ExpenseDiaryApp;