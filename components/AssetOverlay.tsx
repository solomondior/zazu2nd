/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback } from 'react';

interface AssetOverlay {
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
}

interface AssetOverlayProps {
  overlays: AssetOverlay[];
  onUpdateOverlay: (id: string, updates: Partial<AssetOverlay>) => void;
  onRemoveOverlay: (id: string) => void;
  onAddOverlay: (overlay: Omit<AssetOverlay, 'id'>) => void;
  isEditing: boolean;
  onSetEditing: (editing: boolean) => void;
}

const AssetOverlay: React.FC<AssetOverlayProps> = ({
  overlays,
  onUpdateOverlay,
  onRemoveOverlay,
  onAddOverlay,
  isEditing,
  onSetEditing
}) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, overlayId: string, action: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'drag') {
      setDragging(overlayId);
    } else {
      setResizing(overlayId);
    }
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging && !resizing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    const overlay = overlays.find(o => o.id === (dragging || resizing));
    if (!overlay) return;
    
    if (dragging) {
      onUpdateOverlay(overlay.id, {
        x: Math.max(0, Math.min(rect.width - overlay.width, overlay.x + deltaX)),
        y: Math.max(0, Math.min(rect.height - overlay.height, overlay.y + deltaY))
      });
    } else if (resizing) {
      const newWidth = Math.max(20, overlay.width + deltaX);
      const newHeight = Math.max(20, overlay.height + deltaY);
      onUpdateOverlay(overlay.id, {
        width: newWidth,
        height: newHeight
      });
    }
    
    setDragStart({ x: currentX, y: currentY });
  }, [dragging, resizing, dragStart, overlays, onUpdateOverlay]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          className={`absolute ${isEditing ? 'cursor-move' : ''} ${isEditing ? 'border-2 border-blue-500' : ''}`}
          style={{
            left: overlay.x,
            top: overlay.y,
            width: overlay.width,
            height: overlay.height,
            zIndex: overlay.zIndex,
            opacity: overlay.opacity,
            transform: `rotate(${overlay.rotation}deg)`
          }}
        >
          <img
            src={overlay.src}
            alt={overlay.name}
            className="w-full h-full object-contain"
            draggable={false}
          />
          
          {isEditing && (
            <>
              {/* Drag handle */}
              <div
                className="absolute inset-0 cursor-move"
                onMouseDown={(e) => handleMouseDown(e, overlay.id, 'drag')}
              />
              
              {/* Resize handle */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
                onMouseDown={(e) => handleMouseDown(e, overlay.id, 'resize')}
              />
              
              {/* Remove button */}
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                onClick={() => onRemoveOverlay(overlay.id)}
              >
                ×
              </button>
              
              {/* Controls */}
              <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
                <button
                  className="px-2 py-1 bg-gray-700 text-white text-xs rounded"
                  onClick={() => onUpdateOverlay(overlay.id, { opacity: Math.max(0.1, overlay.opacity - 0.1) })}
                >
                  -
                </button>
                <span className="px-2 py-1 bg-gray-700 text-white text-xs rounded">
                  {Math.round(overlay.opacity * 100)}%
                </span>
                <button
                  className="px-2 py-1 bg-gray-700 text-white text-xs rounded"
                  onClick={() => onUpdateOverlay(overlay.id, { opacity: Math.min(1, overlay.opacity + 0.1) })}
                >
                  +
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default AssetOverlay;
