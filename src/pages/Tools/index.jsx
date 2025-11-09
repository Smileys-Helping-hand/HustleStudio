import React from 'react';
import { motion } from 'framer-motion';
import ROICalculator from './components/ROICalculator.jsx';
import MarginCalculator from './components/MarginCalculator.jsx';
import BreakEvenAnalyzer from './components/BreakEvenAnalyzer.jsx';
import CsvToWorkbook from './components/CsvToWorkbook.jsx';
import FinancialHealthChart from './components/FinancialHealthChart.jsx';

const ToolsHome = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Business Tools</h1>
        <p className="text-sm text-white/60">
          Financial utilities and exports purpose-built for Hustle Studio operators.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ROICalculator />
        <MarginCalculator />
        <BreakEvenAnalyzer />
        <CsvToWorkbook />
      </div>

      <FinancialHealthChart />
    </motion.div>
  );
};

export default ToolsHome;
