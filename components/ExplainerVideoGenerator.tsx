/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useState} from 'react';
import {trackEvent} from '../utils/analytics';
import {PlusIcon, SparklesIcon, TrashIcon} from './icons';

type PromptFormat = 'classic' | 'json';

interface ExplainerVideoGeneratorProps {
  onGenerateExplainerVideoPrompt: (
    topic: string,
    keyPoints: string[],
    style: string,
    audience: string,
    cta: string,
    duration: string,
    promptFormat: PromptFormat,
  ) => Promise<string>;
  onPromptGenerated: (prompt: string) => void;
}

const VISUAL_STYLES = [
  'Clean Vector Animation',
  'Photorealistic 3D Render',
  'Hand-Drawn Pencil Sketch',
  'Vintage Cartoon Style',
  'Anime-Inspired',
  'Pixel Art',
  'Low-Poly 3D',
  'Claymation-Inspired',
  'Stylized Cel-Shaded 3D',
  'Isometric Graphics',
  'Whiteboard Animation',
];

const VIDEO_DURATIONS = ['15s', '30s', '60s'];

export const ExplainerVideoGenerator: React.FC<
  ExplainerVideoGeneratorProps
> = ({onGenerateExplainerVideoPrompt, onPromptGenerated}) => {
  const [topic, setTopic] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  const [visualStyle, setVisualStyle] = useState(VISUAL_STYLES[0]);
  const [duration, setDuration] = useState(VIDEO_DURATIONS[1]);
  const [audience, setAudience] = useState('A general audience');
  const [cta, setCta] = useState('Visit our website to learn more!');
  const [isGenerating, setIsGenerating] = useState(false);
  // Hard-coding to JSON to support the new visual storyboard UI
  const [promptFormat] = useState<PromptFormat>('json');

  const handleKeyPointChange = (index: number, value: string) => {
    const newKeyPoints = [...keyPoints];
    newKeyPoints[index] = value;
    setKeyPoints(newKeyPoints);
  };

  const handleAddKeyPoint = () => {
    setKeyPoints([...keyPoints, '']);
  };

  const handleDeleteKeyPoint = (index: number) => {
    const newKeyPoints = keyPoints.filter((_, i) => i !== index);
    if (newKeyPoints.length === 0) {
      setKeyPoints(['']);
    } else {
      setKeyPoints(newKeyPoints);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    onPromptGenerated('');
    trackEvent('generate_explainer_prompt', {
      style: visualStyle,
      key_points_count: keyPoints.filter((k) => k.trim()).length,
      duration,
      prompt_format: promptFormat,
    });
    try {
      const prompt = await onGenerateExplainerVideoPrompt(
        topic,
        keyPoints.filter((k) => k.trim()),
        visualStyle,
        audience,
        cta,
        duration,
        promptFormat, // Always 'json' now
      );
      onPromptGenerated(prompt);
    } catch (error) {
      console.error('Failed to generate explainer video prompt', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = topic.trim() !== '';

  return (
    <>
      <div className="mb-6">
        <label
          htmlFor="topic"
          className="block text-sm font-medium text-gray-300 mb-2">
          1. What is your video about?
        </label>
        <input
          id="topic"
          type="text"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., How photosynthesis works"
          aria-label="Video Topic"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          2. Key Points to Cover (Optional)
        </label>
        <p className="text-xs text-gray-500 mb-2 -mt-2">
          If left blank, our AI expert will create the key points for you.
        </p>
        <div className="space-y-3">
          {keyPoints.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                className="flex-grow bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
                value={point}
                onChange={(e) => handleKeyPointChange(index, e.target.value)}
                placeholder={`Key Point ${index + 1}`}
                aria-label={`Key Point ${index + 1}`}
              />
              <button
                onClick={() => handleDeleteKeyPoint(index)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                aria-label={`Delete key point ${index + 1}`}>
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddKeyPoint}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-purple-300 font-semibold hover:bg-purple-500/10 rounded-lg transition-colors">
          <PlusIcon className="w-5 h-5" />
          Add Key Point
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            3. Select Video Duration
          </label>
          <div className="flex flex-col gap-2">
            {VIDEO_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors w-full text-center ${
                  duration === d
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            4. Select Visual Style
          </label>
          <div className="flex flex-col gap-2">
            {VISUAL_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => setVisualStyle(style)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors w-full text-center ${
                  visualStyle === style
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}>
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="audience"
            className="block text-sm font-medium text-gray-300 mb-2">
            5. Target Audience
          </label>
          <input
            id="audience"
            type="text"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g., High school students"
          />
        </div>
        <div>
          <label
            htmlFor="cta"
            className="block text-sm font-medium text-gray-300 mb-2">
            6. Call to Action (CTA)
          </label>
          <input
            id="cta"
            type="text"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="e.g., Subscribe for more science videos!"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          7. Generate Storyboard & Prompts
        </label>
        {/*
        Hiding the format selector as the new UI requires JSON.
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Prompt Format
          </label>
          <div className="flex w-full rounded-lg bg-gray-900 p-1 border border-gray-700">
            <button
              onClick={() => setPromptFormat('classic')}
              className={`w-1/2 rounded-md py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${
                promptFormat === 'classic'
                  ? 'bg-purple-600 text-white'
                  : 'bg-transparent text-gray-300 hover:bg-gray-700'
              }`}>
              Classic
            </button>
            <button
              onClick={() => setPromptFormat('json')}
              className={`w-1/2 rounded-md py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${
                promptFormat === 'json'
                  ? 'bg-purple-600 text-white'
                  : 'bg-transparent text-gray-300 hover:bg-gray-700'
              }`}>
              JSON (Advanced)
            </button>
          </div>
        </div>
        */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full flex justify-center items-center gap-2 mb-3 px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-base">
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white"></div>
              <span>Generating Script & Prompts...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span>Generate with AI</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};
