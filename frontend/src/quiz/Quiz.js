import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBuild } from "../context/BuildContext";
import { getAllParts } from "../api/client";
import { buildGenerator } from "./buildGenerator";
import { questions } from "./questions";
import { CATEGORIES } from "../constants";

export default function Quiz() {
  const navigate = useNavigate();
  const { addPart, addMultipleParts, clearBuild, selected: currentSelected } = useBuild();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
  const [allParts, setAllParts] = useState({});
  const [partsLoaded, setPartsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 10 });

  useEffect(() => {
    const fetchAllParts = async () => {
      const categories = ['cpus', 'motherboards', 'gpus', 'memory', 'storage', 'psus', 'coolers', 'cases', 'monitors', 'os'];
      const partsData = {};
      
      let completedCount = 0;
      const updateProgress = () => {
        completedCount++;
        setLoadingProgress({ loaded: completedCount, total: categories.length });
      };
      
      const fetchPromises = categories.map(async (cat) => {
        try {
          const data = await getAllParts(cat);
          const results = data.results || [];
          partsData[cat] = results;
          updateProgress();
          return { cat, success: true, count: results.length };
        } catch (error) {
          partsData[cat] = [];
          updateProgress();
          return { cat, success: false, error: error.message };
        }
      });
      
      await Promise.all(fetchPromises);
      
      const totalParts = Object.values(partsData).reduce((sum, arr) => sum + arr.length, 0);
      
      setAllParts(partsData);
      setPartsLoaded(true);
      
      if (totalParts === 0) {
        console.error('WARNING: No parts were loaded! Check API connection.');
      }
    };
    
    fetchAllParts();
    // Clear build on mount only
    clearBuild();
  }, []); // Remove clearBuild from dependencies to avoid re-clearing

  const handleAnswer = (value) => {
    const question = questions[currentQuestion];
    setAnswers({ ...answers, [question.id]: value });
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      if (!partsLoaded) {
        alert('Parts are still loading. Please wait a moment and try again.');
        return;
      }
      generateBuild({ ...answers, [question.id]: value });
    }
  };

  const generateBuild = async (finalAnswers) => {
    setGenerating(true);
    
    try {
      // Wait for parts to be loaded if they're not ready
      let waitCount = 0;
      while (Object.keys(allParts).length === 0 && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        waitCount++;
      }
      
      // Check if we have parts
      if (!allParts || Object.keys(allParts).length === 0) {
        console.error('No parts loaded! Cannot generate build.');
        alert('Parts are still loading. Please wait a moment and try again, or use the manual build option.');
        setGenerating(false);
        return;
      }
      
      // Double-check parts are available
      if (!allParts || Object.keys(allParts).length === 0) {
        console.error('allParts is empty!', allParts);
        alert('Parts failed to load. Please refresh the page and try again.');
        setGenerating(false);
        return;
      }
      
      const build = buildGenerator.selectPartsForBuild(finalAnswers, allParts);
      
      console.log('=== BUILD GENERATION RESULT ===');
      console.log('Build object:', build);
      console.log('Build type:', typeof build);
      console.log('Build is array?', Array.isArray(build));
      console.log('Build keys:', Object.keys(build || {}));
      
      // Validate build object structure
      if (!build || typeof build !== 'object' || Array.isArray(build)) {
        console.error('❌ Invalid build object structure:', build);
        alert('Failed to generate build. Invalid build structure. Please try again.');
        setGenerating(false);
        return;
      }
      
      // Check if build is empty
      const buildKeys = Object.keys(build || {});
      if (!build || buildKeys.length === 0) {
        console.error('❌ Build object is empty!');
        console.error('allParts keys:', Object.keys(allParts));
        console.error('allParts counts:', Object.keys(allParts).map(k => `${k}: ${allParts[k]?.length || 0}`));
        console.error('Sample parts:', {
          cpus: allParts.cpus?.[0],
          motherboards: allParts.motherboards?.[0],
          gpus: allParts.gpus?.[0]
        });
        alert('Failed to generate build. No parts were selected. Please try again or use the manual build option.');
        setGenerating(false);
        return;
      }
      
      // Log detailed info about each part in the build
      console.log('=== BUILD PARTS DETAIL ===');
      for (const key of buildKeys) {
        const part = build[key];
        console.log(`${key}:`, {
          exists: !!part,
          type: typeof part,
          isObject: typeof part === 'object',
          isArray: Array.isArray(part),
          id: part?.id,
          name: part?.name,
          hasId: !!part?.id,
          hasName: !!part?.name,
          keys: part ? Object.keys(part).slice(0, 10) : []
        });
      }
      
      // Prepare build update - start fresh, don't merge with existing
      const buildUpdate = {};
      let partsAdded = 0;
      
      // Process each part in the build
      for (const categoryKey of buildKeys) {
        const part = build[categoryKey];
        
        // Skip if part is null, undefined, or not an object
        if (!part || typeof part !== 'object' || Array.isArray(part)) {
          console.warn(`Skipping ${categoryKey}: invalid part`, part);
          continue;
        }
        
        // Create a clean copy
        const cleanPart = { ...part };
        
        // Ensure id exists
        if (!cleanPart.id) {
          if (cleanPart.name) {
            cleanPart.id = cleanPart.name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
          }
          if (!cleanPart.id) {
            cleanPart.id = `part-${categoryKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
        }
        
        // Ensure name exists
        if (!cleanPart.name) {
          cleanPart.name = cleanPart.model || cleanPart.part_number || cleanPart.manufacturer || `Selected ${categoryKey}`;
        }
        
        // Add to build update
        buildUpdate[categoryKey] = cleanPart;
        partsAdded++;
        console.log(`✓ Added ${categoryKey}: ${cleanPart.name} (ID: ${cleanPart.id})`);
      }
      
      console.log(`Prepared ${partsAdded} parts to add to build`);
      
      // Final validation - ensure all parts have id and name
      const missingFields = [];
      for (const key of Object.keys(buildUpdate)) {
        const part = buildUpdate[key];
        if (!part.id) {
          missingFields.push(`${key} missing id`);
        }
        if (!part.name) {
          missingFields.push(`${key} missing name`);
        }
      }
      
      if (missingFields.length > 0) {
        console.error('❌ Parts missing required fields:', missingFields);
        console.error('buildUpdate:', buildUpdate);
      }
      
      // Final check
      if (partsAdded === 0) {
        console.error('❌ No valid parts found in build!');
        console.error('Build object:', build);
        console.error('Build keys:', Object.keys(build));
        console.error('allParts available:', Object.keys(allParts).map(k => `${k}: ${allParts[k]?.length || 0}`));
        alert('No parts could be selected. Please check the console for details or try the manual build option.');
        setGenerating(false);
        return;
      }
      
      console.log(`✅ All ${partsAdded} parts validated and ready to save`);
      
      // Update React state - use addMultipleParts to update all at once
      // This avoids race conditions from multiple sequential addPart calls
      console.log('=== UPDATING REACT STATE ===');
      console.log('buildUpdate has', Object.keys(buildUpdate).length, 'parts');
      
      // Log each part before adding
      for (const categoryKey of Object.keys(buildUpdate)) {
        const part = buildUpdate[categoryKey];
        console.log(`Preparing to add ${categoryKey}:`, {
          id: part.id,
          name: part.name,
          hasId: !!part.id,
          hasName: !!part.name,
          type: typeof part,
          isObject: typeof part === 'object',
          keys: Object.keys(part).slice(0, 5)
        });
      }
      
      // Update all parts in a single state update
      console.log('=== BEFORE SAVING ===');
      console.log('Calling addMultipleParts with', Object.keys(buildUpdate).length, 'parts');
      console.log('buildUpdate structure:', Object.keys(buildUpdate).map(k => ({
        key: k,
        hasId: !!buildUpdate[k].id,
        hasName: !!buildUpdate[k].name,
        id: buildUpdate[k].id,
        name: buildUpdate[k].name?.substring(0, 30),
        type: typeof buildUpdate[k],
        isObject: typeof buildUpdate[k] === 'object',
        keys: Object.keys(buildUpdate[k]).slice(0, 5)
      })));
      console.log('Full buildUpdate JSON:', JSON.stringify(buildUpdate, null, 2).substring(0, 500));
      
      // Check current localStorage before update
      const beforeSave = JSON.parse(localStorage.getItem("build.selected") || "{}");
      console.log('localStorage BEFORE update:', Object.keys(beforeSave));
      
      // Save directly to localStorage FIRST as a backup
      try {
        const currentStored = JSON.parse(localStorage.getItem("build.selected") || "{}");
        const updatedStored = { ...currentStored, ...buildUpdate };
        localStorage.setItem("build.selected", JSON.stringify(updatedStored));
        console.log('✓ Direct save to localStorage completed');
        
        // Verify direct save
        const verifyDirect = JSON.parse(localStorage.getItem("build.selected") || "{}");
        const directSaveCount = Object.keys(buildUpdate).filter(k => {
          const part = verifyDirect[k];
          return part && part.id && part.name;
        }).length;
        console.log(`✓ Direct save verification: ${directSaveCount}/${Object.keys(buildUpdate).length} parts saved`);
      } catch (error) {
        console.error('Error in direct localStorage save:', error);
      }
      
      // Also update React state (this will trigger BuildContext)
      console.log('Calling addMultipleParts...');
      addMultipleParts(buildUpdate);
      
      // Check localStorage immediately after
      const afterImmediateSave = JSON.parse(localStorage.getItem("build.selected") || "{}");
      console.log('localStorage AFTER immediate save:', Object.keys(afterImmediateSave));
      console.log('Parts in localStorage after immediate save:', Object.keys(buildUpdate).map(k => {
        const part = afterImmediateSave[k];
        return {
          key: k,
          exists: !!part,
          isNull: part === null,
          hasId: !!part?.id,
          hasName: !!part?.name,
          id: part?.id,
          name: part?.name?.substring(0, 30),
          fullPart: part
        };
      }));
      
      // Give React a moment to process the state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait for localStorage to be updated (with polling)
      console.log('Waiting for localStorage save...');
      let attempts = 0;
      let verified = false;
      const maxAttempts = 15;
      
      while (attempts < maxAttempts && !verified) {
        await new Promise(resolve => setTimeout(resolve, 150));
        attempts++;
        
        try {
          const check = JSON.parse(localStorage.getItem("build.selected") || "{}");
          const validCount = Object.keys(buildUpdate).filter(k => {
            const part = check[k];
            if (!part) {
              console.log(`  Attempt ${attempts}: ${k} is missing`);
              return false;
            }
            if (typeof part !== 'object' || Array.isArray(part)) {
              console.log(`  Attempt ${attempts}: ${k} is not an object`, typeof part, Array.isArray(part));
              return false;
            }
            if (!part.id) {
              console.log(`  Attempt ${attempts}: ${k} missing id`);
              return false;
            }
            if (!part.name) {
              console.log(`  Attempt ${attempts}: ${k} missing name`);
              return false;
            }
            return true;
          }).length;
          
          const expectedCount = Object.keys(buildUpdate).length;
          console.log(`  Attempt ${attempts}: ${validCount}/${expectedCount} parts valid`);
          
          if (validCount === expectedCount) {
            verified = true;
            console.log(`✓ Verified after ${attempts} attempts`);
            break;
          }
        } catch (error) {
          console.error(`  Attempt ${attempts}: Error reading localStorage:`, error);
        }
      }
      
      if (!verified) {
        console.warn(`⚠️ Could not verify all parts saved after ${maxAttempts} attempts`);
        // Try one more direct check
        const finalCheck = JSON.parse(localStorage.getItem("build.selected") || "{}");
        console.log('Final localStorage check:', {
          keys: Object.keys(finalCheck),
          buildUpdateKeys: Object.keys(buildUpdate),
          sample: Object.keys(buildUpdate).slice(0, 3).reduce((acc, k) => {
            acc[k] = finalCheck[k] ? { id: finalCheck[k].id, name: finalCheck[k].name } : 'MISSING';
            return acc;
          }, {})
        });
      }
      
      // Verify what was saved - check both localStorage and React state
      console.log('=== VERIFYING SAVE ===');
      
      // Check localStorage
      const stored = JSON.parse(localStorage.getItem("build.selected") || "{}");
      console.log('Stored keys:', Object.keys(stored));
      console.log('Full stored object:', JSON.stringify(stored, null, 2));
      
      // Check specifically what's stored for each key we're looking for
      console.log('=== DETAILED STORED CHECK ===');
      Object.keys(buildUpdate).forEach(k => {
        const storedValue = stored[k];
        console.log(`${k}:`, {
          exists: k in stored,
          value: storedValue,
          type: typeof storedValue,
          isNull: storedValue === null,
          isUndefined: storedValue === undefined,
          stringified: JSON.stringify(storedValue),
          hasId: storedValue?.id,
          hasName: storedValue?.name,
          keys: storedValue && typeof storedValue === 'object' ? Object.keys(storedValue) : 'N/A'
        });
      });
      
      console.log('Stored sample (first 3):', Object.keys(stored).slice(0, 3).reduce((acc, k) => {
        const part = stored[k];
        acc[k] = part ? { 
          id: part.id, 
          name: part.name,
          type: typeof part,
          isNull: part === null,
          keys: Object.keys(part).slice(0, 5)
        } : null;
        return acc;
      }, {}));
      
      // Also check React state directly (we already have it from useBuild hook)
      console.log('Current React state keys:', Object.keys(currentSelected));
      
      const validParts = [];
      const invalidParts = [];
      
      // Check each part we tried to save
      for (const key of Object.keys(buildUpdate)) {
        const expectedPart = buildUpdate[key];
        const storedPart = stored[key];
        const statePart = currentSelected[key];
        
        // Check if part exists and has required fields
        const isValid = storedPart && 
                       typeof storedPart === 'object' && 
                       !Array.isArray(storedPart) && 
                       storedPart.id && 
                       storedPart.name;
        
        if (isValid) {
          validParts.push(key);
          console.log(`✅ ${key}: saved correctly`, {
            id: storedPart.id,
            name: storedPart.name?.substring(0, 40)
          });
        } else {
          invalidParts.push(key);
          console.error(`❌ ${key}: NOT saved correctly`, {
            expected: { id: expectedPart.id, name: expectedPart.name },
            stored: storedPart,
            storedStringified: JSON.stringify(storedPart).substring(0, 200),
            inState: statePart,
            storedType: typeof storedPart,
            storedIsNull: storedPart === null,
            storedIsUndefined: storedPart === undefined,
            storedHasId: storedPart?.id,
            storedHasName: storedPart?.name,
            storedKeys: storedPart ? Object.keys(storedPart).slice(0, 10) : 'N/A'
          });
        }
      }
      
      console.log(`=== RESULT: ${validParts.length}/${Object.keys(buildUpdate).length} parts saved ===`);
      
      if (validParts.length === 0) {
        console.error('❌ CRITICAL: No parts were saved!');
        console.error('buildUpdate keys:', Object.keys(buildUpdate));
        console.error('buildUpdate sample:', Object.keys(buildUpdate).slice(0, 2).reduce((acc, k) => {
          acc[k] = { id: buildUpdate[k].id, name: buildUpdate[k].name };
          return acc;
        }, {}));
        console.error('stored keys:', Object.keys(stored));
        console.error('stored sample:', Object.keys(stored).slice(0, 5).map(k => ({
          key: k,
          value: stored[k],
          type: typeof stored[k],
          stringified: JSON.stringify(stored[k]).substring(0, 100)
        })));
        console.error('FULL STORED OBJECT:', JSON.stringify(stored, null, 2));
        console.error('buildUpdate object:', JSON.stringify(buildUpdate, null, 2));
        alert('Failed to save build. No parts were saved. Please check the console for details.');
        setGenerating(false);
        return;
      }
      
      if (invalidParts.length > 0) {
        console.warn(`⚠️ Warning: ${invalidParts.length} parts failed to save:`, invalidParts);
      }
      
      console.log(`✅ Success! ${validParts.length} parts saved. Navigating to build page...`);
      
      // Navigate to build page
      navigate('/build');
    } catch (error) {
      console.error('Error generating build:', error);
      setGenerating(false);
      alert('Error generating build. Please try again or use the manual build option.');
    }
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (generating) {
    return (
      <main className="container main">
        <section className="panel">
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>⚙️</div>
            <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>
              Generating Your Build...
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
              We're selecting the perfect components for your needs.
            </p>
            <div style={{
              width: '200px',
              height: '4px',
              background: 'var(--bg-800)',
              borderRadius: '2px',
              margin: '0 auto',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent), var(--accent-600))',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container main">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">PC Builder Quiz</div>
            <div className="panel-sub">Answer a few questions to get a custom build</div>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
              color: 'var(--muted)'
            }}>
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--bg-800)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent), var(--accent-600))',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Question */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '24px',
              color: 'var(--text-100)'
            }}>
              {currentQ.question}
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {currentQ.options.map((option) => (
                <button
                  key={option.value}
                  className="btn"
                  onClick={() => handleAnswer(option.value)}
                  disabled={!partsLoaded && currentQuestion === questions.length - 1}
                  style={{
                    width: '100%',
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '16px',
                    justifyContent: 'flex-start',
                    opacity: !partsLoaded && currentQuestion === questions.length - 1 ? 0.5 : 1
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {!partsLoaded && (
              <div style={{
                padding: '12px',
                background: 'var(--bg-800)',
                borderRadius: '8px',
                color: 'var(--muted)',
                fontSize: '14px',
                textAlign: 'center',
                marginTop: '16px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  Loading parts... Please wait
                </div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: 'var(--bg-700)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent), var(--accent-600))',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  {loadingProgress.loaded} / {loadingProgress.total} categories loaded
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <button
              className="btn"
              onClick={() => {
                if (currentQuestion > 0) {
                  setCurrentQuestion(currentQuestion - 1);
                } else {
                  navigate('/');
                }
              }}
            >
              {currentQuestion === 0 ? 'Back to Home' : 'Previous'}
            </button>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </section>
    </main>
  );
}

