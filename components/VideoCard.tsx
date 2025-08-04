/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useRef, useState} from 'react';
import {Video} from '../types';
import {PlayIcon} from './icons';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
}

/**
 * A component that renders a video card with a thumbnail image that
 * transitions to a playing video on hover. Clicking the card opens the full player.
 */
export const VideoCard: React.FC<VideoCardProps> = ({video, onPlay}) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    videoRef.current?.play().catch(() => {
      // Autoplay might be blocked by the browser.
      // This is fine as the user can still click to play in the modal.
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    videoRef.current?.pause();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <button
      type="button"
      className="group w-full text-left bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-purple-500/30 transform transition-all duration-300 hover:-translate-y-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 relative"
      onClick={() => onPlay(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      aria-label={`Play video: ${video.title}`}>
      <div className="w-full h-96">
        <img
          src={video.imageUrl}
          alt={`Static image of ${video.title}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          src={video.videoUrl}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
        <PlayIcon className="w-16 h-16 text-white drop-shadow-lg" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <h3
          className="text-lg font-semibold text-white truncate"
          title={video.title}>
          {video.title}
        </h3>
        <p className="text-sm text-gray-300 truncate" title={video.description}>
          {video.description}
        </p>
      </div>
    </button>
  );
};
