import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const GettingStartedGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Show guide on first visit or if user hasn't dismissed it
    const hasSeenGuide = localStorage.getItem('hasSeenGettingStartedGuide');
    if (!hasSeenGuide) {
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenGettingStartedGuide', 'true');
    setIsOpen(false);
  };

  const steps = [
    {
      title: 'Welcome to Hustle Studio!',
      description: 'Your all-in-one business management platform',
      features: [
        'Create professional invoices',
        'Manage inventory & projects',
        'Track analytics & insights',
        'Collaborate with your team',
      ],
    },
    {
      title: 'Create Your First Invoice',
      description: 'Generate beautiful, branded invoices in minutes',
      action: 'Go to Invoices',
      route: '/crm/invoices',
      features: [
        'Live preview as you type',
        'Customize colors and logo',
        'Add line items easily',
        'Download as PDF',
      ],
    },
    {
      title: 'Manage Your Business',
      description: 'Everything you need in one place',
      features: [
        'Dashboard: Overview of your metrics',
        'Inventory: Track products & stock',
        'Reports: Analyze your data',
        'CRM: Manage clients & leads',
      ],
    },
  ];

  const currentStepData = steps[currentStep];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-6 top-6 z-10 text-white/60 transition hover:text-white"
          >
            <FiX size={24} />
          </button>

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Step indicator */}
            <div className="mb-8 flex items-center justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500'
                      : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Header */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                {currentStepData.title}
              </h2>
              <p className="mt-3 text-lg text-white/70">
                {currentStepData.description}
              </p>
            </div>

            {/* Features */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {currentStepData.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <FiCheckCircle className="mt-0.5 flex-shrink-0 text-green-400" size={20} />
                  <span className="text-sm text-white/90">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {currentStep < steps.length - 1 ? (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Skip Tour
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600"
                  >
                    Next
                    <FiArrowRight className="ml-2 inline" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Close
                  </button>
                  {currentStepData.route && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(currentStepData.route);
                        handleClose();
                      }}
                      className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600"
                    >
                      {currentStepData.action || 'Get Started'}
                      <FiArrowRight className="ml-2 inline" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Decorative gradient */}
          <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GettingStartedGuide;
