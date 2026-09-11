import { useEffect, useRef, useState } from 'react';

function ScrollCursor() {
  const coreRef = useRef(null);
  const positionRef = useRef({ x: -100, y: -100 });
  const [section, setSection] = useState('home');

  useEffect(() => {
    const root = document.documentElement;
    let animationFrame;

    root.classList.add('has-scroll-cursor');

    const updatePosition = (event) => {
      positionRef.current = { x: event.clientX, y: event.clientY };
    };

    const updateSection = () => {
      const midpoint = window.innerHeight / 2;
      const visibleSection = [...document.querySelectorAll('[data-cursor-section]')]
        .map((element) => ({
          name: element.dataset.cursorSection,
          distance: Math.abs(element.getBoundingClientRect().top + element.offsetHeight / 2 - midpoint),
          visible: element.getBoundingClientRect().bottom > 0 && element.getBoundingClientRect().top < window.innerHeight,
        }))
        .filter((item) => item.visible)
        .sort((first, second) => first.distance - second.distance)[0];

      if (visibleSection) setSection(visibleSection.name);
    };

    const renderTrail = () => {
      const { x, y } = positionRef.current;

      if (coreRef.current) {
        coreRef.current.style.left = `${x}px`;
        coreRef.current.style.top = `${y}px`;
      }

      animationFrame = window.requestAnimationFrame(renderTrail);
    };

    window.addEventListener('pointermove', updatePosition);
    window.addEventListener('scroll', updateSection, { passive: true });
    window.addEventListener('resize', updateSection);
    updateSection();
    animationFrame = window.requestAnimationFrame(renderTrail);

    return () => {
      root.classList.remove('has-scroll-cursor');
      window.removeEventListener('pointermove', updatePosition);
      window.removeEventListener('scroll', updateSection);
      window.removeEventListener('resize', updateSection);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className={`scroll-cursor scroll-cursor--${section}`} aria-hidden="true">
      <span ref={coreRef} className="scroll-cursor__core" />
    </div>
  );
}

export default ScrollCursor;