/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from './types';

/** Base URL for static files. */
const staticFilesUrl =
  'https://www.gstatic.com/aistudio/starter-apps/veo3-gallery/';

/**
 * A diverse gallery of items to showcase the app's powerful and versatile
 * video generation capabilities across different styles.
 */
export const GALLERY_ITEMS: Video[] = [
  {
    id: 'noir-thriller-1',
    title: 'Midnight Detective',
    description:
      'A shadowy figure in a trench coat stands under a flickering streetlamp on a rain-slicked city street. Classic noir style.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-noir.jpg',
    videoUrl: staticFilesUrl + 'Abstract_Cinematic_The_Mechanical_Heartbeat.mp4',
  },
  {
    id: 'epic-fantasy-1',
    title: "Dragon's Peak",
    description:
      'A majestic dragon soars over a breathtaking mountain landscape dotted with ancient ruins and waterfalls. Epic fantasy feel.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-fantasy.jpg',
    videoUrl: staticFilesUrl + 'Animals_in_Nature_Bear_and_River.mp4',
  },
  {
    id: 'scifi-dystopian-1',
    title: 'Neon Alley',
    description:
      'A lone cyborg navigates a crowded, rain-soaked alley illuminated by holographic advertisements in a futuristic, dystopian city.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-scifi.jpg',
    videoUrl: staticFilesUrl + 'Claymation_Robot_s_Existential_Crisis.mp4',
  },
  {
    id: 'ghibli-1',
    title: 'Whispering Woods',
    description:
      'A young adventurer discovers a hidden, sun-dappled clearing in a lush forest, rendered in a beautiful, whimsical hand-drawn anime style.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-ghibli.jpg',
    videoUrl: staticFilesUrl + 'Kyoto_Serenity_From_Scene_to_Postcard.mp4',
  },
  {
    id: 'pixar-1',
    title: 'Friendly Robot',
    description:
      'A whimsical, friendly robot waves hello from a colorful, sunlit workshop, brought to life in a warm, 3D animated style.',
    imageUrl:
      'https://storage.googleapis.com/aistudio-hosting/story-workshop/style-pixar.jpg',
    videoUrl: staticFilesUrl + 'Live_Performance_Soulful_Singer_s_Ballad.mp4',
  },
];
