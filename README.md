# Expense Tracker (ET)

A modern expense tracker application built with React, TypeScript, and Vite.

## Features

- **Dashboard**: Overview of your monthly spending with charts and summaries
- **Transaction Management**: Add, edit, and delete income/expense transactions
- **People Ledger**: Track shared expenses and settlements between people
- **Budget Planner**: Create budgets with Needs/Wants/Investment categories
- **Budget Summary**: Visual breakdown of spending by category with overspend risk indicators
- **Settings**: Customize tags and categories

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- IndexedDB (idb) for local storage
- Recharts for data visualization
- Lucide React for icons

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/     # React components
│   ├── Dashboard.tsx
│   ├── BudgetPlanner.tsx
│   ├── TransactionForm.tsx
│   ├── TransactionList.tsx
│   ├── PeopleLedger.tsx
│   └── ...
├── services/
│   └── db.ts       # IndexedDB operations
├── types/
│   └── types.ts    # TypeScript type definitions
├── App.tsx
├── main.tsx
└── index.css
```

## License

MIT

