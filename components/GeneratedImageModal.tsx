/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {XMarkIcon} from './icons';

interface GeneratedImageModalProps {
  imageSrc: string;
  prompt: string;
  onClose: () => void;
}

/**
 * A modal that displays a newly generated image and its prompt.
 */
export const GeneratedImageModal: React.FC<GeneratedImageModalProps> = ({
  imageSrc,
  prompt,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog">
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 p-2 sm:p-4">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white/70 hover:text-white z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Close image viewer">
            <XMarkIcon className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <div className="aspect-w-16 aspect-h-9 bg-black rounded-md overflow-hidden">
            <img
              src={imageSrc}
              alt={prompt}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div className="flex-1 p-4 pt-2 overflow-y-auto">
          <h3 className="text-lg font-bold text-white mb-2">Generated Scene</h3>
          <p className="text-sm text-gray-400 mt-0 whitespace-pre-wrap flex-1">
            {prompt}
          </p>
        </div>
      </div>
    </div>
  );
};
