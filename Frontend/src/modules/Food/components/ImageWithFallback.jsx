import React, { useState, useEffect } from 'react';
import { normalizeImageUrl } from '@food/utils/common';

/**
 * Stateful Image component that safely handles load errors.
 * Instead of mutating the DOM directly (which gets reset on parent re-renders),
 * it stores the error state in React state and persists the fallback render.
 */
export const ImageWithFallback = React.memo(({ src: rawSrc, alt, fallbackSrc, className, style, ...props }) => {
  const [hasError, setHasError] = useState(false);
  const src = normalizeImageUrl(rawSrc);

  // Reset error state if the src prop changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
  };

  const finalSrc = hasError || !src ? fallbackSrc : src;

  // If the fallback itself is rendered or if there is no src/fallback, we handle empty gracefully
  if (!finalSrc) {
    return (
      <div 
        className={`bg-slate-100 flex items-center justify-center text-slate-400 ${className}`}
        style={style}
      >
        <span className="text-xs">?</span>
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      {...props}
    />
  );
});

export default ImageWithFallback;
