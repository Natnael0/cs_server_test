import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { CATEGORIES } from "../constants";

const BuildContext = createContext(null);

const emptySelected = Object.fromEntries(CATEGORIES.map(c => [c.key, null]));

export function BuildProvider({ children }) {
  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem("build.selected");
      return raw ? { ...emptySelected, ...JSON.parse(raw) } : emptySelected;
    } catch {
      return emptySelected;
    }
  });

  // Track if we just saved manually to prevent useEffect from overwriting
  const justSavedRef = useRef(false);

  useEffect(() => {
    // Skip save if we just saved manually (to avoid overwriting)
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }
    localStorage.setItem("build.selected", JSON.stringify(selected));
  }, [selected]);

  const addPart = (categoryKey, part) => {
    setSelected(s => {
      const updated = { ...s, [categoryKey]: part };
      try {
        localStorage.setItem("build.selected", JSON.stringify(updated));
        justSavedRef.current = true;
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      return updated;
    });
  };

  const addMultipleParts = (parts) => {
    console.log('[BuildContext] addMultipleParts called with:', Object.keys(parts));
    setSelected(s => {
      const updated = { ...s, ...parts };
      console.log('[BuildContext] State update - keys:', Object.keys(updated));
      console.log('[BuildContext] Parts being merged:', Object.keys(parts).map(k => ({
        key: k,
        hasId: !!parts[k]?.id,
        hasName: !!parts[k]?.name,
        id: parts[k]?.id,
        name: parts[k]?.name?.substring(0, 30)
      })));
      // Immediately save to localStorage to avoid timing issues
      try {
        const saved = JSON.stringify(updated);
        localStorage.setItem("build.selected", saved);
        justSavedRef.current = true; // Mark that we just saved manually
        console.log('[BuildContext] Immediately saved to localStorage');
        // Verify what was saved
        const verify = JSON.parse(localStorage.getItem("build.selected") || "{}");
        console.log('[BuildContext] Verification - saved keys:', Object.keys(verify));
        Object.keys(parts).forEach(k => {
          const savedPart = verify[k];
          console.log(`[BuildContext] ${k}:`, {
            exists: !!savedPart,
            hasId: !!savedPart?.id,
            hasName: !!savedPart?.name,
            id: savedPart?.id,
            name: savedPart?.name?.substring(0, 30)
          });
        });
      } catch (error) {
        console.error('[BuildContext] Error saving to localStorage:', error);
      }
      return updated;
    });
  };

  const removePart = (categoryKey) => {
    setSelected(s => {
      const updated = { ...s, [categoryKey]: null };
      try {
        localStorage.setItem("build.selected", JSON.stringify(updated));
        justSavedRef.current = true;
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      return updated;
    });
  };

  const clearBuild = () => {
    try {
      localStorage.setItem("build.selected", JSON.stringify(emptySelected));
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
    setSelected(emptySelected);
  };

  const value = useMemo(() => ({
    selected, addPart, addMultipleParts, removePart, clearBuild
  }), [selected]);

  return <BuildContext.Provider value={value}>{children}</BuildContext.Provider>;
}

export function useBuild() {
  const ctx = useContext(BuildContext);
  if (!ctx) throw new Error("useBuild must be used inside <BuildProvider>");
  return ctx;
}
