/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const AdPlaceholder: React.FC<{className?: string}> = ({
  className = '',
}) => (
  <div
    className={`w-full my-12 flex items-center justify-center h-24 sm:h-32 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg ${className}`}>
    <p className="text-gray-500 text-sm tracking-widest uppercase">
      Advertisement
    </p>
  </div>
);