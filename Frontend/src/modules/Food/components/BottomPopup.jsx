import React from 'react';

const BottomPopup = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full rounded-t-xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default BottomPopup;
