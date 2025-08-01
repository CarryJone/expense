# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
全端React應用程式：記帳日記本 v3，整合了支出管理、日記、待辦事項、習慣追蹤等多功能個人管理工具。

## Tech Stack
- **Frontend**: React 18.3.1, React Scripts 5.0.1
- **Styling**: TailwindCSS 3.4.17
- **Charts**: Recharts 2.12.7
- **UI Icons**: Lucide-react 0.400.0
- **Calendar**: React-calendar 6.0.0
- **Backend**: Firebase v10.12.2 (Firestore, Authentication)

## Architecture

### Main Components
- `ExpenseDiaryApp.js`: 單一整體組件，包含所有功能tab
- **Firebase Integration**: Real-time sync across multiple collections
- **Responsive Design**: Mobile-first architecture with responsive grid layouts

### Key Features by Tab
1. **Expense Tracking** (`expense`): 支出記錄與管理
2. **Analytics** (`chart`): 支出分析與視覺化圖表
3. **Diary** (`diary`): 日記書寫與回顧
4. **Todo List** (`todo`): 待辦事項管理
5. **Habit Tracking** (`habit`): 習慣養成與追蹤
6. **Calendar View** (`calendar`): 綜合日曆視覺化

### Data Structure
Firebase collections under `users/{userId}`:
- `expenses`: 支出記錄 {amount, category, description, date}
- `diaryEntries`: 日記條目 {content, date, createdAt}
- `todos`: 待辦事項 {text, completed, createdAt}
- `habits`: 習慣記錄 {name, completedDates[], createdAt}

## Common Commands

### Development Server
```bash
npm start           # 啟動開發服務器 http://localhost:3000
npm run build       # 建置生產版本
npm run test        # 執行測試
npm run eject       # 彈出Create React App（慎用）
```

### CSS/樣式管理
```bash
npm run tailwind:init    # 初始化Tailwind配置（僅首次）
```

### 全球環境要求
- Node.js 14+
- Firebase專案配置（須設置Firestore和Authentication）