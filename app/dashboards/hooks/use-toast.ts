import { useState, useEffect } from "react";

export function useToast() {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const show = () => setShowToast(true);
  const hide = () => setShowToast(false);

  return { showToast, show, hide };
}

