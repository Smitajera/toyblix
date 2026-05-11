import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  // Extracts pathname property(key) from an object
  const { pathname } = useLocation();

  // Automatically scrolls to top whenever pathname changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth" // Matches the smooth scrolling we added to your CSS!
    });
  }, [pathname]);

  return null; // This component renders nothing to the screen
};

export default ScrollToTop;