/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useCallback, useState} from 'react';
import {trackEvent} from '../utils/analytics';
import {PhotoIcon, SparklesIcon} from './icons';

type PromptFormat = 'classic' | 'json';

interface LogoAnimatorProps {
  onGenerateLogoPrompt: (
    logoFile: File,
    animationStyle: string,
    background: string,
    sfx: string,
    tagline: string,
    promptFormat: PromptFormat,
  ) => Promise<string>;
  onPromptGenerated: (prompt: string) => void;
  onLogoSelected: (file: File | null) => void;
}

const ANIMATION_STYLES = [
  'Simple Fade',
  'Dynamic Pop',
  'Glitch Reveal',
  'Elegant Rise',
  'Liquid Morph',
  '3D Spin',
];

export const LogoAnimator: React.FC<LogoAnimatorProps> = ({
  onGenerateLogoPrompt,
  onPromptGenerated,
  onLogoSelected,
}) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [animationStyle, setAnimationStyle] = useState(ANIMATION_STYLES[0]);
  const [background, setBackground] = useState(
    'A clean, minimalist light gray background with a soft gradient.',
  );
  const [sfx, setSfx] = useState('A subtle whoosh and a gentle chime.');
  const [tagline, setTagline] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptFormat, setPromptFormat] = useState<PromptFormat>('classic');

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setLogoFile(file);
      onLogoSelected(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleFileChange(event.dataTransfer.files);
    },
    [handleFileChange],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleGenerate = async () => {
    if (!logoFile) return;
    setIsGenerating(true);
    onPromptGenerated('');
    trackEvent('generate_logo_prompt', {
      animation_style: animationStyle,
      has_tagline: !!tagline,
      prompt_format: promptFormat,
    });
    try {
      const prompt = await onGenerateLogoPrompt(
        logoFile,
        animationStyle,
        background,
        sfx,
        tagline,
        promptFormat,
      );
      onPromptGenerated(prompt);
    } catch (error) {
      console.error('Failed to generate logo prompt', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          1. Upload Your Logo
        </label>
        <p className="text-xs text-gray-500 mb-2 -mt-2">
          A high-resolution PNG with a transparent background works best.
        </p>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer hover:border-purple-500 transition-colors"
          onClick={() => document.getElementById('logo-upload')?.click()}>
          <div className="space-y-1 text-center">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo Preview"
                className="mx-auto h-32 w-auto object-contain"
              />
            ) : (
              <>
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-400">
                  <p className="pl-1">Drag and drop or click to upload</p>
                </div>
                <p className="text-xs text-gray-500">PNG up to 10MB</p>
              </>
            )}
          </div>
          <input
            id="logo-upload"
            name="logo-upload"
            type="file"
            className="sr-only"
            accept="image/png"
            onChange={(e) => handleFileChange(e.target.files)}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          2. Select Animation Style
        </label>
        <div className="flex flex-wrap gap-2">
          {ANIMATION_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => setAnimationStyle(style)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                animationStyle === style
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}>
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="background-desc"
          className="block text-sm font-medium text-gray-300 mb-2">
          3. Describe Background & Audio
        </label>
        <textarea
          id="background-desc"
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 mb-3"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          placeholder="e.g., A dark, smoky background with blue particle effects."
          aria-label="Background description"
        />
        <textarea
          id="sfx-desc"
          rows={2}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
          value={sfx}
          onChange={(e) => setSfx(e.target.value)}
          placeholder="e.g., Energetic synth riser and a heavy bass drop."
          aria-label="Sound effects description"
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor="tagline"
          className="block text-sm font-medium text-gray-300 mb-2">
          4. Add Tagline (Optional)
        </label>
        <input
          id="tagline"
          type="text"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Your company's tagline"
          aria-label="Tagline"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          5. Generation Settings
        </label>
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
        <button
          onClick={handleGenerate}
          disabled={!logoFile || isGenerating}
          className="w-full flex justify-center items-center gap-2 mb-3 px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-base">
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white"></div>
              <span>Generating Prompt...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span>Generate Director's Prompt</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};
