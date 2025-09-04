/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import AssetOverlay from './components/AssetOverlay';
import { UndoIcon, RedoIcon, EyeIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

  type Tab = 'retouch' | 'adjust' | 'filters' | 'backgrounds' | 'eyes' | 'hats' | 'accessories';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [assetOverlays, setAssetOverlays] = useState<Array<{
    id: string;
    src: string;
    name: string;
    category: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    zIndex: number;
  }>>([]);
  const [isEditingAssets, setIsEditingAssets] = useState<boolean>(false);
  const imageDisplayRef = useRef<HTMLDivElement>(null);
  
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);

  const loadZazuImage = useCallback(async () => {
    console.log('loadZazuImage called');
    try {
      setIsLoading(true);
      setError(null);
      
      // Load Zazu image from assets
      const response = await fetch('/assets/characters/zazu.png');
      console.log('Fetch response:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load Zazu image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created:', blob.size, 'bytes');
      
      const zazuFile = new File([blob], 'zazu.png', { type: 'image/png' });
      console.log('File created:', zazuFile.name, zazuFile.size, 'bytes');
      
      setHistory([zazuFile]);
      setHistoryIndex(0);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setActiveTab('retouch');
      setHasStarted(true);
      console.log('Zazu image loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Zazu image';
      setError(errorMessage);
      console.error('Error loading Zazu image:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to automatically load Zazu when the app starts
  useEffect(() => {
    console.log('useEffect triggered - hasStarted:', hasStarted, 'history.length:', history.length);
    if (!hasStarted && history.length === 0) {
      console.log('Starting to load Zazu...');
      loadZazuImage();
    }
  }, [hasStarted, history.length, loadZazuImage]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
  }, []);

  const handleDownload = useCallback(() => {
    if (!imageDisplayRef.current) return;
    
    // Create a canvas to capture the entire composition
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match the display container
    canvas.width = 400;
    canvas.height = 400;
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Function to load and draw an image
    const drawImage = (src: string, x: number, y: number, width: number, height: number, rotation: number = 0, opacity: number = 1) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save();
          ctx.globalAlpha = opacity;
          
          if (rotation !== 0) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
          }
          
          ctx.drawImage(img, x, y, width, height);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve(); // Skip failed images
        img.src = src;
      });
    };
    
    // Draw all elements in the correct order
    const drawComposition = async () => {
      // 1. Draw background assets first
      const backgroundAssets = assetOverlays.filter(overlay => overlay.category === 'backgrounds');
      for (const asset of backgroundAssets) {
        await drawImage(asset.src, asset.x, asset.y, asset.width, asset.height, asset.rotation, asset.opacity);
      }
      
      // 2. Draw Zazu at the bottom
      if (currentImageUrl) {
        const zazuSize = 380; // Increased size
        const zazuX = (canvas.width - zazuSize) / 2;
        const zazuY = canvas.height - zazuSize; // Position at bottom
        await drawImage(currentImageUrl, zazuX, zazuY, zazuSize, zazuSize);
      }
      
      // 3. Draw foreground assets last
      const foregroundAssets = assetOverlays.filter(overlay => overlay.category !== 'backgrounds');
      for (const asset of foregroundAssets) {
        await drawImage(asset.src, asset.x, asset.y, asset.width, asset.height, asset.rotation, asset.opacity);
      }
      
      // Download the canvas
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `zazu-composition-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
      });
    };
    
    drawComposition();
  }, [currentImageUrl, assetOverlays]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    // Get click position relative to the image
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Calculate the actual rendered image dimensions
    const { naturalWidth, naturalHeight } = img;
    const renderedWidth = img.offsetWidth;
    const renderedHeight = img.offsetHeight;
    
    // Calculate scale factors based on actual rendered size
    const scaleX = naturalWidth / renderedWidth;
    const scaleY = naturalHeight / renderedHeight;

    // Convert click position to image coordinates
    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    // For display hotspot, calculate position relative to the imageDisplay container
    if (imageDisplayRef.current) {
      const containerRect = imageDisplayRef.current.getBoundingClientRect();
      const containerOffsetX = e.clientX - containerRect.left;
      const containerOffsetY = e.clientY - containerRect.top;
      setDisplayHotspot({ x: containerOffsetX, y: containerOffsetY });
    } else {
      // Fallback to image coordinates
      setDisplayHotspot({ x: offsetX, y: offsetY });
    }

    console.log('Click details:', {
      offsetX, offsetY,
      renderedWidth, renderedHeight,
      naturalWidth, naturalHeight,
      scaleX, scaleY,
      originalX, originalY,
      imgRect: rect
    });

    setEditHotspot({ x: originalX, y: originalY });
};

  const handleAssetSelect = useCallback((asset: { name: string; path: string; category: string }) => {
    if (!currentImage) {
      setError('No image loaded to add assets to.');
      return;
    }
    
    // Determine z-index based on category
    let zIndex = 1; // Default for backgrounds (behind Zazu)
    if (asset.category === 'eyes' || asset.category === 'hats' || asset.category === 'accessories') {
      zIndex = 1000; // In front of Zazu
    } else if (asset.category === 'characters') {
      zIndex = 500; // Between background and Zazu
    }
    
    // Create a new asset overlay
    const newOverlay = {
      id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      src: asset.path,
      name: asset.name,
      category: asset.category,
      x: asset.category === 'backgrounds' ? 0 : 50, // Backgrounds start at origin
      y: asset.category === 'backgrounds' ? 0 : 50,
      width: asset.category === 'backgrounds' ? 400 : 100, // Backgrounds use canvas size
      height: asset.category === 'backgrounds' ? 400 : 100,
      rotation: 0,
      opacity: 1,
      zIndex: zIndex
    };
    
    setAssetOverlays(prev => [...prev, newOverlay]);
    setIsEditingAssets(true);
  }, [currentImage]);

  const handleUpdateOverlay = useCallback((id: string, updates: Partial<typeof assetOverlays[0]>) => {
    setAssetOverlays(prev => prev.map(overlay => 
      overlay.id === id ? { ...overlay, ...updates } : overlay
    ));
  }, []);

  const handleRemoveOverlay = useCallback((id: string) => {
    setAssetOverlays(prev => prev.filter(overlay => overlay.id !== id));
  }, []);

  const handleAddOverlay = useCallback((overlay: typeof assetOverlays[0]) => {
    setAssetOverlays(prev => [...prev, overlay]);
  }, []);

  // Early returns for different states
    if (error) {
       return (
      <div className="min-h-screen text-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-center">
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }
  
  if (!hasStarted) {
    return (
      <div className="min-h-screen text-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-center">
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <div className="relative w-[500px] h-[500px] mx-auto bg-gray-800 rounded-xl flex items-center justify-center">
              {isLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
                  <p className="text-gray-400">Loading Zazu...</p>
                  <p className="text-sm text-gray-500 mt-2">Setting up your AI canvas...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Zazu Cult AI Canvas</h2>
                  <p className="text-gray-400 mb-4">Ready to create amazing Zazu art!</p>
                  <button
                    onClick={loadZazuImage}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Load Zazu
                  </button>
                </div>
              )}
            </div>
            
            {/* Show the toolbar even when loading */}
            <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
              {(['retouch', 'adjust', 'filters', 'backgrounds', 'eyes', 'hats', 'accessories'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setIsEditingAssets(false); // Turn off editing mode when switching tabs
                  }}
                  className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                    activeTab === tab 
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab === 'backgrounds' ? 'Backgrounds' : 
                   tab === 'eyes' ? 'Eyes' : 
                   tab === 'hats' ? 'Hats' : 
                   tab === 'accessories' ? 'Accessories' : tab}
                </button>
              ))}
            </div>
          </div>
        </main>
          </div>
        );
    }
    
    if (!currentImageUrl) {
    return (
      <div className="min-h-screen text-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-center">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Loading Zazu...</p>
          </div>
        </main>
      </div>
    );
    }

    const imageDisplay = (
    <div ref={imageDisplayRef} className="relative mx-auto overflow-hidden rounded-xl bg-white border-2 border-gray-300" style={{ width: '400px', height: '400px' }}>
      {/* Background assets (behind Zazu) - canvas size matches background */}
      {assetOverlays.filter(overlay => overlay.category === 'backgrounds').map((overlay) => (
        <div
          key={overlay.id}
          className="absolute inset-0"
          style={{
            zIndex: overlay.zIndex,
            opacity: overlay.opacity,
            transform: `rotate(${overlay.rotation}deg)`
          }}
        >
          <img
            src={overlay.src}
            alt={overlay.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ))}
      
      {/* Zazu image - positioned at bottom */}
      <div className="absolute inset-0 flex items-end justify-center z-20">
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl}
          alt="Zazu"
            onClick={handleImageClick}
          className={`object-contain transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
          style={{ 
            width: '380px',
            height: '380px'
          }}
        />
      </div>
      
      {/* Foreground assets (in front of Zazu) */}
      {assetOverlays.filter(overlay => overlay.category !== 'backgrounds').length > 0 && (
        <div className="absolute top-0 left-0 w-full h-full z-30">
          <AssetOverlay
            overlays={assetOverlays.filter(overlay => overlay.category !== 'backgrounds')}
            onUpdateOverlay={handleUpdateOverlay}
            onRemoveOverlay={handleRemoveOverlay}
            onAddOverlay={handleAddOverlay}
            isEditing={isEditingAssets}
            onSetEditing={setIsEditingAssets}
          />
        </div>
      )}
      
      {/* Display hotspot for retouch feedback */}
      {displayHotspot && !isLoading && activeTab === 'retouch' && (
        <div 
          className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-40"
          style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
        >
          <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
        </div>
      )}
    </div>
  );

    return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}
            
            {imageDisplay}
        </div>
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            {(['retouch', 'adjust', 'filters', 'backgrounds', 'eyes', 'hats', 'accessories'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setIsEditingAssets(false); // Turn off editing mode when switching tabs
                }}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                {tab === 'backgrounds' ? 'Backgrounds' : 
                 tab === 'eyes' ? 'Eyes' : 
                 tab === 'hats' ? 'Hats' : 
                 tab === 'accessories' ? 'Accessories' : tab}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-400">
                  {editHotspot ? 'Great! Now describe how you want to edit Zazu.' : 'Click an area on Zazu to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                    placeholder={editHotspot ? "e.g., 'make Zazu wear a cowboy hat' or 'change Zazu's expression to happy'" : "First click a point on Zazu"}
                            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
            {activeTab === 'backgrounds' && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Backgrounds</h3>
                  <p className="text-gray-400">Click on any background to add it to Zazu</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl">
                  {[
                    { name: 'Matrix', path: '/assets/backgrounds/matrix-5361690_1280.webp' },
                    { name: 'CSGO Dust', path: '/assets/backgrounds/csgo-dust-2-map-portion.avif' },
                    { name: 'Stonks', path: '/assets/backgrounds/stonks.webp' },
                    { name: 'Business', path: '/assets/backgrounds/businessman-zazu-v0-tl153ilewywd1.webp' },
                    { name: 'Green', path: '/assets/backgrounds/green.jpg' },
                    { name: 'Mars', path: '/assets/backgrounds/mars].jpg' },
                    { name: 'Palm Tree', path: '/assets/backgrounds/palm-tree-on-tropical-beach-600nw-2154569741.webp' },
                    { name: 'Financial', path: '/assets/backgrounds/pngtree-financial-market-candlestick-chart-depicting-forex-trends-with-red-and-green-candles-photo-image_29955316.jpg' },
                    { name: 'Abstract 1', path: '/assets/backgrounds/28de83405317503236d1625e11031acc.jpg' },
                    { name: 'Abstract 2', path: '/assets/backgrounds/440557281.jpg' },
                    { name: 'Abstract 3', path: '/assets/backgrounds/7mjhif166f641.jpg' },
                    { name: 'Download', path: '/assets/backgrounds/download.png' },
                    { name: 'HQ 720', path: '/assets/backgrounds/hq720.jpg' },
                    { name: '1000 Yard Stare', path: '/assets/backgrounds/i-give-up-can-someone-make-this-have-the-1000-yard-stare-v0-0xk9rgdol35e1.png' },
                    { name: 'Etsy Design', path: '/assets/backgrounds/il_570xN.3774897538_agib.webp' },
                    { name: 'Nature Photo', path: '/assets/backgrounds/photo-1465101162946-4377e57745c3.jpg' },
                    { name: 'US Flag', path: '/assets/backgrounds/US-15.jpg' },
                    { name: 'Gradient', path: '/assets/backgrounds/djnu1oa-147970c1-d3e3-4ade-9d6e-34d11ff71c31.png' }
                  ].map((asset) => (
                    <button
                      key={asset.name}
                      onClick={() => handleAssetSelect({ ...asset, category: 'backgrounds' })}
                      className="group relative overflow-hidden rounded-lg border-2 border-gray-600 hover:border-blue-500 transition-all duration-200 hover:scale-105"
                    >
                      <img
                        src={asset.path}
                        alt={asset.name}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iODAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">{asset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'eyes' && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Eyes</h3>
                  <p className="text-gray-400">Click on any eyewear to add it to Zazu</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
                  {[
                    { name: 'Clout Goggles', path: '/assets/eyes/7-79919_cartoon-clout-goggles-transparent-hd-png-download-removebg-preview.png' },
                    { name: '8bit Glasses', path: '/assets/eyes/8bit-glasses.png' },
                    { name: 'Shutter Shades', path: '/assets/eyes/png-transparent-white-eyewear-shutter-shades-aviator-sunglasses-shutter-s-text-monochrome-glasses-removebg-preview.png' },
                    { name: 'Eye Glass', path: '/assets/eyes/pngtree-eye-glass-vector-png-image_4485520-removebg-preview.png' },
                    { name: 'Sport Glasses', path: '/assets/eyes/pngtree-sport-glasses-mockup-mock-up-picture-image_7736765-removebg-preview.png' },
                    { name: 'Design Glasses', path: '/assets/eyes/rBVaJFl_9t-AYmVHAAEE3Xj8F_Q250-removebg-preview.png' },
                    { name: 'Sunglasses', path: '/assets/eyes/sunglasses-clipart-design-illustration-free-png-removebg-preview (1).png' }
                  ].map((asset) => (
                    <button
                      key={asset.name}
                      onClick={() => handleAssetSelect({ ...asset, category: 'eyes' })}
                      className="group relative overflow-hidden rounded-lg border-2 border-gray-600 hover:border-blue-500 transition-all duration-200 hover:scale-105"
                    >
                      <img
                        src={asset.path}
                        alt={asset.name}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iODAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">{asset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'hats' && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Hats</h3>
                  <p className="text-gray-400">Click on any hat to add it to Zazu</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
                  {[
                    { name: 'Army Helmet', path: '/assets/hats/army-helmet.png' },
                    { name: 'Beanie', path: '/assets/hats/beanie.png' },
                    { name: 'Cowboy Hat', path: '/assets/hats/cowboy-hat.png' },
                    { name: 'MAGA Hat', path: '/assets/hats/maga-hat.png' },
                    { name: 'Blazer', path: '/assets/hats/pngtree-blue-blazer-red-twill-tie-png-image_15403080.png' },
                    { name: 'Random Hat', path: '/assets/hats/random-hat.png' },
                    { name: 'Viking Helmet', path: '/assets/hats/viking-helmets-with-transparent-cutout-free-png-removebg-preview.png' },
                    { name: 'Yankees Hat', path: '/assets/hats/yankees-hat.png' }
                  ].map((asset) => (
                    <button
                      key={asset.name}
                      onClick={() => handleAssetSelect({ ...asset, category: 'hats' })}
                      className="group relative overflow-hidden rounded-lg border-2 border-gray-600 hover:border-blue-500 transition-all duration-200 hover:scale-105"
                    >
                      <img
                        src={asset.path}
                        alt={asset.name}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iODAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">{asset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'accessories' && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Accessories</h3>
                  <p className="text-gray-400">Click on any accessory to add it to Zazu</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
                  {[
                    { name: 'Gold Chain', path: '/assets/extras/goldchain.png' },
                    { name: 'Suit', path: '/assets/extras/suit.png' },
                    { name: 'Money Stack', path: '/assets/extras/stack-money-on-white-backround-260nw-71606644-removebg-preview.png' },
                    { name: 'Smoke', path: '/assets/extras/smoke.png' },
                    { name: 'MLG Scope', path: '/assets/extras/108-1089650_mlg-quickscope-png-duty-modern-warfare-2-intervention-removebg-preview.png' },
                    { name: 'Screenshot', path: '/assets/extras/Screenshot_2025-07-14_181558-removebg-preview.png' },
                    { name: 'Images', path: '/assets/extras/images-removebg-preview.png' },
                    { name: 'Background', path: '/assets/extras/28de83405317503236d1625e11031acc-removebg-preview.png' }
                  ].map((asset) => (
                    <button
                      key={asset.name}
                      onClick={() => handleAssetSelect({ ...asset, category: 'accessories' })}
                      className="group relative overflow-hidden rounded-lg border-2 border-gray-600 hover:border-blue-500 transition-all duration-200 hover:scale-105"
                    >
                      <img
                        src={asset.path}
                        alt={asset.name}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iODAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">{asset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Asset Management - Show for all asset tabs */}
            {(activeTab === 'backgrounds' || activeTab === 'eyes' || activeTab === 'hats' || activeTab === 'accessories') && assetOverlays.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                <button
                  onClick={() => setAssetOverlays([])}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Clear All
                </button>
                <span className="text-sm text-gray-400">
                  {assetOverlays.length} asset{assetOverlays.length !== 1 ? 's' : ''} added
                </span>
              </div>
            )}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            {canUndo && (
              <button 
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                  aria-label="Press and hold to see original image"
              >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  Compare
              </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleUploadNew}
                className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Download Image
            </button>
        </div>
      </div>
      </main>
    </div>
  );
};

export default App;