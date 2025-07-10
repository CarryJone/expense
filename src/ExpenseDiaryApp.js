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

const ExpenseDiaryApp = () => {
  // --- 狀態管理 (State Management) ---
  const [activeTab, setActiveTab] = useState('expense');
  const [expenses, setExpenses] = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // 用戶和認證相關狀態
  const [user, setUser] = useState(null); // 當前登入的用戶
  const [isLoading, setIsLoading] = useState(true); // 初始載入狀態
  const [authIsReady, setAuthIsReady] = useState(false); // Firebase 認證是否已就緒
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
  
  // 靜態數據
  const categories = ['餐飲', '交通', '購物', '娛樂', '醫療', '教育', '其他'];
  const categoryColors = {
    '餐飲': '#FF6B6B', '交通': '#4ECDC4', '購物': '#45B7D1',
    '娛樂': '#96CEB4', '醫療': 's#FFEAA7', '教育': '#DDA0DD', '其他': '#98D8C8'
  };

  // --- Firebase 互動函式 ---

  // 載入用戶資料 (從 Firestore)
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
        // 如果是新用戶，Firestore 中還沒有資料
        console.log("No such document! Initializing for new user.");
        setSyncStatus('synced'); // 視為已同步，因為沒有東西可載入
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      setError('讀取資料失敗，請稍後重試。');
      setSyncStatus('offline');
    }
  }, []);
  
  // 同步用戶資料 (到 Firestore)
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

  // 處理登入/註冊
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

  // 處理登出
  const handleLogout = () => {
    signOut(auth);
  };

  // --- 副作用 (useEffect Hooks) ---

  // 監聽 Firebase 認證狀態變化
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        // 清理登出後的狀態
        setExpenses([]);
        setDiaryEntries([]);
        setSyncStatus('offline');
      }
      setAuthIsReady(true);
      setIsLoading(false);
    });
    // 組件卸載時取消監聽
    return () => unsub();
  }, [loadUserData]);

  // 防抖同步資料 (Debounced Sync)
  useEffect(() => {
    // 只有在認證就緒且用戶已登入的情況下才觸發同步
    if (authIsReady && user) {
      const timer = setTimeout(() => {
        syncUserData();
      }, 1500); // 延遲 1.5 秒同步，避免頻繁寫入
      return () => clearTimeout(timer);
    }
  }, [expenses, diaryEntries, user, authIsReady, syncUserData]);

  // 自動清理錯誤訊息
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // --- 核心業務邏輯 ---

  // 添加記帳記錄
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
    // 【優化】重置表單時保留日期，方便連續輸入
    setExpenseForm(prevForm => ({
      ...prevForm,
      amount: '',
      description: '',
      category: '餐飲'
    }));
    setError('');
  }, [expenseForm]);

  // 添加日記記錄
  const addDiaryEntry = useCallback(() => {
    if (!diaryForm.content.trim()) {
      setError('請輸入日記內容');
      return;
    }

    // 【優化】不再將支出快照存入日記，改為動態獲取
    const newEntry = {
      id: Date.now() + Math.random(),
      date: diaryForm.date,
      content: diaryForm.content
    };
    
    // 如果當天已有日記，則更新，否則新增
    setDiaryEntries(prev => {
      const existingEntryIndex = prev.findIndex(entry => entry.date === diaryForm.date);
      if (existingEntryIndex > -1) {
        const updatedEntries = [...prev];
        updatedEntries[existingEntryIndex] = newEntry;
        return updatedEntries;
      }
      return [...prev, newEntry];
    });

    // 【優化】重置表單時保留日期
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
  }, [expenses, selectedMonth]);

  const totalExpense = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);
  const formatMonth = useCallback((yearMonth) => `${yearMonth.slice(0,4)}年${yearMonth.slice(5,7)}月`, []);

  // --- 渲染 (Rendering) ---

  // 登入頁面
  if (!authIsReady || isLoading && !user) {
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
        {/* 頭部 */}
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

        {/* 標籤頁導航 */}
        <nav className="flex border-b bg-gray-50">
            {/* ... 導航按鈕 ... (此處省略以節省篇幅，內容與原版相同) */}
        </nav>

        <main className="p-6">
          {/* ... 各個標籤頁的內容 ... (此處省略，但已包含動態日記支出的修改) */}
          {/* 日記頁面 */}
          {activeTab === 'diary' && (
            <div className="space-y-6">
              {/* 寫日記表單 */}
              <div className="bg-green-50 rounded-lg p-6">
                {/* ... 表單內容 ... */}
              </div>

              {/* 日記瀏覽 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">選擇日期查看</h3>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md mb-4"/>
                
                {/* 【優化】動態顯示日記與當日支出 */}
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