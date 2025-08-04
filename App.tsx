/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useEffect, useState} from 'react';
import {AnimateImagePage} from './components/AnimateImagePage';
import {ErrorModal} from './components/ErrorModal';
import {GeneratedImageModal} from './components/GeneratedImageModal';
import {SavingProgressPage} from './components/SavingProgressPage';
import {VideoPlayer} from './components/VideoPlayer';
import {Video} from './types';
import {trackEvent} from './utils/analytics';

import {GoogleGenAI, Part} from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// ---

async function generateImage(
  prompt: string,
  aspectRatio: '16:9' | '4:3' = '16:9',
  imageFile: File | null = null,
): Promise<string> {
  // Note: The `imageFile` parameter is not used in this function as `generateImages`
  // only accepts a string prompt. The original code attempted to pass multimodal
  // input, which caused a type error.
  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio,
    },
  });

  const image = response.generatedImages?.[0]?.image?.imageBytes;
  if (!image) {
    throw new Error('No images generated from prompt.');
  }
  return image;
}

async function analyzeImageStyle(imageFile: File): Promise<string> {
  const imagePart = {
    inlineData: {
      mimeType: imageFile.type,
      data: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      }),
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          text: `You are a master art director creating a prompt for an AI image generator. Based on the provided image, describe its visual style using a concise, comma-separated list of keywords. Focus on mood, color palette, lighting, and key artistic characteristics.`,
        },
        imagePart,
      ],
    },
  });
  return response.text;
}

/**
 * Main component for the app.
 * It manages the state for animating images and displaying the results.
 */
