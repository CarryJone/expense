import React from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';

const HabitTab = ({ 
  habits, 
  habitForm, 
  setHabitForm, 
  addHabit, 
  habitViewDate, 
  setHabitViewDate, 
  getHabitMonthStats, 
  editingHabitId, 
  setEditingHabitId, 
  editingHabitName, 
  setEditingHabitName, 
  updateHabit, 
  deleteHabit, 
  toggleHabit 
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">習慣追蹤</h2>
         <div className="flex items-center gap-4">
            <button onClick={() => setHabitViewDate(d => { const newDate = new Date(d); newDate.setDate(newDate.getDate() - 7); return newDate; })} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeft/></button>
            <span className="font-semibold">{`${habitViewDate.getFullYear()} / ${habitViewDate.getMonth() + 1}`}</span>
            <button onClick={() => setHabitViewDate(d => { const newDate = new Date(d); newDate.setDate(newDate.getDate() + 7); return newDate; })} className="p-2 rounded-full hover:bg-gray-200"><ChevronRight/></button>
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
                const stats = getHabitMonthStats(habit, habitViewDate);
                const percentColor = stats.percent >= 80 ? 'bg-green-400' : stats.percent >= 50 ? 'bg-yellow-400' : 'bg-red-300';
                return (
                  <tr key={habit.id} className="border-b hover:bg-purple-100 transition-colors group">
                    {editingHabitId === habit.id ? (
                      <td colSpan="10" className="p-2">
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
  );
};

export default HabitTab;
