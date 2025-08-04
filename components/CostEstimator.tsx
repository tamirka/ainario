/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useMemo} from 'react';
import {CurrencyDollarIcon} from './icons';

interface CostEstimatorProps {
  imageFile: File | null;
  scenes: string[];
  sceneImages: (string | null)[];
}

// Pricing based on public Gemini API costs (hypothetical for this example)
// These would be updated with actual figures.
const COST_PER_INPUT_CHAR = 0.00000015; // ~$0.15 per 1M characters
const COST_PER_IMAGE_INPUT = 0.0025; // ~$2.50 per 1k images
const COST_PER_OUTPUT_CHAR = 0.0000005; // ~$0.50 per 1M characters

/**
 * A component that provides a rough, real-time estimate of the cost
 * to generate the storyboard and master prompt.
 */
export const CostEstimator: React.FC<CostEstimatorProps> = ({
  imageFile,
  scenes,
  sceneImages,
}) => {
  const {totalCost, styleAnalysisCost, storyboardCost} = useMemo(() => {
    let currentStyleCost = 0;
    let currentStoryboardCost = 0;

    // 1. Cost of Style Analysis from uploaded image
    if (imageFile) {
      currentStyleCost += COST_PER_IMAGE_INPUT; // One image input
      // Estimate text input/output for style analysis prompt
      currentStyleCost += 'Analyze this style...'.length * COST_PER_INPUT_CHAR;
      currentStyleCost += 500 * COST_PER_OUTPUT_CHAR; // Assume ~500 char output
    }

    // 2. Cost of generating the master prompt
    const nonEmptyScenes = scenes.filter((s) => s.trim());
    if (nonEmptyScenes.length > 0) {
      // Input text cost
      const totalSceneChars = nonEmptyScenes.reduce(
        (acc, scene) => acc + scene.length,
        0,
      );
      currentStoryboardCost += totalSceneChars * COST_PER_INPUT_CHAR;
      // System instruction cost
      currentStoryboardCost += 1000 * COST_PER_INPUT_CHAR; // Approx length of system prompt

      // Input images cost (the generated storyboard images)
      const imageCount = sceneImages.filter(Boolean).length;
      currentStoryboardCost += imageCount * COST_PER_IMAGE_INPUT;

      // Output text cost (the master prompt)
      currentStoryboardCost += 1000 * COST_PER_OUTPUT_CHAR; // Assume ~1000 char output for master prompt
    }

    const total = currentStyleCost + currentStoryboardCost;

    return {
      totalCost: total.toFixed(4),
      styleAnalysisCost: currentStyleCost.toFixed(4),
      storyboardCost: currentStoryboardCost.toFixed(4),
    };
  }, [imageFile, scenes, sceneImages]);

  if (parseFloat(totalCost) === 0) {
    return null;
  }

  return (
    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 text-xs text-gray-400">
      <div className="flex items-center gap-2 mb-2">
        <CurrencyDollarIcon className="w-4 h-4 text-green-400" />
        <h4 className="font-semibold text-gray-300">
          Generation Cost Estimator
        </h4>
      </div>
      <div className="space-y-1">
        {parseFloat(styleAnalysisCost) > 0 && (
          <div className="flex justify-between">
            <span>Style Analysis:</span>
            <span>${styleAnalysisCost}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Storyboard & Prompt Gen:</span>
          <span>${storyboardCost}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-200 border-t border-gray-700 pt-1 mt-1">
          <span>Estimated Total:</span>
          <span>${totalCost}</span>
        </div>
      </div>
      <p className="text-center text-gray-500 mt-2 text-[10px]">
        Our fine-tuned process is designed to be credit-efficient. Actual costs
        may vary.
      </p>
    </div>
  );
};
