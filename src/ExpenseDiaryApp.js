import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, DollarSign, BookOpen, PlusCircle, TrendingUp, LogIn, LogOut, User, Cloud, AlertCircle } from 'lucide-react';

// 引入 Firebase 的認證和資料庫實例
import { auth, db } from './firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// 【修正】將不會改變的常數移到組件外部，避免在每次渲染時重新建立，提升效能
const categories = ['餐飲', '交通', '購物', '娛樂', '醫療', '教育', '其他'];
const categoryColors = {
  '餐飲': '#FF6B6B', '交通': '#4ECDC4', '購物': '#45B7D1',
  '娛樂': '#96CEB4', '醫療': '#FFEAA7', '教育': '#DDA0DD', '其他': '#98D8C8' // 【修正】移除了 '醫療' 色碼中多餘的 's'
};

const ExpenseDiaryApp = () => {
  // --- 狀態管理 (State Management) ---
  const [activeTab, setActiveTab] = useState('expense');
  const [expenses, setExpenses] = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // 用戶和認證相關狀態
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authIsReady, setAuthIsReady] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // UI 狀態
  const [syncStatus, setSyncStatus] = useState('offline');
  const [error, setError] = useState('');

  // 表單狀態
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: '餐飲',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [diaryForm, setDiaryForm] = useState({
    content: '',
    date: new Date().toISOString().split('T')[0]
  });

  // --- Firebase 互動函式 ---

  const loadUserData = useCallback(async (currentUser) => {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setExpenses(data.expenses || []);
        setDiaryEntries(data.diaryEntries || []);
        setSyncStatus('synced');
      } else {
        console.log("No such document! Initializing for new user.");
        setSyncStatus('synced');
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      setError('讀取資料失敗，請稍後重試。');
      setSyncStatus('offline');
    }
  }, []); // 依賴為空，因為 db 是從外部引入的穩定實例
  
  const syncUserData = useCallback(async () => {
    if (!user) return;
    setSyncStatus('syncing');
    const dataToSync = {
      expenses,
      diaryEntries,
      lastSync: new Date().toISOString()
    };
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, dataToSync);
      setSyncStatus('synced');
    } catch (err) {
      console.error("Error syncing data:", err);
      setError('同步資料失敗！');
      setSyncStatus('offline');
    }
  }, [user, expenses, diaryEntries]);
  
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

  // --- 副作用 (useEffect Hooks) ---

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        setExpenses([]);
        setDiaryEntries([]);
        setSyncStatus('offline');
      }
      setAuthIsReady(true);
      setIsLoading(false);
    });
    return () => unsub();
  }, [loadUserData]);

  useEffect(() => {
    if (authIsReady && user) {
      const timer = setTimeout(() => {
        syncUserData();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [expenses, diaryEntries, user, authIsReady, syncUserData]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // --- 核心業務邏輯 ---

  const addExpense = useCallback(() => {
    if (!expenseForm.amount) {
      setError('請填寫金額');
      return;
    }
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('請輸入有效的正數金額');
      return;
    }
    const newExpense = {
      id: Date.now() + Math.random(),
      ...expenseForm,
      amount
    };
    setExpenses(prev => [...prev, newExpense]);
    setExpenseForm(prevForm => ({
      ...prevForm,
      amount: '',
      description: '',
      category: '餐飲'
    }));
    setError('');
  }, [expenseForm]);

  const addDiaryEntry = useCallback(() => {
    if (!diaryForm.content.trim()) {
      setError('請輸入日記內容');
      return;
    }
    const newEntry = {
      id: Date.now() + Math.random(),
      date: diaryForm.date,
      content: diaryForm.content
    };
    setDiaryEntries(prev => {
      const existingEntryIndex = prev.findIndex(entry => entry.date === diaryForm.date);
      if (existingEntryIndex > -1) {
        const updatedEntries = [...prev];
        updatedEntries[existingEntryIndex] = newEntry;
        return updatedEntries;
      }
      return [...prev, newEntry];
    });
    setDiaryForm(prevForm => ({
      ...prevForm,
      content: ''
    }));
    setError('');
  }, [diaryForm]);

  // --- 資料計算與格式化 (Memoized) ---
  const getDayExpenses = useCallback((date) => expenses.filter(e => e.date === date), [expenses]);
  const getDayDiary = useCallback((date) => diaryEntries.find(entry => entry.date === date), [diaryEntries]);

  const pieData = useMemo(() => {
    const monthlyExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
    const categoryTotals = monthlyExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      name: category,
      value: amount,
      color: categoryColors[category]
    }));
  }, [expenses, selectedMonth]); // 【修正】移除 categoryColors，因為它已經在組件外部，不會改變

  const totalExpense = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);
  const formatMonth = useCallback((yearMonth) => `${yearMonth.slice(0,4)}年${yearMonth.slice(5,7)}月`, []);

  // --- 渲染 (Rendering) ---

  // 【修正】為載入邏輯加上括號，避免運算子混用
  if (!authIsReady || (isLoading && !user)) {
    return <div className="flex justify-center items-center h-screen">載入中...</div>;
  }
  
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <Cloud className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">記帳日記</h1>
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
            <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="請輸入電子郵件" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="請輸入密碼" required />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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

  // 主應用頁面
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">記帳日記本</h1>
                <p className="text-blue-100 mt-1">管理支出，記錄生活</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Cloud className={`w-4 h-4 ${syncStatus === 'synced' ? 'text-green-300' : syncStatus === 'syncing' ? 'text-yellow-300 animate-pulse' : 'text-red-300'}`} />
                <span className="text-blue-100">{syncStatus === 'synced' ? '已同步' : syncStatus === 'syncing' ? '同步中...' : '離線'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm text-blue-100 hidden sm:inline">{user.email}</span>
                <button onClick={handleLogout} className="ml-2 px-3 py-1 bg-white bg-opacity-20 rounded-md hover:bg-opacity-30 transition-colors text-sm flex items-center gap-1">
                  <LogOut className="w-3 h-3" />登出
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav className="flex border-b bg-gray-50">
          <button onClick={() => setActiveTab('expense')} className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'expense' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
            <PlusCircle className="w-5 h-5" />記帳
          </button>
          <button onClick={() => setActiveTab('chart')} className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'chart' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
            <TrendingUp className="w-5 h-5" />圖表分析
          </button>
          <button onClick={() => setActiveTab('diary')} className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'diary' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
            <BookOpen className="w-5 h-5" />日記
          </button>
        </nav>

        <main className="p-6">
          {activeTab === 'expense' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-800">新增支出</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">金額</label>
                    <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="請輸入金額" min="0" step="0.01"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">類別</label>
                    <select value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
                    <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">備註</label>
                    <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="備註說明"/>
                  </div>
                </div>
                <button onClick={addExpense} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">新增支出</button>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">近期支出</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {expenses.length === 0 ? (<p className="text-gray-500 text-center py-4">還沒有支出記錄</p>) : (
                    expenses.slice(-5).reverse().map(expense => (
                      <div key={expense.id} className="flex justify-between items-center bg-white p-3 rounded border">
                        <div>
                          <span className="font-medium">{expense.category}</span>
                          {expense.description && <span className="text-gray-500 ml-2">{expense.description}</span>}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-600">-NT$ {expense.amount.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{expense.date}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">月度支出分析</h2>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <label className="text-sm font-medium text-gray-700">選擇月份：</label>
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <p className="text-gray-600">{formatMonth(selectedMonth)} 總支出：NT$ {totalExpense.toLocaleString()}</p>
              </div>
              
              {pieData.length > 0 ? (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={120} fill="#8884d8" dataKey="value">
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">NT$ {item.value.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{((item.value / totalExpense) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>{formatMonth(selectedMonth)} 還沒有支出記錄</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diary' && (
            <div className="space-y-6">
              <div className="bg-green-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-green-800">寫日記</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
                    <input type="date" value={diaryForm.date} onChange={(e) => setDiaryForm({...diaryForm, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">日記內容</label>
                    <textarea value={diaryForm.content} onChange={(e) => setDiaryForm({...diaryForm, content: e.target.value})} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="記錄今天的心情和想法..."/>
                  </div>
                  <button onClick={addDiaryEntry} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">保存日記</button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">選擇日期查看</h3>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md mb-4"/>
                
                {(() => {
                  const diary = getDayDiary(selectedDate);
                  const dailyExpenses = getDayExpenses(selectedDate);
                  if (!diary && dailyExpenses.length === 0) {
                    return <p className="text-gray-500 text-center py-4">這天沒有日記和支出記錄。</p>;
                  }
                  return (
                    <div className="bg-white p-4 rounded-lg border">
                      {diary ? (
                        <>
                          <h4 className="font-semibold text-gray-800 mb-2"><Calendar className="w-4 h-4 inline mr-1" />{selectedDate} 日記</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{diary.content}</p>
                        </>
                      ) : <p className="text-gray-500">這天沒有寫日記。</p>}
                      
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-semibold text-gray-700 mb-2">當日支出</h5>
                        {dailyExpenses.length > 0 ? (
                          <ul className="space-y-2">
                            {dailyExpenses.map(exp => (
                              <li key={exp.id} className="flex justify-between">
                                <span>{exp.category}{exp.description && ` (${exp.description})`}</span>
                                <span className="font-medium text-red-600">-NT$ {exp.amount.toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-gray-500">這天沒有支出記錄。</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ExpenseDiaryApp;