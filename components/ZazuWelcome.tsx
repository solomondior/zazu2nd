/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface ZazuWelcomeProps {
  onStartEditing: () => void;
}

const ZazuWelcome: React.FC<ZazuWelcomeProps> = ({ onStartEditing }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-8">
      {/* Zazu Character Display */}
      <div className="text-center mb-12">
        <div className="relative mb-8">
          <img 
            src="/assets/characters/zazu.png" 
            alt="Zazu" 
            className="w-64 h-64 mx-auto object-contain animate-bounce"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="absolute -top-4 -right-4 text-6xl animate-pulse">✨</div>
          <div className="absolute -bottom-4 -left-4 text-4xl animate-pulse">🎨</div>
        </div>
        
        <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
          Zazu Cult
        </h1>
        <p className="text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Welcome to the ultimate Zazu editing experience! Transform our beloved character with AI-powered tools and an extensive collection of zazucult assets.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-bold text-white mb-2">AI-Powered Editing</h3>
          <p className="text-gray-300">Use natural language to transform Zazu with advanced AI technology</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="text-xl font-bold text-white mb-2">Asset Collection</h3>
          <p className="text-gray-300">Browse hundreds of backgrounds, accessories, and character elements</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="text-xl font-bold text-white mb-2">Creative Freedom</h3>
          <p className="text-gray-300">Unleash your creativity with filters, adjustments, and precise editing tools</p>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={onStartEditing}
        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-2xl py-6 px-12 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
      >
        Start Editing Zazu 🚀
      </button>

      {/* Footer */}
      <div className="mt-16 text-center text-gray-400">
        <p className="text-lg">Ready to create the ultimate Zazu masterpiece?</p>
        <p className="text-sm mt-2">Powered by AI • Enhanced with Zazucult Assets</p>
      </div>
    </div>
  );
};

export default ZazuWelcome;
