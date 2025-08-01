import React from 'react';
import CustomCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { formatDate } from '../../utils';

const CalendarTab = ({ calendarDate, setCalendarDate, getDayStatus, setSelectedDateForDetail, setIsDetailViewOpen }) => {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">日曆視覺化</h2>
      <CustomCalendar
        value={calendarDate}
        onChange={setCalendarDate}
        tileContent={({ date, view }) => {
          if (view !== 'month') return null;
          const dateStr = formatDate(date);
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
          setSelectedDateForDetail(date);
          setIsDetailViewOpen(true);
        }}
        className="mx-auto rounded-lg shadow"
        locale="zh-TW"
      />
    </div>
  );
};

export default CalendarTab;
