import React from 'react';
import CustomCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../../styles/calendar-custom.css';
import { formatDate } from '../../utils';

const CalendarTab = ({ calendarDate, setCalendarDate, getDayStatus, setSelectedDateForDetail, setIsDetailViewOpen }) => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">📅 日曆總覽</h2>
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <CustomCalendar
          value={calendarDate}
          onChange={setCalendarDate}
          tileContent={({ date, view }) => {
            if (view !== 'month') return null;
            const dateStr = formatDate(date);
            const status = getDayStatus(dateStr);
            return (
              <div className="flex flex-col items-center mt-2 space-y-1">
                <div className="flex justify-center gap-2">
                  {status.hasDiary && <span title="有日記" className="text-lg hover:scale-125 transition-transform cursor-pointer">📝</span>}
                  {status.hasExpense && <span title="有支出" className="text-lg hover:scale-125 transition-transform cursor-pointer">💰</span>}
                </div>
                <div className="flex justify-center gap-2">
                  {status.habitsDone > 0 && <span title={`有 ${status.habitsDone} 個習慣打卡`} className="text-lg hover:scale-125 transition-transform cursor-pointer">✅</span>}
                  {status.hasTodo && <span title="有待辦" className="text-lg hover:scale-125 transition-transform cursor-pointer">📋</span>}
                </div>
              </div>
            );
          }}
          onClickDay={(date) => {
            setSelectedDateForDetail(date);
            setIsDetailViewOpen(true);
          }}
          className="calendar-custom mx-auto text-lg"
          locale="zh-TW"
        />
      </div>
    </div>
  );
};

export default CalendarTab;
