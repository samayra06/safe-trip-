
import React, { useState } from 'react';

interface PinInputModalProps {
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}

const MAX_PIN_LENGTH = 6;

const PinInputModal: React.FC<PinInputModalProps> = ({ onSubmit, onCancel }) => {
  const [pin, setPin] = useState('');

  const handleInput = (char: string) => {
    if (pin.length < MAX_PIN_LENGTH) {
      setPin(pin + char);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4 && pin.length <= MAX_PIN_LENGTH) {
        onSubmit(pin);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm mx-4">
        <form onSubmit={handleFormSubmit}>
            <h2 className="text-2xl font-bold text-center mb-4">Enter PIN (4-6 digits)</h2>
            <div className="flex justify-center items-center space-x-2 mb-6">
            {[...Array(MAX_PIN_LENGTH)].map((_, i) => (
                <div key={i} className={`w-10 h-12 border-2 rounded-md flex items-center justify-center text-3xl ${pin.length > i ? 'border-blue-500' : 'border-gray-600'}`}>
                {pin[i] ? '•' : ''}
                </div>
            ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
                <button type="button" key={i+1} onClick={() => handleInput(String(i+1))} className="text-3xl font-bold bg-gray-700 rounded-lg p-4 aspect-square hover:bg-gray-600">
                {i+1}
                </button>
            ))}
            <button type="button" onClick={onCancel} className="text-lg font-bold text-red-400 bg-gray-700 rounded-lg p-4 hover:bg-gray-600">
                Cancel
            </button>
             <button type="button" onClick={() => handleInput('0')} className="text-3xl font-bold bg-gray-700 rounded-lg p-4 aspect-square hover:bg-gray-600">
                0
            </button>
            <button type="button" onClick={handleDelete} className="text-lg font-bold bg-gray-700 rounded-lg p-4 hover:bg-gray-600">
                Delete
            </button>
            </div>
             <button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 text-white font-bold py-3 rounded-lg" disabled={pin.length < 4}>
                Confirm
            </button>
        </form>
      </div>
    </div>
  );
};

export default PinInputModal;