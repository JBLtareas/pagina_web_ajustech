import { useEffect } from 'react';
import './seasonal.css';
import './styles/seasons.css';
import './styles/halloweenmode.scss';
import './styles/_autumn.scss';
import './styles/_winter.scss';

const SEASON_CLASSES = ['season-autumn', 'season-halloween', 'season-winter', 'season-spring', 'season-summer'];

const OCTOBER_TYPES = ['skull', 'pumpkin', 'leaf'];
const OCTOBER_SIZES = ['', '_md', '_lg'];

const HOJAS_COUNT = 48;
const HOJAS_MD_COUNT = 16;
const HOJAS_LG_COUNT = 12;

const SNOW_COUNT = 48;
const SNOW_MD_COUNT = 16;
const SNOW_LG_COUNT = 12;

/** Forzar preview: 'winter' | 'autumn' | 'halloween' | 'spring' | 'summer' | null (= calendario) */
const FORCE_SEASON = null;

/** @returns {'halloween' | 'autumn' | 'winter' | 'spring' | 'summer'} */
export function getSeason(date = new Date()) {
  if (FORCE_SEASON) return FORCE_SEASON;

  const month = date.getMonth();

  // Halloween solo septiembre (8) y octubre (9)
  if (month === 8 || month === 9) return 'halloween';
  if (month === 11 || month === 0 || month === 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month === 10) return 'autumn'; // noviembre
  return 'summer';
}

export function useSeasonTheme() {
  const season = getSeason();

  useEffect(() => {
    const body = document.body;

    SEASON_CLASSES.forEach((className) => body.classList.remove(className));
    body.classList.add(`season-${season}`);

    return () => {
      SEASON_CLASSES.forEach((className) => body.classList.remove(className));
    };
  }, [season]);
}

function AutumnLeaves() {
  return (
    <div className="hojas-area" aria-hidden="true">
      {Array.from({ length: HOJAS_COUNT }, (_, index) => (
        <div key={`hoja-${index}`} className={`hojasflake _${index + 1}`} />
      ))}
      {Array.from({ length: HOJAS_MD_COUNT }, (_, index) => (
        <div key={`hoja-md-${index}`} className={`hojasecaflake _md _md-${index + 1}`} />
      ))}
      {Array.from({ length: HOJAS_LG_COUNT }, (_, index) => (
        <div key={`hoja-lg-${index}`} className={`hojaslake _lg _lg-${index + 1}`} />
      ))}
    </div>
  );
}

function WinterSnow() {
  return (
    <div className="snowflake-area" aria-hidden="true">
      {Array.from({ length: SNOW_COUNT }, (_, index) => (
        <div key={`snow-${index}`} className={`snowflake _${index + 1}`} />
      ))}
      {Array.from({ length: SNOW_MD_COUNT }, (_, index) => (
        <div key={`snow-md-${index}`} className={`snowflake _md _md-${index + 1}`} />
      ))}
      {Array.from({ length: SNOW_LG_COUNT }, (_, index) => (
        <div key={`snow-lg-${index}`} className={`snowflake _lg _lg-${index + 1}`} />
      ))}
    </div>
  );
}

function HalloweenParticles() {
  return (
    <div className="october-area" aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => (
        <span
          key={index}
          className={`october _${index + 1} ${OCTOBER_SIZES[index % OCTOBER_SIZES.length]} ${OCTOBER_TYPES[index % OCTOBER_TYPES.length]}`}
        />
      ))}
    </div>
  );
}

export function SeasonalEffects() {
  const season = getSeason();

  if (season === 'halloween') {
    return (
      <>
        <AutumnLeaves />
        <HalloweenParticles />
      </>
    );
  }

  if (season === 'autumn') {
    return <AutumnLeaves />;
  }

  if (season === 'winter') {
    return <WinterSnow />;
  }

  return null;
}

function HalloweenSkeleton({ onComplete }) {
  const season = getSeason();
  const showLoadingDecor = season === 'halloween' || season === 'autumn' || season === 'winter';

  useEffect(() => {
    onComplete();
  }, [onComplete]);

  if (!showLoadingDecor) return null;

  const badge =
    season === 'winter'
      ? '❄️ 🎄 ✨'
      : season === 'halloween'
        ? '🍂 🎃 👻 🕸️'
        : '🍂 🍁 🍃';

  return (
    <div className="seasonal-container" aria-hidden="true">
      <span className="seasonal-halloween">{badge}</span>
    </div>
  );
}

export default HalloweenSkeleton;
