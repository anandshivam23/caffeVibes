import React from 'react';

/**
 * Base skeleton shape component with 3 shimmer speed layers and pulsing.
 */
export function SkeletonBase({ className = '', style = {}, variant = 'rectangle', index = 0 }) {
  const baseClasses = `
    relative overflow-hidden bg-text-main/[0.03] animate-skeleton-pulse
    ${variant === 'circle' ? 'rounded-full' : variant === 'card' ? 'rounded-2xl sm:rounded-[2rem]' : 'rounded-xl'}
    ${className}
  `;

  // Apply staggered delay for both pulse animation and shimmers
  const staggerStyle = {
    animationDelay: `${index * 150}ms`,
    ...style,
  };

  return (
    <div className={baseClasses} style={staggerStyle}>
      {/* Three layers of shimmers with different speeds */}
      <div 
        className="absolute inset-0 skeleton-shimmer-layer-1 pointer-events-none" 
        style={{ animationDelay: `${index * 150}ms` }} 
      />
      <div 
        className="absolute inset-0 skeleton-shimmer-layer-2 pointer-events-none" 
        style={{ animationDelay: `${index * 150 + 200}ms` }} 
      />
      <div 
        className="absolute inset-0 skeleton-shimmer-layer-3 pointer-events-none" 
        style={{ animationDelay: `${index * 150 + 400}ms` }} 
      />
    </div>
  );
}

/**
 * Skeleton Loader for VideoCard.
 */
