/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useCallback, useEffect, useState} from 'react';
import {GALLERY_ITEMS} from '../constants';
import {Video} from '../types';
import {trackEvent} from '../utils/analytics';
import {AdPlaceholder} from './AdPlaceholder';
import {CostEstimator} from './CostEstimator';
import {VideoGrid} from './VideoGrid';
import {
  ChainIcon,
  ChatBubbleBottomCenterTextIcon,
  ClipboardDocumentListIcon,
  CubeTransparentIcon,
  CurrencyDollarIcon,
  FilmIcon,
  InformationCircleIcon,
  MusicalNoteIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  VideoCameraIcon,
} from './icons';
import {LogoAnimator} from './LogoAnimator';
import {YouTubeIntroGenerator} from './YouTubeIntroGenerator';

type VideoType =
  | 'storyboard'
  | 'logo'
  | 'introOutro'
  | 'musicVideo'
  | 'cashCow';

type PromptFormat = 'classic' | 'json';

export interface ExplainerScene {
  scene: {
    shot_number: number;
    key_point_covered?: string;
    audio: {
      voiceover?: string;
    };
    generation_prompt: string;
  };
  image: string | null;
}

interface AnimateImagePageProps {
  onAnimate: (prompt: string, imageFile?: File | null) => void;
  onPlayVideo: (video: Video) => void;
  onGenerateStoryboard: (
    scenes: string[],
    imageFile: File | null,
    selectedStyle: string,
    promptFormat: PromptFormat,
  ) => Promise<{prompts: string; sceneImages: (string | null)[]}>;
  onGenerateLogoPrompt: (
    logoFile: File,
    animationStyle: string,
    background: string,
    sfx: string,
    tagline: string,
    promptFormat: PromptFormat,
  ) => Promise<string>;
  onGenerateYouTubeIntroPrompt: (
    channelName: string,
    videoTopic: string,
    visualStyle: string,
    energy: string,
    specificElements: string,
    promptFormat: PromptFormat,
  ) => Promise<string>;
  onGenerateImageForCard: (prompt: string) => Promise<string>;
}

const CINEMATIC_STYLES = [
  {
    name: 'No Style',
    description: 'Relies on the reference image or scene descriptions.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-cinematic.jpg',
  },
  {
    name: 'Cinematic',
    description: 'Photorealistic, dramatic lighting, high contrast.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-cinematic.jpg',
  },
  {
    name: 'Noir Thriller',
    description: 'Black and white, high contrast, shadows, mysterious mood.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-noir.jpg',
  },
  {
    name: 'Epic Fantasy',
    description:
      'Grandiose landscapes, magical elements, rich, vibrant colors.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-fantasy.jpg',
  },
  {
    name: 'Sci-Fi Dystopian',
    description:
      'Futuristic, gritty, neon lights against dark backgrounds, cool color palette.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-scifi.jpg',
  },
  {
    name: 'Pixar Animation',
    description:
      'Warm, colorful, soft lighting, friendly character design, 3D rendered look.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-pixar.jpg',
  },
  {
    name: 'Studio Ghibli',
    description:
      'Hand-drawn anime style, lush natural backgrounds, watercolor aesthetic, whimsical feel.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-ghibli.jpg',
  },
];

const StoryboardGenerator: React.FC<
  Pick<AnimateImagePageProps, 'onGenerateStoryboard'> & {
    onPromptGenerated: (prompt: string) => void;
    onVisualsGenerated: (visuals: (string | null)[]) => void;
  }
