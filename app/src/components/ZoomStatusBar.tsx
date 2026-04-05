'use client';
import { useState, useCallback } from 'react';

interface ZoomStatusBarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

export function ZoomStatusBar({ zoom, onZoomChange }: ZoomStatusBarProps) {
  const zoomIn = useCallback(() => {
    onZoomChange(Math.min(ZOOM_MAX, zoom + ZOOM_STEP));
  }, [zoom, onZoomChange]);

  const zoomOut = useCallback(() => {
    onZoomChange(Math.max(ZOOM_MIN, zoom - ZOOM_STEP));
  }, [zoom, onZoomChange]);

  return (
    <div className="flex items-center justify-end gap-2 px-4 py-1 border-t bg-[#f0f0f0] text-xs text-gray-500 select-none shrink-0">
      <button
        onClick={zoomOut}
        disabled={zoom <= ZOOM_MIN}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        title="Zoom out"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="7" width="12" height="2" rx="1" />
        </svg>
      </button>

      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={zoom}
        onChange={(e) => onZoomChange(parseInt(e.target.value))}
        className="w-24 h-1 accent-gray-500 cursor-pointer"
        title={`Zoom: ${zoom}%`}
      />

      <button
        onClick={zoomIn}
        disabled={zoom >= ZOOM_MAX}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        title="Zoom in"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="7" width="12" height="2" rx="1" />
          <rect x="7" y="2" width="2" height="12" rx="1" />
        </svg>
      </button>

      <button
        onClick={() => onZoomChange(100)}
        className="min-w-[40px] text-center hover:bg-gray-200 rounded px-1.5 py-0.5 cursor-pointer"
        title="Reset zoom to 100%"
      >
        {zoom}%
      </button>
    </div>
  );
}