export const App: React.FC = () => {
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingTitle, setSavingTitle] = useState('Generating your scene...');
  const [generationError, setGenerationError] = useState<string[] | null>(
    null,
  );
  const [generatedResult, setGeneratedResult] = useState<{
    imageSrc: string;
    prompt: string;
  } | null>(null);

  useEffect(() => {
    if (generationError) {
      trackEvent('generation_error', {
        error_message: generationError.join(' | '),
      });
    }
  }, [generationError]);

  const handleClosePlayer = () => {
    setPlayingVideo(null);
  };

  const handleGenerateLogoPrompt = async (
    logoFile: File,
    animationStyle: string,
    background: string,
    sfx: string,
    tagline: string,
    promptFormat: 'classic' | 'json',
  ): Promise<string> => {
    const classicSystemInstruction = `You are a senior motion graphics director creating prompts for an AI video generator. Your task is to take user specs and a logo image and write a series of detailed, individual shot prompts for an 8-second animation.

**CRITICAL REQUIREMENTS:**
1.  **Separate Prompts per Segment:** Generate a self-contained prompt block for EACH logical animation segment (e.g., Intro, Reveal, Tagline, Outro). Each segment should be ~2 seconds.
2.  **Use the EXACT Structure:** Each block MUST start with "--- PROMPT [Number]: [Segment Title] ([Time Range]) ---". Do not deviate.
3.  **Detailed & Cinematic Language:** Be highly descriptive. Use professional filmmaking terminology for movement, lighting, and effects.
4.  **Integrate Style:** The prompts must be heavily influenced by the user's selected animation style.
5.  **Reference the Logo:** Refer to the user's uploaded logo as 'the provided logo image'.

**STRUCTURE FOR EACH PROMPT:**

--- PROMPT [Number]: [Segment Title] ([Time Range]) ---
- **Setting (High Weight):** Describe the background environment, textures, and atmosphere based on the user's description.
- **Action & Movement (High Weight):** Detail the specific animation. How do elements move? What are the particle effects? How does the logo itself animate on/off screen?
- **Shots and Camera (High Weight):** Describe the virtual camera work. Is it a static shot? A quick zoom-in? A slow pan?
- **Visual Style & Aesthetics (High Weight):** Define the overall look and feel, referencing the user's style choice (e.g., "Sleek and modern," "Gritty and textured"). Describe the lighting (e.g., "dramatic lens flares," "soft volumetric light").
- **Audio (High Weight):** Suggest specific sound effects (SFX) and music cues that are perfectly synced to the animation.
- **Text Overlay (Medium Weight):** If a tagline is provided, describe its font, animation, and timing.

**EXAMPLE:**

--- PROMPT 2: Reveal (2-4s) ---
- **Setting (High Weight):** The user-defined background is in sharp focus.
- **Action & Movement (High Weight):** Abstract energy lines converge in the center, rapidly condensing and resolving into the provided logo image with a bright flash of light. The logo has a subtle metallic sheen.
- **Shots and Camera (High Weight):** A rapid push-in (zoom) as the lines converge, stopping abruptly as the logo locks into place.
- **Visual Style & Aesthetics (High Weight):** A brilliant, sharp flash of light illuminates the scene, fading to reveal the logo under crisp, hard lighting that emphasizes its texture.
- **Audio (High Weight):** Music hits a beat drop. SFX: A powerful whoosh followed by a resonant bass drop and a sharp, metallic 'clang' as the logo settles.
- **Text Overlay (Medium Weight):** The tagline text "Innovation in Motion" fades in smoothly underneath the logo.`;

    const jsonSystemInstruction = `You are a senior motion graphics director creating prompts for an AI video generator. Your task is to convert user specifications into a structured JSON array for an 8-second logo animation.

**CRITICAL INSTRUCTIONS:**
1.  **JSON Array Output ONLY:** Your entire response MUST be a single, valid JSON array. Each object represents a distinct ~2-second animation segment.
2.  **Logical Segments:** Create objects for logical segments like Intro, Reveal, Tagline, and Outro.
3.  **Adhere to Schema:** Each object in the array must strictly follow this schema:
    - \`segment_number\` (number): The sequence number (1, 2, 3...).
    - \`segment_title\` (string): The name of the segment (e.g., "Reveal").
    - \`time_range\` (string): The time range for this segment (e.g., "2-4s").
    - \`setting\` (string): Description of the background and atmosphere.
    - \`action_and_movement\` (string): Detailed description of on-screen animations and visual effects.
    - \`camera\` (string): Description of camera shots and movements (e.g., "Quick zoom-in").
    - \`visual_style_and_aesthetics\` (string): Description of the lighting, mood, and overall aesthetic.
    - \`audio\` (string): Description of sound effects and music cues.
    - \`text_overlay\` (string): Description of tagline animation, if any.
    - \`generation_prompt\` (string): A single, complete text prompt combining all details from this object, written in a cinematic style, suitable for direct use by a video AI. It MUST reference 'the provided logo image'.
4.  **Reference the Logo:** In the prompt fields, refer to the user's uploaded logo as 'the provided logo image'.`;

    const promptText = `
      Create a logo animation prompt series based on these details:
      - Animation Style: ${animationStyle}
      - Background Description: ${background}
      - Sound Effects (SFX) Description: ${sfx}
      - Tagline (optional): ${tagline || 'None'}
      - Output Format: ${promptFormat}
    `;

    const logoImagePart = {
      inlineData: {
        mimeType: logoFile.type,
        data: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        }),
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {parts: [{text: promptText}, logoImagePart]},
      config: {
        systemInstruction:
          promptFormat === 'json'
            ? jsonSystemInstruction
            : classicSystemInstruction,
      },
    });

    return response.text;
  };

  const handleGenerateYouTubeIntroPrompt = async (
    channelName: string,
    videoTopic: string,
    visualStyle: string,
    energy: string,
    specificElements: string,
    promptFormat: 'classic' | 'json',
  ): Promise<string> => {
    const classicSystemInstruction = `You are a YouTube branding expert and motion graphics director creating prompts for an AI video generator. Your job is to create a series of dynamic, individual shot prompts for a 5-8 second YouTube intro, broken into logical 2-3 second segments.

**CRITICAL REQUIREMENTS:**
1.  **Separate Prompts per Segment:** Generate a self-contained prompt block for EACH logical intro segment (e.g., Buildup, Reveal, CTA).
2.  **Use the EXACT Structure:** Each block MUST start with "--- PROMPT [Number]: [Segment Title] ([Time Range]) ---". Do not deviate.
3.  **Cinematic & Energetic Language:** Use exciting, descriptive, professional filmmaking language. The detail should match the user's specified energy level.
4.  **Integrate Channel Branding:** The prompts must revolve around the user's Channel Name and Topic.

**STRUCTURE FOR EACH PROMPT:**

--- PROMPT [Number]: [Segment Title] ([Time Range]) ---
- **Setting (High Weight):** Describe the background, environment, and atmosphere.
- **Action & Movement (High Weight):** What is animating? Describe particle effects, transitions, and how core elements move.
- **Shots and Camera (High Weight):** Define the camera work (e.g., "Whip pan," "Fast zoom out," "Static shot").
- **Visual Style & Aesthetics (High Weight):** Define the overall look. Refer to the user's style choice. Describe lighting and color palette.
- **Audio (High Weight):** Suggest a music style and specific SFX that are tightly synced with the visuals to maximize impact.
- **Text & Overlays (Medium Weight):** Specify any additional on-screen text (like the channel name or social handles), its font, animation, and placement.

**EXAMPLE (for a Tech Channel):**

--- PROMPT 1: Buildup (0-2s) ---
- **Setting (High Weight):** A dark, tech-themed background with faint, glowing grid lines receding into the distance.
- **Action & Movement (High Weight):** Abstract, glowing blue and purple circuit board lines animate rapidly from the edges of the screen, moving towards the center.
- **Shots and Camera (High Weight):** Static wide shot.
- **Visual Style & Aesthetics (High Weight):** Sleek, modern, and futuristic. The lines emit a bright neon glow. High contrast lighting.
- **Audio (High Weight):** (High-Energy, modern electronic track begins) SFX: A series of quick, sharp digital whoosh and glitch sounds.
- **Text & Overlays (Medium Weight):** None.`;

    const jsonSystemInstruction = `You are a YouTube branding expert creating prompts for an AI video generator. Your job is to create a structured JSON array of shot prompts for a 5-8 second YouTube intro.

**CRITICAL INSTRUCTIONS:**
1.  **JSON Array Output ONLY:** Your entire response MUST be a single, valid JSON array. Each object represents a distinct intro segment.
2.  **Logical Segments:** Create objects for logical segments like Buildup, Reveal, and CTA/Outro.
3.  **Adhere to Schema:** Each object in the array must strictly follow this schema:
    - \`segment_number\` (number): The sequence number.
    - \`segment_title\` (string): The name of the segment (e.g., "Logo Reveal").
    - \`time_range\` (string): The time range for this segment (e.g., "2-4s").
    - \`setting\` (string): Description of the background and atmosphere.
    - \`action_and_movement\` (string): Detailed description of on-screen visuals and animations.
    - \`camera\` (string): Description of camera work.
    - \`visual_style_and_aesthetics\` (string): Description of the lighting, colors, and overall look.
    - \`audio\` (string): Description of music and sound effects.
    - \`text_and_overlays\` (string): Description of any on-screen text and its animation.
    - \`generation_prompt\` (string): A single, complete text prompt combining all relevant visual details from this segment, suitable for direct use by a video AI. It must be tailored to the channel's name and topic.`;

    const promptText = `
      Create a YouTube intro prompt series with the following specifications:
      - Channel Name: ${channelName}
      - Video Topic/Theme: ${videoTopic}
      - Visual Style: ${visualStyle}
      - Energy Level: ${energy}
      - Specific Elements to Include: ${specificElements}
      - Output Format: ${promptFormat}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {parts: [{text: promptText}]},
      config: {
        systemInstruction:
          promptFormat === 'json'
            ? jsonSystemInstruction
            : classicSystemInstruction,
      },
    });

    return response.text;
  };

  const handleGenerateStoryboard = async (
    scenes: string[],
    imageFile: File | null,
    selectedStyle: string,
    promptFormat: 'classic' | 'json',
  ): Promise<{prompts: string; sceneImages: (string | null)[]}> => {
    setGenerationError(null);
    const nonEmptyScenes = scenes.filter((s) => s.trim());

    if (nonEmptyScenes.length === 0) {
      const errorMsg = 'Please add at least one scene to the storyboard.';
      setGenerationError([errorMsg]);
      throw new Error(errorMsg);
    }

    try {
      // Step 1: Create a unified style guide
      let styleGuide =
        selectedStyle !== 'No Style'
          ? `Cinematic Style: ${selectedStyle}.`
          : 'No specific cinematic style has been selected; rely on the reference image (if provided) and scene descriptions for style cues.';
      let imageStyleKeywords = '';
      if (imageFile) {
        try {
          const imageStyle = await analyzeImageStyle(imageFile);
          styleGuide += `\nReference Image Style: ${imageStyle}`;
          imageStyleKeywords = imageStyle;
        } catch (e) {
          console.error(
            'Failed to analyze image style, proceeding without it.',
            e,
          );
        }
      }
      // Step 2: Generate images for each scene description in parallel
      const imagePromises = scenes.map((scene) => {
        if (scene.trim()) {
          const styleForPrompt = [
            selectedStyle !== 'No Style' ? selectedStyle : '',
            imageStyleKeywords,
          ]
            .filter(Boolean)
            .join(', ');
          const fullPrompt = `${
            styleForPrompt ? styleForPrompt + ', ' : ''
          }cinematic shot depicting ${scene.trim()}`;
          return generateImage(fullPrompt, '4:3');
        }
        return Promise.resolve(null);
      });

      const imageResults = await Promise.allSettled(imagePromises);
      const sceneImages = imageResults.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        console.error('Failed to generate scene image:', result.reason);
        return null;
      });

      // Step 3: Build the multi-modal prompt for the master prompt generation
      const promptParts: Part[] = [];
      promptParts.push({
        text: `Based on the following storyboard scenes (text and images), and adhering to the specified cinematic and technical guidance, create a series of detailed, individual shot prompts for a video generation model.`,
      });
      promptParts.push({text: `--- STYLE GUIDANCE ---\n${styleGuide}`});

      scenes.forEach((scene, index) => {
        if (scene.trim()) {
          promptParts.push({text: `Scene ${index + 1}: ${scene.trim()}`});
          const imageBase64 = sceneImages[index];
          if (imageBase64) {
            promptParts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            });
          }
        }
      });

      // Step 4: Generate the master prompt using text and images
      const classicSystemInstruction = `You are a world-class film director and a master prompt engineer for a state-of-the-art video generation AI (like Google's Veo). Your task is to take a storyboard (which includes scene descriptions, reference images, and a style guide) and create a series of powerful, detailed, and distinct shot prompts.

For EACH scene provided by the user, you MUST generate a self-contained prompt block.

**CRITICAL REQUIREMENTS:**
1.  **Separate Prompts per Scene:** DO NOT merge the scenes into one narrative. Create a separate, complete prompt block for each scene.
2.  **Use the EXACT Structure:** Each prompt block MUST start with "--- SCENE [Number] ---" and be followed by the structured format below. Do not deviate from this structure.
3.  **Weights for Guidance:** Pay attention to the (High Weight), (Medium Weight), and (Low Weight) guidance. High weight items are critical to get right.
4.  **Cinematic Language:** Use precise, professional filmmaking terminology.
5.  **Integrate Style:** The "Visuals & Style" section should be heavily influenced by the provided style guide and reference images, applying it consistently to each scene.
6.  **Include Text Overlays:** If the scene content implies it, suggest appropriate text overlays.

**STRUCTURE FOR EACH SCENE:**

--- SCENE [Number] ---

- **Setting (High Weight):** Describe the "where" and "when." Paint a vivid picture of the environment, time of day, and atmosphere.
- **Subject & Character Design (Medium Weight):** The "who" or "what." Describe the main subjects, their appearance, clothing, and key expressions.
- **Action & Movement (High Weight):** What happens in the scene? Describe movements, interactions, and the flow of action.
- **Shots and Camera (High Weight):** Detail the camera work. Specify shot types (e.g., "Medium shot," "Extreme close-up"), camera angles ("Low-angle"), and movements ("Smoothly zooms in," "Slow tilt up"). Suggest a duration (e.g., "3-5 seconds").
- **Lighting and Mood (High Weight):** Describe the lighting (e.g., "dramatic high-contrast," "soft natural sunlight"). Define the emotional tone (e.g., "mysterious and tense," "hopeful and inspiring").
- **Visual Style & Aesthetics (High Weight):** Define the overall look. Refer to the style guide. (e.g., "Photorealistic," "3D Pixar animation," "Clean vector lines").
- **Lens and Optical Effects (Medium Weight):** Mention effects like "shallow depth of field," "lens flare," "rack focus."
- **Temporal Elements (Medium Weight):** Describe the pacing and timing of the scene (e.g., "fast-paced and energetic," "slow and deliberate").
- **Audio (High Weight):** Suggest key sound effects (SFX), ambient sounds, and music cues relevant to THIS scene only.
- **Text Overlay (Medium Weight):** Suggest any on-screen text, its content, font style, and animation (e.g., "Text 'Hello World' fades in at the bottom").`;

      const jsonSystemInstruction = `You are a world-class film director and a master prompt engineer for a state-of-the-art video generation AI (like Google's Veo). Your task is to convert a storyboard (scene descriptions, reference images, style guide) into a structured JSON array.

**CRITICAL INSTRUCTIONS:**
1.  **JSON Array Output ONLY:** Your entire response MUST be a single, valid JSON array. Each object in the array represents a single, distinct shot corresponding to one of the user's scenes. Do not include any text, explanations, or markdown formatting (like \`\`\`json) before or after the JSON.
2.  **One Object Per Scene:** The output array must contain exactly one JSON object for each scene provided in the input.
3.  **Adhere to Schema:** Each object in the array must strictly follow this schema:
    - \`shot_number\` (number): The sequence number (1, 2, 3...).
    - \`scene_description\` (string): The original user-provided text for this scene.
    - \`suggested_duration\` (string): A suggested duration for this shot (e.g., "3-5s").
    - \`subject\` (string): The main focus of the shot.
    - \`action\` (string): A detailed description of what happens in this shot.
    - \`scene\` (string): A detailed description of the setting and atmosphere.
    - \`camera\` (object):
        - \`angle\` (string): e.g., "Extreme close-up", "Low-angle wide shot".
        - \`movement\` (string): e.g., "Static", "Rapid zoom-in", "Slow tilt up".
        - \`lens_effects\` (string): e.g., "Shallow depth of field", "Lens flare".
    - \`style\` (object):
        - \`visual_style\` (string): Primary artistic style, informed by the style guide (e.g., "Photorealistic, cinematic", "3D Pixar animation").
        - \`mood\` (string): The emotional tone (e.g., "Dark and moody", "Whimsical").
        - \`lighting\` (string): Description of the lighting (e.g., "High-contrast, dramatic", "Soft, natural sunlight").
        - \`color_palette\` (string): Key colors (e.g., "Slightly desaturated, cool tones").
    - \`audio\` (object):
        - \`ambience\` (string): Background environmental sounds.
        - \`sfx\` (array of strings): Key sound effects for this shot.
        - \`music\` (string): Description of the music during this shot.
    - \`generation_prompt\` (string): A single, complete and very detailed text prompt combining all relevant details from this object, suitable for direct use by an image/video AI.`;

      const masterPromptResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {parts: promptParts},
        config: {
          systemInstruction:
            promptFormat === 'json'
              ? jsonSystemInstruction
              : classicSystemInstruction,
        },
      });

      let promptText = masterPromptResponse.text;

      if (promptFormat === 'json') {
        // Clean up potential markdown formatting
        promptText = promptText
          .replace(/```json\n?/, '')
          .replace(/```$/, '')
          .trim();
        try {
          // Parse and pretty-print the JSON to ensure it's valid and readable
          const parsedJson = JSON.parse(promptText);
          promptText = JSON.stringify(parsedJson, null, 2);
        } catch (e) {
          console.error(
            'Failed to parse AI response as JSON, returning raw text.',
            e,
          );
          // If parsing fails, we'll just return the raw text. The user might be able to fix it.
        }
      }

      const prompts = promptText;

      return {prompts, sceneImages};
    } catch (e) {
      console.error('Failed to generate storyboard', e);
      setGenerationError([
        'Failed to generate storyboard.',
        'Please check your connection or API key and try again.',
      ]);
      throw new Error('Could not generate storyboard.');
    }
  };

  const handleAnimate = async (prompt: string, imageFile: File | null = null) => {
    setSavingTitle('Generating your scene...');
    setIsSaving(true);
    setGenerationError(null);

    try {
      console.log('Generating image from prompt...', prompt);
      const imageBase64 = await generateImage(prompt, '16:9', imageFile);

      if (!imageBase64) {
        throw new Error('Image generation returned no data.');
      }

      console.log('Generated image data received.');
      const src = `data:image/jpeg;base64,${imageBase64}`;

      setGeneratedResult({imageSrc: src, prompt});
    } catch (error) {
      console.error('Image generation failed:', error);
      setGenerationError([
        'Image generation failed.',
        'Please check your API key or try a different prompt.',
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateImageForCard = async (
    prompt: string,
  ): Promise<string> => {
    return generateImage(prompt, '16:9');
  };

  if (isSaving) {
    return (
      <SavingProgressPage
        title={savingTitle}
        subtitle="Please wait while we generate your image."
      />
    );
  }

  if (playingVideo) {
    return <VideoPlayer video={playingVideo} onClose={handleClosePlayer} />;
  }

  if (generatedResult) {
    return (
      <GeneratedImageModal
        imageSrc={generatedResult.imageSrc}
        prompt={generatedResult.prompt}
        onClose={() => setGeneratedResult(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <AnimateImagePage
        onAnimate={handleAnimate}
        onPlayVideo={setPlayingVideo}
        onGenerateStoryboard={handleGenerateStoryboard}
        onGenerateLogoPrompt={handleGenerateLogoPrompt}
        onGenerateYouTubeIntroPrompt={handleGenerateYouTubeIntroPrompt}
        onGenerateImageForCard={handleGenerateImageForCard}
      />
      {generationError && (
        <ErrorModal
          message={generationError}
          onClose={() => setGenerationError(null)}
          onSelectKey={async () => await window.aistudio?.openSelectKey()}
        />
      )}
    </div>
  );
};
