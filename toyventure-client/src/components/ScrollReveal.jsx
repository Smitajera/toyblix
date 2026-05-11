import React, { useEffect, useRef } from "react";

const ScrollReveal = ({ as: Component = "div", className = "", delay = 0, children, ...props }) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          // Use requestAnimationFrame for buttery smooth rendering
          requestAnimationFrame(() => {
            element.classList.add("is-visible");
          });
          observer.disconnect(); // Stop observing once revealed
        }
      },
      {
        threshold: 0, // Trigger immediately (0% visible)
        // Trigger 200px BEFORE the element even enters the viewport
        rootMargin: "200px 0px 200px 0px",
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Hard cap the delay to 100ms max so grid items never take too long to appear
  const snappyDelay = Math.min(delay, 100);

  return (
    <Component
      ref={elementRef}
      className={`reveal-section ${className}`}
      style={{
        transitionDelay: `${snappyDelay}ms`,
        transitionDuration: '400ms',
        willChange: 'opacity, transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;