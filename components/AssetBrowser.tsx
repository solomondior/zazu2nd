/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface Asset {
  name: string;
  path: string;
  category: 'backgrounds' | 'eyes' | 'hats' | 'extras' | 'characters';
}

interface AssetBrowserProps {
  onAssetSelect: (asset: Asset) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AssetBrowser: React.FC<AssetBrowserProps> = ({ onAssetSelect, isOpen, onClose }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'backgrounds' | 'eyes' | 'hats' | 'extras' | 'characters'>('backgrounds');
  const [loading, setLoading] = useState(false);

  const categories = [
    { key: 'backgrounds', label: 'Backgrounds', icon: '🖼️' },
    { key: 'eyes', label: 'Eyes & Glasses', icon: '👓' },
    { key: 'hats', label: 'Hats & Headwear', icon: '🎩' },
    { key: 'extras', label: 'Extras & Accessories', icon: '✨' },
    { key: 'characters', label: 'Characters', icon: '👤' }
  ] as const;

  // Load assets for the selected category
  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    loadAssets(selectedCategory);
  }, [selectedCategory, isOpen]);

  const loadAssets = async (category: string) => {
    try {
      // In a real implementation, you would fetch from your backend or use dynamic imports
      // For now, we'll use a static list based on the files we copied
      const assetMap: Record<string, Asset[]> = {
        backgrounds: [
          { name: 'Matrix Background', path: '/assets/backgrounds/matrix-5361690_1280.webp', category: 'backgrounds' },
          { name: 'Tropical Beach', path: '/assets/backgrounds/palm-tree-on-tropical-beach-600nw-2154569741.webp', category: 'backgrounds' },
          { name: 'Green Background', path: '/assets/backgrounds/green.jpg', category: 'backgrounds' },
          { name: 'Mars Landscape', path: '/assets/backgrounds/mars].jpg', category: 'backgrounds' },
          { name: 'CS:GO Dust 2', path: '/assets/backgrounds/csgo-dust-2-map-portion.avif', category: 'backgrounds' },
          { name: 'Stonks Chart', path: '/assets/backgrounds/stonks.webp', category: 'backgrounds' },
          { name: 'Businessman Zazu', path: '/assets/backgrounds/businessman-zazu-v0-tl153ilewywd1.webp', category: 'backgrounds' },
        ],
        eyes: [
          { name: 'Clout Goggles', path: '/assets/eyes/7-79919_cartoon-clout-goggles-transparent-hd-png-download-removebg-preview.png', category: 'eyes' },
          { name: '8-bit Glasses', path: '/assets/eyes/8bit-glasses.png', category: 'eyes' },
          { name: 'Aviator Sunglasses', path: '/assets/eyes/png-transparent-white-eyewear-shutter-shades-aviator-sunglasses-shutter-s-text-monochrome-glasses-removebg-preview.png', category: 'eyes' },
          { name: 'Sport Glasses', path: '/assets/eyes/pngtree-sport-glasses-mockup-mock-up-picture-image_7736765-removebg-preview.png', category: 'eyes' },
          { name: 'Sunglasses', path: '/assets/eyes/sunglasses-clipart-design-illustration-free-png-removebg-preview (1).png', category: 'eyes' },
        ],
        hats: [
          { name: 'Army Helmet', path: '/assets/hats/army-helmet.png', category: 'hats' },
          { name: 'Beanie', path: '/assets/hats/beanie.png', category: 'hats' },
          { name: 'Cowboy Hat', path: '/assets/hats/cowboy-hat.png', category: 'hats' },
          { name: 'MAGA Hat', path: '/assets/hats/maga-hat.png', category: 'hats' },
          { name: 'Viking Helmet', path: '/assets/hats/viking-helmets-with-transparent-cutout-free-png-removebg-preview.png', category: 'hats' },
          { name: 'Yankees Hat', path: '/assets/hats/yankees-hat.png', category: 'hats' },
        ],
        extras: [
          { name: 'Gold Chain', path: '/assets/extras/goldchain.png', category: 'extras' },
          { name: 'Smoke Effect', path: '/assets/extras/smoke.png', category: 'extras' },
          { name: 'Money Stack', path: '/assets/extras/stack-money-on-white-backround-260nw-71606644-removebg-preview.png', category: 'extras' },
          { name: 'Suit', path: '/assets/extras/suit.png', category: 'extras' },
        ],
        characters: [
          { name: 'Zazu', path: '/assets/characters/zazu.png', category: 'characters' },
          { name: 'Rigby', path: '/assets/characters/rigby.png', category: 'characters' },
          { name: 'Crying Face', path: '/assets/characters/crying.png', category: 'characters' },
        ]
      };

      setAssets(assetMap[category] || []);
    } catch (error) {
      console.error('Error loading assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetClick = (asset: Asset) => {
    onAssetSelect(asset);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Asset Browser</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors ${
                selectedCategory === category.key
                  ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {assets.map((asset, index) => (
                <div
                  key={index}
                  onClick={() => handleAssetClick(asset)}
                  className="group cursor-pointer bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-blue-500"
                >
                  <div className="aspect-square bg-gray-700 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={asset.path}
                      alt={asset.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="text-gray-400 text-sm">Image not found</div>';
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-300 text-center truncate">{asset.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-sm text-gray-400 text-center">
            Click on any asset to add it to your image
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssetBrowser;
