import { useEffect, useState } from 'react';
import './seasonal.css';
import './styles/_october.scss';

const OCTOBER_TYPES = ['skull', 'pumpkin', 'leaf'];
const OCTOBER_SIZES = ['', '_md', '_lg'];
const SKELETON_DURATION = 2000;
const OCTOBER_DISPLAY_DURATION = 3500;

function HalloweenSkeleton({ onComplete }) {
  const [loading, setLoading] = useState(true);
  const [showHalloween, setShowHalloween] = useState(false);

  useEffect(() => {
    const month = new Date().getMonth();

    if (month === 8 || month === 9) {
      setShowHalloween(true);
    } else {
      onComplete();
      return undefined;
    }

    const skeletonTimer = window.setTimeout(() => {
      setLoading(false);
    }, SKELETON_DURATION);
    const completeTimer = window.setTimeout(onComplete, SKELETON_DURATION + OCTOBER_DISPLAY_DURATION);

    return () => {
      window.clearTimeout(skeletonTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!showHalloween) return null;

  return (
    <div className="seasonal-container">
      {loading ? (
        <span className="seasonal-skeleton" />
      ) : (
        <>
          <span className="seasonal-halloween">🍂 🎃 👻 🕸️</span>
          {Array.from({ length: 24 }, (_, index) => (
            <span
              key={index}
              className={`october _${index + 1} ${OCTOBER_SIZES[index % OCTOBER_SIZES.length]} ${OCTOBER_TYPES[index % OCTOBER_TYPES.length]}`}
              aria-hidden="true"
            />
          ))}
        </>
      )}
    </div>
  );
}

export default HalloweenSkeleton;
