import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-slate-600 rounded-full" />
        <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  );
};

export default LoadingSpinner;