> = ({onGenerateStoryboard, onPromptGenerated, onVisualsGenerated}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scenes, setScenes] = useState<string[]>(['']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(CINEMATIC_STYLES[0]);
  const [showPromptingTips, setShowPromptingTips] = useState(false);
  const [promptFormat, setPromptFormat] = useState<PromptFormat>('classic');
  const [visualStoryboard, setVisualStoryboard] = useState<(string | null)[]>(
    [],
  );

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleFileChange(event.dataTransfer.files);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleSceneChange = (index: number, value: string) => {
    const newScenes = [...scenes];
    newScenes[index] = value;
    setScenes(newScenes);
  };

  const handleAddScene = () => {
    setScenes([...scenes, '']);
  };

  const handleDeleteScene = (index: number) => {
    const newScenes = scenes.filter((_, i) => i !== index);
    const newVisualStoryboard = visualStoryboard.filter((_, i) => i !== index);
    if (newScenes.length === 0) {
      setScenes(['']);
      setVisualStoryboard([]);
    } else {
      setScenes(newScenes);
      setVisualStoryboard(newVisualStoryboard);
    }
  };

  const handleGenerateStoryboard = async () => {
    setIsGenerating(true);
    onPromptGenerated('');
    onVisualsGenerated([]);
    setVisualStoryboard([]);
    trackEvent('generate_storyboard', {
      scene_count: scenes.filter((s) => s.trim()).length,
      has_reference_image: !!imageFile,
      style: selectedStyle.name,
      prompt_format: promptFormat,
    });
    try {
      const {prompts, sceneImages} = await onGenerateStoryboard(
        scenes,
        imageFile,
        selectedStyle.name,
        promptFormat,
      );
      onPromptGenerated(prompts);
      onVisualsGenerated(sceneImages);
      setVisualStoryboard(sceneImages);
    } catch (error) {
      console.error('Error generating storyboard:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const allScenesEmpty = scenes.every((scene) => scene.trim() === '');

  return (
    <>
      {/* Step 1: Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          1. Set Visual Style (Optional)
        </label>
        <p className="text-xs text-gray-500 mb-2 -mt-2">
          Upload a reference image to guide the artistic style of your
          storyboard.
        </p>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer hover:border-purple-500 transition-colors"
          onClick={() => document.getElementById('file-upload')?.click()}>
          <div className="space-y-1 text-center">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="mx-auto h-48 w-auto rounded-lg object-contain"
              />
            ) : (
              <>
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-400">
                  <p className="pl-1">Drag and drop or click to upload</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </>
            )}
          </div>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files)}
          />
        </div>
      </div>

      {/* Step 2: Storyboard */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          2. Build Your Narrative
        </label>
        <div className="mb-3">
          <button
            onClick={() => setShowPromptingTips(!showPromptingTips)}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
            <InformationCircleIcon className="w-5 h-5" />
            <span>
              {showPromptingTips ? 'Hide' : 'Show'} Pro-level Prompting Tips
            </span>
          </button>
          {showPromptingTips && (
            <div className="mt-2 p-3 bg-gray-900/70 rounded-lg border border-gray-700 text-xs text-gray-400 animate-fade-in">
              <h4 className="font-semibold text-gray-300 mb-2">
                To create higher quality videos, consider these elements for
                each scene:
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Subject:</strong> The "who" or "what" of your video.
                </li>
                <li>
                  <strong>Action:</strong> Describe movements, interactions,
                  etc.
                </li>
                <li>
                  <strong>Scene:</strong> The "where" and "when" of your video.
                </li>
                <li>
                  <strong>Camera Angles/Movements:</strong> For a more cinematic
                  feel.
                </li>
              </ul>
            </div>
          )}
        </div>
        <div className="space-y-3">
          {scenes.map((scene, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                className="flex-grow bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
                value={scene}
                onChange={(e) => handleSceneChange(index, e.target.value)}
                placeholder={`Scene ${index + 1} description`}
                aria-label={`Storyboard scene ${index + 1}`}
              />
              <button
                onClick={() => handleDeleteScene(index)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                aria-label={`Delete scene ${index + 1}`}>
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddScene}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-purple-300 font-semibold hover:bg-purple-500/10 rounded-lg transition-colors">
          <PlusIcon className="w-5 h-5" />
          Add Scene
        </button>
      </div>

      {/* Step 3: Select Style */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          3. Select a Base Style
        </label>
        <div className="relative">
          <div className="aspect-w-16 aspect-h-9 w-full bg-gray-700 rounded-lg overflow-hidden mb-2">
            <img
              src={selectedStyle.imageUrl}
              alt={`${selectedStyle.name} style preview`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CINEMATIC_STYLES.map((style) => (
              <button
                key={style.name}
                onClick={() => setSelectedStyle(style)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  selectedStyle.name === style.name
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title={style.description}>
                {style.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 4: Generate Visual Storyboard & Prompt */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          4. Generate Storyboard & Director's Prompts
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
          onClick={handleGenerateStoryboard}
          disabled={allScenesEmpty || isGenerating}
          className="w-full flex justify-center items-center gap-2 mb-3 px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-base">
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span>Generate with AI</span>
            </>
          )}
        </button>
        <CostEstimator
          imageFile={imageFile}
          scenes={scenes}
          sceneImages={visualStoryboard}
        />
      </div>
    </>
  );
};

const VideoTypeSelector: React.FC<{
  selected: VideoType;
  onSelect: (type: VideoType) => void;
}> = ({selected, onSelect}) => {
  const types = [
    {
      id: 'storyboard' as VideoType,
      name: 'Cinematic Storyboard',
      description: 'Create a narrative from scenes.',
      icon: VideoCameraIcon,
      enabled: true,
    },
    {
      id: 'logo' as VideoType,
      name: 'Logo Animation',
      description: 'Animate your brand identity.',
      icon: CubeTransparentIcon,
      enabled: true,
    },
    {
      id: 'introOutro' as VideoType,
      name: 'YouTube Intro/Outro',
      description: 'Brand your channel videos.',
      icon: FilmIcon,
      enabled: true,
    },
    {
      id: 'musicVideo' as VideoType,
      name: 'Music Video',
      description: 'Create visuals for your audio.',
      icon: MusicalNoteIcon,
      enabled: false,
    },
    {
      id: 'cashCow' as VideoType,
      name: 'Cash Cow Content',
      description: 'Automated faceless videos.',
      icon: CurrencyDollarIcon,
      enabled: false,
    },
  ];

  return (
    <div className="w-full max-w-5xl py-10 px-4">
      <h2 className="text-2xl font-bold text-center mb-2">
        Welcome to the AI Film Studio
      </h2>
      <p className="text-center text-gray-400 mb-8">
        What kind of video are you creating today?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              if (type.enabled) {
                onSelect(type.id);
                trackEvent('select_video_type', {video_type: type.id});
              }
            }}
            disabled={!type.enabled}
            className={`p-4 rounded-lg text-left transition-all transform hover:-translate-y-1 disabled:transform-none ${
              selected === type.id
                ? 'bg-gray-700 ring-2 ring-purple-500 shadow-lg'
                : 'bg-gray-800 hover:bg-gray-700'
            } ${
              !type.enabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}>
            <div className="flex items-center gap-3 mb-2">
              <type.icon
                className={`w-7 h-7 flex-shrink-0 ${
                  selected === type.id ? 'text-purple-400' : 'text-gray-400'
                }`}
              />
              <h3 className="font-semibold text-white">{type.name}</h3>
            </div>
            <p className="text-xs text-gray-400">{type.description}</p>
            {!type.enabled && (
              <span className="text-xs text-yellow-400 block mt-2">
                Coming Soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export const AnimateImagePage: React.FC<AnimateImagePageProps> = ({
  onAnimate,
  onPlayVideo,
  onGenerateStoryboard,
  onGenerateLogoPrompt,
  onGenerateYouTubeIntroPrompt,
  onGenerateImageForCard,
}) => {
  const [masterPrompt, setMasterPrompt] = useState('');
  const [visualStoryboard, setVisualStoryboard] = useState<(string | null)[]>(
    [],
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoType, setVideoType] = useState<VideoType>('storyboard');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy Prompts');

  useEffect(() => {
    // Clear outputs when switching video types
    setMasterPrompt('');
    setVisualStoryboard([]);
  }, [videoType]);

  const handleGenerateScene = () => {
    if (masterPrompt) {
      let finalPrompt = masterPrompt; // Default to whole prompt

      // Try to extract the first prompt, either from JSON or classic format
      try {
        // Test if it's JSON
        const parsed = JSON.parse(masterPrompt);
        let firstScenePrompt = '';
        if (Array.isArray(parsed) && parsed.length > 0) {
          firstScenePrompt = parsed[0].generation_prompt;
        } else if (parsed?.scenes?.length > 0) {
          firstScenePrompt = parsed.scenes[0].generation_prompt;
        }

        if (firstScenePrompt) {
          finalPrompt = firstScenePrompt;
        }
      } catch (e) {
        // Not valid JSON, treat as classic format with markers
        const prompts = masterPrompt.split(/--- (?:SCENE|PROMPT) \d+.*---/);
        if (prompts.length > 1) {
          finalPrompt = prompts[1].trim(); // Get the content of the first block
        }
      }

      // If no prompt could be extracted, finalPrompt remains masterPrompt
      finalPrompt = finalPrompt.trim() === '' ? masterPrompt : finalPrompt;

      trackEvent('generate_final_scene', {
        video_type: videoType,
        prompt_length: finalPrompt.length,
      });

      if (videoType === 'logo' && logoFile) {
        onAnimate(finalPrompt, logoFile);
      } else {
        onAnimate(finalPrompt);
      }
    }
  };

  const handleCopyPrompts = () => {
    if (masterPrompt) {
      navigator.clipboard.writeText(masterPrompt);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Prompts'), 2000);
      trackEvent('copy_prompts', {
        prompt_length: masterPrompt.length,
        video_type: videoType,
      });
    }
  };

  const handlePlayGalleryVideo = (video: Video) => {
    trackEvent('play_gallery_video', {
      video_id: video.id,
      video_title: video.title,
    });
    onPlayVideo(video);
  };

  const scrollToGenerator = () => {
    document
      .getElementById('generator-section')
      ?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const renderOutputSection = () => {
    if (
      videoType === 'storyboard' ||
      videoType === 'logo' ||
      videoType === 'introOutro'
    ) {
      return (
        <div className="mb-6 mt-6 border-t border-gray-700 pt-6">
          <label
            htmlFor="master-prompt"
            className="block text-sm font-medium text-gray-300 mb-2">
            Refine the Director's Prompt(s)
          </label>
          <textarea
            id="master-prompt"
            rows={12}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 font-mono text-sm"
            value={masterPrompt}
            onChange={(e) => setMasterPrompt(e.target.value)}
            placeholder="The AI-generated director's prompt(s) will appear here. You can edit the result before final generation."
            aria-label="Master animation prompt"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 text-gray-100 font-sans flex flex-col items-center animate-fade-in w-full">
      {/* Hero Section */}
      <header className="w-full text-center py-20 sm:py-32 px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
          AI Video Generator.
          <br />
          <span className="text-purple-400">
            Professional Results, Zero Guesswork.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
          Our AI film studio guides you from concept to final cut. Create
          stunning logo animations, storyboards, and more with unparalleled
          style consistency.
        </p>
        <button
          onClick={scrollToGenerator}
          className="px-8 py-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-transform transform hover:scale-105 text-lg shadow-lg hover:shadow-purple-500/50">
          Start Creating for Free
        </button>
      </header>

      {/* How it works Section */}
      <section className="w-full max-w-6xl py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          The Fine-Tuned Filming Process
        </h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center p-4">
            <div className="bg-gray-800 p-5 rounded-full mb-4 ring-2 ring-gray-700">
              <PhotoIcon className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1. Set the Style</h3>
            <p className="text-gray-400 max-w-xs">
              Upload a reference image or choose a cinematic style to ensure
              visual consistency.
            </p>
          </div>
          <div className="flex flex-col items-center p-4">
            <div className="bg-gray-800 p-5 rounded-full mb-4 ring-2 ring-gray-700">
              <ChatBubbleBottomCenterTextIcon className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              2. Build Your Narrative
            </h3>
            <p className="text-gray-400 max-w-xs">
              Use our specialized tools to describe your scenes, animations, or
              concepts.
            </p>
          </div>
          <div className="flex flex-col items-center p-4">
            <div className="bg-gray-800 p-5 rounded-full mb-4 ring-2 ring-gray-700">
              <SparklesIcon className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3. Generate & Refine</h3>
            <p className="text-gray-400 max-w-xs">
              Our AI crafts professional, individual prompts for each scene that
              you can fine-tune.
            </p>
          </div>
        </div>
      </section>

      {/* Generator Section */}
      <section
        id="generator-section"
        className="w-full py-16 flex flex-col items-center px-4 bg-black/20">
        <VideoTypeSelector selected={videoType} onSelect={setVideoType} />

        <div className="w-full max-w-2xl bg-gray-800 p-6 md:p-8 rounded-lg shadow-2xl mt-8">
          <main>
            {videoType === 'storyboard' && (
              <StoryboardGenerator
                onGenerateStoryboard={onGenerateStoryboard}
                onPromptGenerated={setMasterPrompt}
                onVisualsGenerated={setVisualStoryboard}
              />
            )}
            {videoType === 'logo' && (
              <LogoAnimator
                onGenerateLogoPrompt={onGenerateLogoPrompt}
                onPromptGenerated={setMasterPrompt}
                onLogoSelected={setLogoFile}
              />
            )}
            {videoType === 'introOutro' && (
              <YouTubeIntroGenerator
                onGenerateYouTubeIntroPrompt={onGenerateYouTubeIntroPrompt}
                onPromptGenerated={setMasterPrompt}
              />
            )}
            {(videoType === 'musicVideo' || videoType === 'cashCow') && (
              <div className="text-center py-10">
                <h3 className="text-xl font-bold text-white">Coming Soon!</h3>
                <p className="text-gray-400 mt-2">
                  This feature is currently under development. Stay tuned!
                </p>
              </div>
            )}
          </main>

          {/* Common fields for Storyboard */}
          {videoType === 'storyboard' && visualStoryboard.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                5. Visual Storyboard
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {visualStoryboard.map((imageSrc, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-w-4 aspect-h-3 bg-gray-700 rounded-lg overflow-hidden">
                      {imageSrc ? (
                        <img
                          src={`data:image/jpeg;base64,${imageSrc}`}
                          alt={`Generated visual for Scene ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                          <PhotoIcon className="w-8 h-8 text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500">
                            No image generated
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-tr-lg rounded-bl-lg">
                      Scene {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Prompt / Explainer Output */}
          {renderOutputSection()}

          {/* Generate Animation - Common to all enabled types */}
          {(videoType === 'storyboard' ||
            videoType === 'logo' ||
            videoType === 'introOutro') && (
            <footer className="flex flex-col-reverse sm:flex-row justify-end gap-4 border-t border-gray-700 pt-6 mt-6">
              <button
                onClick={handleCopyPrompts}
                disabled={!masterPrompt}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5" />
                {copyButtonText}
              </button>
              {videoType !== 'storyboard' && (
                <button
                  onClick={handleGenerateScene}
                  disabled={!masterPrompt || isGenerating}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-base">
                  Generate Example Scene
                </button>
              )}
            </footer>
          )}
        </div>
      </section>

      <AdPlaceholder className="max-w-4xl px-4" />

      {/* Features Section */}
      <section className="w-full max-w-6xl py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Your Vision, Amplified
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <CurrencyDollarIcon className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <h3 className="text-xl font-semibold">
                Credit-Saving Efficiency
              </h3>
            </div>
            <p className="text-gray-400">
              Our fine-tuned process minimizes wasted attempts, ensuring you get
              your desired shot faster and for less cost.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <ChainIcon className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <h3 className="text-xl font-semibold">Guaranteed Consistency</h3>
            </div>
            <p className="text-gray-400">
              Maintain character, style, and narrative cohesion across every
              scene. Our AI remembers your story.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <FilmIcon className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <h3 className="text-xl font-semibold">Professional Toolset</h3>
            </div>
            <p className="text-gray-400">
              Go beyond simple generation. Control camera movement, shot
              sequences, and cinematic language like a real director.
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="w-full max-w-7xl py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-4">
          Showcase: From Concept to Cinema
        </h2>
        <p className="text-center text-lg text-gray-400 mb-12 max-w-3xl mx-auto">
          Explore a diverse range of styles our AI can produce. Hover to see
          still concepts brought to life.
        </p>
        <VideoGrid videos={GALLERY_ITEMS} onPlayVideo={handlePlayGalleryVideo} />
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center space-x-6 mb-4">
            <a href="#" className="text-sm text-gray-400 hover:text-white">
              About Us
            </a>
            <a href="#" className="text-sm text-gray-400 hover:text-white">
              Contact Us
            </a>
            <a href="#" className="text-sm text-gray-400 hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-gray-400 hover:text-white">
              Terms of Service
            </a>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} CineGen AI. All rights reserved.
            An AI Studio Project.
          </p>
        </div>
      </footer>
    </div>
  );
};