export function VideoCardSkeleton({ index = 0, compact = false }) {
  return (
    <div className={`flex flex-col w-full ${compact ? 'gap-2 sm:gap-3 mb-2' : 'gap-3 sm:gap-5 mb-4 sm:mb-6'}`}>
      {/* 16:9 Thumbnail aspect-video */}
      <SkeletonBase 
        variant="card" 
        className="aspect-video w-full border border-text-main/5" 
        index={index} 
      />
      
      {/* Details Row */}
      <div className={`flex items-start gap-4 ${compact ? 'px-1' : 'px-2'}`}>
        {!compact && (
          <SkeletonBase 
            variant="rectangle" 
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl shrink-0" 
            index={index} 
          />
        )}
        <div className="flex-1 flex flex-col gap-2 py-1">
          {/* Title Lines */}
          <SkeletonBase 
            variant="rectangle" 
            className="h-4 sm:h-5 w-11/12 rounded-lg" 
            index={index} 
          />
          <SkeletonBase 
            variant="rectangle" 
            className="h-4 sm:h-5 w-2/3 rounded-lg" 
            index={index} 
          />
          
          {/* Meta rows */}
          <div className="flex items-center gap-2 mt-1">
            <SkeletonBase 
              variant="rectangle" 
              className="h-3 w-16 rounded-md" 
              index={index} 
            />
            <div className="w-1 h-1 rounded-full bg-text-main/5" />
            <SkeletonBase 
              variant="rectangle" 
              className="h-3 w-20 rounded-md" 
              index={index} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for TweetCard.
 */
export function TweetCardSkeleton({ index = 0, isReply = false }) {
  return (
    <div 
      className={`relative flex gap-3 sm:gap-5 w-full h-full bg-surface border border-text-main/5 p-3 sm:p-5 md:p-7 rounded-2xl md:rounded-[2.5rem] shadow-lg ${isReply ? 'ml-0 pl-3 sm:pl-5 bg-transparent border-none shadow-none' : ''}`}
    >
      {/* Left Column: Avatar */}
      <div className="flex flex-col items-center shrink-0">
        <SkeletonBase 
          variant="rectangle" 
          className={`rounded-xl border border-text-main/10 ${isReply ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'}`} 
          index={index} 
        />
      </div>

      {/* Right Column: Title, Content lines, Actions */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Header (fullName, handle, date) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <SkeletonBase 
              variant="rectangle" 
              className="h-4 w-28 rounded-md" 
              index={index} 
            />
            <SkeletonBase 
              variant="rectangle" 
              className="h-3.5 w-16 rounded-md" 
              index={index} 
            />
            <SkeletonBase 
              variant="rectangle" 
              className="h-3 w-12 rounded-md" 
              index={index} 
            />
          </div>
        </div>

        {/* Content text lines with varying width */}
        <div className="flex flex-col gap-2 mt-1">
          <SkeletonBase 
            variant="rectangle" 
            className="h-4.5 w-full rounded-md" 
            index={index} 
          />
          <SkeletonBase 
            variant="rectangle" 
            className="h-4.5 w-11/12 rounded-md" 
            index={index} 
          />
          <SkeletonBase 
            variant="rectangle" 
            className="h-4.5 w-4/5 rounded-md" 
            index={index} 
          />
        </div>

        {/* Action button skeletons */}
        <div className="flex items-center gap-6 pt-3 mt-auto">
          <SkeletonBase 
            variant="rectangle" 
            className="h-7 w-12 rounded-lg" 
            index={index} 
          />
          <SkeletonBase 
            variant="rectangle" 
            className="h-7 w-12 rounded-lg" 
            index={index} 
          />
          <div className="flex-1" />
          <SkeletonBase 
            variant="rectangle" 
            className="h-5 w-14 rounded-lg" 
            index={index} 
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for Profile.
 */
export function ProfileSkeleton({ index = 0 }) {
  return (
    <div className="relative pb-10 w-full">
      {/* Cover Banner Skeleton */}
      <SkeletonBase 
        variant="rectangle" 
        className="w-full h-40 sm:h-48 md:h-64 rounded-2xl" 
        index={index} 
      />

      {/* Profile Info / Avatar overlay header */}
      <div className="px-3 sm:px-4 lg:px-6 -mt-16 sm:-mt-20 flex flex-col lg:flex-row items-center lg:items-end gap-4 lg:gap-6 relative z-20">
        <SkeletonBase 
          variant="rectangle" 
          className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-[2rem] sm:rounded-[2.5rem] border-4 border-background shrink-0 shadow-2xl" 
          index={index} 
        />
        
        {/* Profile Info Lines */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left min-w-0 w-full gap-3 pb-3 lg:pb-6">
          <SkeletonBase 
            variant="rectangle" 
            className="h-10 w-64 rounded-xl" 
            index={index} 
          />
          
          <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
            <SkeletonBase 
              variant="rectangle" 
              className="h-4 w-24 rounded-md" 
              index={index} 
            />
            <SkeletonBase 
              variant="rectangle" 
              className="h-4 w-36 rounded-md" 
              index={index} 
            />
          </div>

          {/* Stats Box & Subscribe Row */}
          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
            <SkeletonBase 
              variant="rectangle" 
              className="h-14 w-full sm:w-[320px] rounded-2xl md:rounded-3xl" 
              index={index} 
            />
            <SkeletonBase 
              variant="rectangle" 
              className="h-10 w-28 rounded-2xl sm:ml-auto" 
              index={index} 
            />
          </div>
        </div>
      </div>

      {/* Tabs Row Skeletons */}
      <div className="mt-8 mx-3 sm:mx-4 lg:mx-6">
        <SkeletonBase 
          variant="rectangle" 
          className="h-12 w-96 rounded-full" 
          index={index} 
        />
      </div>

      {/* Content Grid Skeleton */}
      <div className="py-8 px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <VideoCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for VideoPlayer page.
 */
export function VideoPlayerSkeleton({ index = 0 }) {
  return (
    <div className="pb-12 w-full max-w-7xl mx-auto">
      {/* 16:9 Aspect Video Player Placeholder */}
      <SkeletonBase 
        variant="card" 
        className="w-full aspect-video rounded-xl md:rounded-2xl shadow-2xl mb-6" 
        index={index} 
      />

      {/* Title & Info Section */}
      <div className="px-2 md:px-0">
        <SkeletonBase 
          variant="rectangle" 
          className="h-10 w-3/4 rounded-xl mb-4" 
          index={index} 
        />

        {/* Channel Info & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-surface-hover/60">
          <div className="flex items-center gap-4">
            <SkeletonBase 
              variant="circle" 
              className="w-12 h-12 rounded-full shrink-0" 
              index={index} 
            />
            <div className="flex flex-col gap-1.5">
              <SkeletonBase 
                variant="rectangle" 
                className="h-5 w-32 rounded-md" 
                index={index} 
              />
              <SkeletonBase 
                variant="rectangle" 
                className="h-3.5 w-20 rounded-md" 
                index={index} 
              />
            </div>
            <SkeletonBase 
              variant="rectangle" 
              className="h-9 w-28 rounded-full ml-4" 
              index={index} 
            />
          </div>

          {/* Action buttons (likes, save, dots) */}
          <div className="flex items-center gap-2">
            <SkeletonBase 
              variant="rectangle" 
              className="h-10 w-36 rounded-full" 
              index={index} 
            />
            <SkeletonBase 
              variant="rectangle" 
              className="h-10 w-20 rounded-full" 
              index={index} 
            />
            <SkeletonBase 
              variant="circle" 
              className="w-10 h-10 rounded-full shrink-0" 
              index={index} 
            />
          </div>
        </div>

        {/* Description Box Skeleton */}
        <SkeletonBase 
          variant="rectangle" 
          className="w-full h-32 rounded-2xl mt-6 p-5" 
          index={index} 
        />

        {/* Comments Section Skeleton Header & Input */}
        <div className="mt-10 flex flex-col gap-6">
          <SkeletonBase 
            variant="rectangle" 
            className="h-7 w-40 rounded-lg" 
            index={index} 
          />
          <div className="flex gap-4 mb-4">
            <SkeletonBase 
              variant="circle" 
              className="w-11 h-11 rounded-full shrink-0" 
              index={index} 
            />
            <SkeletonBase 
              variant="rectangle" 
              className="h-11 flex-1 rounded-xl" 
              index={index} 
            />
          </div>

          {/* Comment items placeholders */}
          <div className="space-y-6 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <SkeletonBase 
                  variant="circle" 
                  className="w-10 h-10 rounded-full shrink-0" 
                  index={i} 
                />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <SkeletonBase 
                      variant="rectangle" 
                      className="h-4 w-24 rounded-md" 
                      index={i} 
                    />
                    <SkeletonBase 
                      variant="rectangle" 
                      className="h-3 w-12 rounded-md" 
                      index={i} 
                    />
                  </div>
                  <SkeletonBase 
                    variant="rectangle" 
                    className="h-4.5 w-11/12 rounded-md" 
                    index={i} 
                  />
                  <SkeletonBase 
                    variant="rectangle" 
                    className="h-4.5 w-3/4 rounded-md" 
                    index={i} 
                  />
                  <div className="flex items-center gap-4 mt-1">
                    <SkeletonBase 
                      variant="rectangle" 
                      className="h-5 w-10 rounded-md" 
                      index={i} 
                    />
                    <SkeletonBase 
                      variant="rectangle" 
                      className="h-5 w-12 rounded-md" 
                      index={i} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Default wrapper combining variants or rendering defaults.
 */
export default function SkeletonLoader({ variant = 'feed', count = 6, compact = false }) {
  if (variant === 'video') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 w-full">
        {[...Array(count)].map((_, i) => (
          <VideoCardSkeleton key={i} index={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (variant === 'tweet') {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-2xl">
        {[...Array(count)].map((_, i) => (
          <TweetCardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  if (variant === 'profile') {
    return <ProfileSkeleton index={0} />;
  }

  if (variant === 'videoplayer') {
    return <VideoPlayerSkeleton index={0} />;
  }

  // Combined 'feed' skeleton based on standard lists
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl">
      {[...Array(count)].map((_, i) => (
        <TweetCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
