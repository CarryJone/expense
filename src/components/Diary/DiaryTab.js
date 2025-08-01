import React from 'react';
import { Pencil, Trash2, X } from 'lucide-react';

const DiaryTab = ({
  diaryForm,
  setDiaryForm,
  addDiaryEntry,
  diaryCountMonth,
  diaryCountWeek,
  handleRandomDiary,
  showRandomDiary,
  randomDiary,
  setShowRandomDiary,
  filteredDiaryEntries,
  diarySearch,
  setDiarySearch,
  diaryDateMode,
  setDiaryDateMode,
  diaryDateValue,
  setDiaryDateValue,
  expandedDiaryIds,
  toggleDiaryExpand,
  editingDiaryId,
  setEditingDiaryId,
  editingDiaryContent,
  setEditingDiaryContent,
  updateDiary,
  deleteDiary
}) => {
  return (
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
  );
};

export default DiaryTab;
