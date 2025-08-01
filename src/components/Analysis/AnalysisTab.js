import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Search, Pencil, Trash2 } from 'lucide-react';

const AnalysisTab = ({ 
  pieData, 
  categoryRank,
  dailyTotals,
  filteredAndSortedExpenses,
  pagedExpenses,
  totalExpensePages,
  expensePage,
  setExpensePage,
  chartType, 
  setChartType, 
  selectedMonth, 
  setSelectedMonth,
  searchTerm,
  setSearchTerm,
  expenseCategoryFilter,
  setExpenseCategoryFilter,
  expenseDateStart,
  setExpenseDateStart,
  expenseDateEnd,
  setExpenseDateEnd,
  avgPerDay,
  maxDay,
  categories,
  setEditingExpense,
  setIsEditModalOpen,
  deleteExpense
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">支出分析</h2>
        {/* 月份選擇器 */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">選擇月份：</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
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
          <p className="text-center font-semibold text-lg mt-2">總支出: NT$ {filteredAndSortedExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
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
  );
};

export default AnalysisTab;
