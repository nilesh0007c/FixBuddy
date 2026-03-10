// src/components/ui/StarRating.jsx
import React from 'react';
import '../../App.css';

/**
 * StarRating
 * Props:
 *  rating      — current rating value (0-5)
 *  interactive — enable click-to-rate
 *  onRate      — callback(starValue) when a star is clicked
 *  size        — 'sm' | 'md' (default) | 'lg'
 */
const StarRating = ({ rating = 0, interactive = false, onRate, size = 'md' }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="stars" aria-label={`Rating: ${rating} out of 5`}>
      {stars.map(star => (
        <span
          key={star}
          className={[
            'star',
            star <= Math.round(rating) ? 'filled' : '',
            interactive ? 'interactive' : '',
            `star-${size}`,
          ].filter(Boolean).join(' ')}
          onClick={() => interactive && onRate && onRate(star)}
          role={interactive ? 'button' : undefined}
          aria-label={interactive ? `Rate ${star} stars` : undefined}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;