/**
 * Build Generator - Logic for selecting parts based on user quiz answers
 */

export const buildGenerator = {
  /**
   * Selects compatible parts for a PC build based on user answers
   * @param {Object} answers - User's quiz answers
   * @param {Object} parts - Available parts organized by category
   * @returns {Object} Build object with selected parts
   */
  selectPartsForBuild(answers, parts) {
    const build = {};
    const budget = answers.budget || 'mid';
    const usage = answers.usage || 'general';
    const gpuPriority = answers.gpu_priority || 'moderate';
    const cpuBrand = answers.cpu_brand || 'none';
    
    console.log('selectPartsForBuild called with:', { budget, usage, gpuPriority, cpuBrand });
    console.log('Parts object:', parts);
    console.log('Parts keys:', Object.keys(parts));
    console.log('Parts available:', Object.keys(parts).map(k => `${k}: ${parts[k]?.length || 0}`));
    
    // Validate parts object
    if (!parts || typeof parts !== 'object') {
      console.error('Invalid parts object:', parts);
      return {};
    }

    // Budget ranges
    const budgetRanges = {
      budget: { min: 0, max: 800, cpuMax: 150, gpuMax: 200 },
      mid: { min: 800, max: 1500, cpuMax: 300, gpuMax: 500 },
      high: { min: 1500, max: 3000, cpuMax: 600, gpuMax: 1200 },
      enthusiast: { min: 3000, max: 10000, cpuMax: 1000, gpuMax: 2000 }
    };
    
    const range = budgetRanges[budget];

    // Select CPU - always select one if available
    if (parts.cpus && parts.cpus.length > 0) {
      const isHighBudget = budget === 'high' || budget === 'enthusiast';
      let cpuCandidates = parts.cpus.filter(cpu => {
        // For high budgets, be more lenient with price filtering
        if (cpu.price && cpu.price > range.cpuMax * (isHighBudget ? 3 : 2)) return false;
        if (cpuBrand === 'intel' && cpu.name && !cpu.name.toLowerCase().includes('intel')) return false;
        if (cpuBrand === 'amd' && cpu.name && !cpu.name.toLowerCase().includes('amd')) return false;
        return true;
      });
      
      // If no candidates with brand filter, try without brand filter
      if (cpuCandidates.length === 0 && cpuBrand !== 'none') {
        cpuCandidates = parts.cpus.filter(cpu => {
          if (cpu.price && cpu.price > range.cpuMax * 2) return false;
          return true;
        });
      }
      
      // If still no candidates, use all CPUs
      if (cpuCandidates.length === 0) {
        cpuCandidates = parts.cpus;
      }
      
      if (cpuCandidates.length > 0) {
        // Sort by price - for high budgets, sort descending to get best parts first
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        cpuCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        
        // Select based on budget and usage
        let selectedCpu;
        if (isHighBudget) {
          // For high budgets, select from top tier (best parts)
          if (usage === 'gaming' || usage === 'content') {
            // Top 20% for gaming/content on high budget
            selectedCpu = cpuCandidates[Math.floor(cpuCandidates.length * 0.1)];
          } else {
            // Top 30% for general use on high budget
            selectedCpu = cpuCandidates[Math.floor(cpuCandidates.length * 0.2)];
          }
        } else if (usage === 'gaming' || usage === 'content') {
          // For mid/budget: prefer higher performance (70% up the sorted list)
          selectedCpu = cpuCandidates[Math.min(Math.floor(cpuCandidates.length * 0.7), cpuCandidates.length - 1)];
        } else {
          // For mid/budget: prefer value (30% up the sorted list)
          selectedCpu = cpuCandidates[Math.min(Math.floor(cpuCandidates.length * 0.3), cpuCandidates.length - 1)];
        }
        
        build.cpus = selectedCpu;
        console.log('Selected CPU:', selectedCpu.name || selectedCpu.id, 'ID:', selectedCpu.id, 'from', cpuCandidates.length, 'candidates');
      } else {
        // Ultimate fallback: just pick the first CPU
        build.cpus = parts.cpus[0];
        console.log('Using first available CPU:', parts.cpus[0].name || parts.cpus[0].id);
      }
    } else {
      console.warn('No CPUs available in parts');
    }

    // Select Motherboard (compatible with CPU)
    if (build.cpus && parts.motherboards && parts.motherboards.length > 0) {
      const cpuSocket = build.cpus.socket;
      let mbCandidates = parts.motherboards.filter(mb => {
        if (mb.price && mb.price > range.cpuMax * 1.5) return false;
        if (cpuSocket && mb.socket) {
          // More lenient socket matching
          const cpuSocketLower = cpuSocket.toLowerCase().trim();
          const mbSocketLower = mb.socket.toLowerCase().trim();
          if (cpuSocketLower !== mbSocketLower && !cpuSocketLower.includes(mbSocketLower) && !mbSocketLower.includes(cpuSocketLower)) {
            return false;
          }
        }
        return true;
      });
      
      // If no socket match, try without socket requirement
      if (mbCandidates.length === 0 && cpuSocket) {
        mbCandidates = parts.motherboards.filter(mb => {
          if (mb.price && mb.price > range.cpuMax * 1.5) return false;
          return true;
        });
      }
      
      // If no socket match, use all motherboards
      if (mbCandidates.length === 0) {
        mbCandidates = parts.motherboards.filter(mb => {
          if (mb.price && mb.price > range.cpuMax * 2) return false;
          return true;
        });
      }
      
      // Ultimate fallback: use all motherboards
      if (mbCandidates.length === 0) {
        mbCandidates = parts.motherboards;
      }
      
      if (mbCandidates.length > 0) {
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        mbCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        // For high budgets, select from top tier, otherwise middle
        const index = isHighBudget ? Math.floor(mbCandidates.length * 0.2) : Math.floor(mbCandidates.length / 2);
        build.motherboards = mbCandidates[index];
        console.log('Selected Motherboard:', build.motherboards.name || build.motherboards.id);
      } else {
        // Ultimate fallback: just pick the first motherboard
        if (parts.motherboards.length > 0) {
          build.motherboards = parts.motherboards[0];
          console.log('Using first available Motherboard:', parts.motherboards[0].name || parts.motherboards[0].id);
        } else {
          console.warn('No motherboard candidates found');
        }
      }
    }

    // Select GPU (always select unless explicitly "low" priority)
    if (gpuPriority !== 'low' && parts.gpus && parts.gpus.length > 0) {
      const isHighBudget = budget === 'high' || budget === 'enthusiast';
      let gpuCandidates = parts.gpus.filter(gpu => {
        // For high budgets, allow more expensive GPUs
        if (gpu.price && gpu.price > range.gpuMax * (isHighBudget ? 2.5 : 1.5)) return false;
        return true;
      });
      
      // If no candidates with price filter, relax the filter
      if (gpuCandidates.length === 0) {
        gpuCandidates = parts.gpus.filter(gpu => {
          // More lenient filter - only exclude extremely expensive ones
          if (gpu.price && gpu.price > range.gpuMax * (isHighBudget ? 4 : 3)) return false;
          return true;
        });
      }
      
      // If still no candidates, use all GPUs
      if (gpuCandidates.length === 0) {
        gpuCandidates = parts.gpus;
      }
      
      if (gpuCandidates.length > 0) {
        gpuCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        
        let selectedGpu;
        if (isHighBudget) {
          // For high budgets, select top tier GPUs
          if (gpuPriority === 'critical' || usage === 'gaming') {
            selectedGpu = gpuCandidates[Math.floor(gpuCandidates.length * 0.1)]; // Top 10%
          } else {
            selectedGpu = gpuCandidates[Math.floor(gpuCandidates.length * 0.2)]; // Top 20%
          }
        } else if (gpuPriority === 'critical' || usage === 'gaming') {
          selectedGpu = gpuCandidates[Math.min(Math.floor(gpuCandidates.length * 0.7), gpuCandidates.length - 1)];
        } else {
          selectedGpu = gpuCandidates[Math.min(Math.floor(gpuCandidates.length * 0.4), gpuCandidates.length - 1)];
        }
        
        build.gpus = selectedGpu;
        console.log('Selected GPU:', selectedGpu.name);
      } else {
        // Ultimate fallback: just pick the first GPU
        if (parts.gpus.length > 0) {
          build.gpus = parts.gpus[0];
          console.log('Using first available GPU:', parts.gpus[0].name || parts.gpus[0].id);
        } else {
          console.warn('No GPUs available in parts');
        }
      }
    } else if (gpuPriority === 'low') {
      console.log('Skipping GPU selection (low priority - using integrated graphics)');
    } else {
      console.warn('No GPUs available or gpuPriority is low');
    }

    // Select RAM (compatible with motherboard memory type)
    if (parts.memory && parts.memory.length > 0) {
      const mbRamType = build.motherboards?.ramType;
      let ramCandidates = parts.memory.filter(ram => {
        if (ram.price && ram.price > 300) return false;
        // Check RAM type compatibility with motherboard
        if (mbRamType && ram.ramType) {
          const mbRamTypeLower = mbRamType.toLowerCase().trim();
          const ramTypeLower = ram.ramType.toLowerCase().trim();
          if (mbRamTypeLower !== ramTypeLower) {
            return false; // RAM type doesn't match motherboard
          }
        }
        return true;
      });
      
      // If no candidates with RAM type match, try without RAM type requirement
      if (ramCandidates.length === 0 && mbRamType) {
        ramCandidates = parts.memory.filter(ram => {
          if (ram.price && ram.price > 300) return false;
          return true;
        });
      }
      
      // If no candidates, use all RAM
      if (ramCandidates.length === 0) {
        ramCandidates = parts.memory;
      }
      
      if (ramCandidates.length > 0) {
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        ramCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        // Select capacity based on budget
        const targetCapacity = budget === 'budget' ? 16 : budget === 'high' ? 32 : budget === 'enthusiast' ? 32 : 16;
        let selectedRam = ramCandidates.find(r => r.capacityGB === targetCapacity);
        if (!selectedRam) {
          // Try to find closest capacity
          selectedRam = ramCandidates.find(r => r.capacityGB && r.capacityGB >= targetCapacity);
        }
        // If still not found, for high budgets pick from top, otherwise middle
        if (!selectedRam) {
          selectedRam = isHighBudget ? ramCandidates[0] : ramCandidates[Math.floor(ramCandidates.length / 2)];
        }
        build.memory = selectedRam;
        console.log('Selected RAM:', selectedRam.name || selectedRam.id, `(Type: ${selectedRam.ramType || 'unknown'}, MB Type: ${mbRamType || 'unknown'})`);
      } else {
        // Ultimate fallback: just pick the first RAM
        if (parts.memory.length > 0) {
          build.memory = parts.memory[0];
          console.log('Using first available RAM:', parts.memory[0].name || parts.memory[0].id);
        } else {
          console.warn('No RAM candidates found');
        }
      }
    }

    // Select Storage
    if (parts.storage && parts.storage.length > 0) {
      let storageCandidates = parts.storage.filter(storage => {
        if (storage.price && storage.price > 500) return false;
        return true;
      });
      
      // If no candidates, use all storage
      if (storageCandidates.length === 0) {
        storageCandidates = parts.storage;
      }
      
      if (storageCandidates.length > 0) {
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        storageCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        const index = isHighBudget ? Math.floor(storageCandidates.length * 0.2) : Math.floor(storageCandidates.length / 2);
        build.storage = storageCandidates[index];
        console.log('Selected Storage:', build.storage.name || build.storage.id);
      } else {
        // Ultimate fallback: just pick the first storage
        if (parts.storage.length > 0) {
          build.storage = parts.storage[0];
          console.log('Using first available Storage:', parts.storage[0].name || parts.storage[0].id);
        } else {
          console.warn('No storage candidates found');
        }
      }
    }

    // Select PSU
    if (parts.psus && parts.psus.length > 0) {
      const estimatedWattage = (build.gpus?.tdp || 0) + (build.cpus?.tdp || 0) + 200;
      const requiredWattage = Math.max(450, Math.ceil(estimatedWattage * 1.2));
      
      let psuCandidates = parts.psus.filter(psu => {
        if (psu.price && psu.price > 300) return false;
        if (psu.wattage && psu.wattage < requiredWattage) return false;
        return true;
      });
      
      // If no candidates with wattage requirement, relax it
      if (psuCandidates.length === 0) {
        psuCandidates = parts.psus.filter(psu => {
          if (psu.price && psu.price > 300) return false;
          return true;
        });
      }
      
      // If no candidates, use all PSUs
      if (psuCandidates.length === 0) {
        psuCandidates = parts.psus;
      }
      
      if (psuCandidates.length > 0) {
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        psuCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        // For high budgets, prefer higher wattage/quality PSUs from top tier
        const index = isHighBudget ? Math.floor(psuCandidates.length * 0.2) : 0;
        build.psus = psuCandidates[index];
        console.log('Selected PSU:', build.psus.name || build.psus.id);
      } else {
        // Ultimate fallback: just pick the first PSU
        if (parts.psus.length > 0) {
          build.psus = parts.psus[0];
          console.log('Using first available PSU:', parts.psus[0].name || parts.psus[0].id);
        } else {
          console.warn('No PSU candidates found');
        }
      }
    }

    // Select Cooler (compatible with CPU socket)
    if (parts.coolers && parts.coolers.length > 0 && build.cpus) {
      const cpuSocket = build.cpus.socket;
      const cpuTdp = build.cpus.tdp || 65;
      
      let coolerCandidates = parts.coolers.filter(cooler => {
        if (cooler.price && cooler.price > 200) return false;
        
        // Check socket compatibility
        if (cpuSocket && cooler.supportedSockets && Array.isArray(cooler.supportedSockets)) {
          const cpuSocketLower = cpuSocket.toLowerCase().trim();
          const isCompatible = cooler.supportedSockets.some(socket => {
            const socketLower = String(socket).toLowerCase().trim();
            return socketLower === cpuSocketLower || 
                   socketLower.includes(cpuSocketLower) || 
                   cpuSocketLower.includes(socketLower);
          });
          if (!isCompatible) {
            return false; // Cooler doesn't support CPU socket
          }
        }
        return true;
      });
      
      // If no candidates with socket match, try without socket requirement
      if (coolerCandidates.length === 0 && cpuSocket) {
        coolerCandidates = parts.coolers.filter(cooler => {
          if (cooler.price && cooler.price > 200) return false;
          return true;
        });
      }
      
      // If no candidates, use all coolers
      if (coolerCandidates.length === 0) {
        coolerCandidates = parts.coolers;
      }
      
      if (coolerCandidates.length > 0) {
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        coolerCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        // For high budgets, prefer premium coolers from top tier
        const index = isHighBudget ? Math.floor(coolerCandidates.length * 0.2) : 0;
        build.coolers = coolerCandidates[index];
        console.log('Selected Cooler:', build.coolers.name || build.coolers.id, `(CPU Socket: ${cpuSocket || 'unknown'}, Supported: ${build.coolers.supportedSockets?.join(', ') || 'unknown'})`);
      } else {
        // Ultimate fallback: just pick the first cooler
        if (parts.coolers.length > 0) {
          build.coolers = parts.coolers[0];
          console.log('Using first available Cooler:', parts.coolers[0].name || parts.coolers[0].id);
        } else {
          console.warn('No cooler candidates found');
        }
      }
    }

    // Select Case
    if (parts.cases && parts.cases.length > 0) {
      let caseCandidates = parts.cases.filter(c => {
        if (c.price && c.price > 300) return false;
        return true;
      });
      
      if (caseCandidates.length === 0) {
        caseCandidates = parts.cases;
      }
      
      if (caseCandidates.length > 0) {
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        caseCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        const index = isHighBudget ? Math.floor(caseCandidates.length * 0.2) : Math.floor(caseCandidates.length / 2);
        build.cases = caseCandidates[index];
        console.log('Selected Case:', build.cases.name || build.cases.id);
      } else {
        if (parts.cases.length > 0) {
          build.cases = parts.cases[0];
          console.log('Using first available Case:', parts.cases[0].name || parts.cases[0].id);
        } else {
          console.warn('No case candidates found');
        }
      }
    }

    // Select Monitor
    if (parts.monitors && parts.monitors.length > 0) {
      let monitorCandidates = parts.monitors.filter(m => {
        if (m.price && m.price > 800) return false;
        return true;
      });
      
      if (monitorCandidates.length === 0) {
        monitorCandidates = parts.monitors;
      }
      
      if (monitorCandidates.length > 0) {
        const isHighBudget = budget === 'high' || budget === 'enthusiast';
        monitorCandidates.sort((a, b) => {
          const aPrice = a.price || (isHighBudget ? 0 : 999999);
          const bPrice = b.price || (isHighBudget ? 0 : 999999);
          return isHighBudget ? bPrice - aPrice : aPrice - bPrice;
        });
        
        // Prefer monitors based on usage and budget
        let selectedMonitor;
        if (isHighBudget) {
          // For high budgets, select premium monitors
          if (usage === 'gaming' || usage === 'content') {
            // Top tier gaming/content monitor (high refresh rate, high resolution)
            selectedMonitor = monitorCandidates.find(m => m.refresh_rate && m.refresh_rate >= 144) ||
                             monitorCandidates[Math.floor(monitorCandidates.length * 0.1)];
          } else {
            selectedMonitor = monitorCandidates[Math.floor(monitorCandidates.length * 0.2)];
          }
        } else if (usage === 'gaming' || usage === 'content') {
          selectedMonitor = monitorCandidates.find(m => m.refresh_rate && m.refresh_rate >= 144) ||
                           monitorCandidates[Math.min(Math.floor(monitorCandidates.length * 0.7), monitorCandidates.length - 1)];
        } else {
          selectedMonitor = monitorCandidates[Math.floor(monitorCandidates.length / 2)];
        }
        
        build.monitors = selectedMonitor || monitorCandidates[0];
        console.log('Selected Monitor:', build.monitors.name || build.monitors.id);
      } else {
        if (parts.monitors.length > 0) {
          build.monitors = parts.monitors[0];
          console.log('Using first available Monitor:', parts.monitors[0].name || parts.monitors[0].id);
        } else {
          console.warn('No monitor candidates found');
        }
      }
    }

    // Select OS
    if (parts.os && parts.os.length > 0) {
      let osCandidates = parts.os.filter(o => {
        if (o.price && o.price > 200) return false;
        return true;
      });
      
      if (osCandidates.length === 0) {
        osCandidates = parts.os;
      }
      
      if (osCandidates.length > 0) {
        osCandidates.sort((a, b) => (a.price || 0) - (b.price || 0));
        // Prefer Windows for gaming, otherwise pick middle option
        let selectedOS;
        if (usage === 'gaming') {
          selectedOS = osCandidates.find(o => o.name && o.name.toLowerCase().includes('windows')) ||
                      osCandidates[0];
        } else {
          selectedOS = osCandidates[Math.floor(osCandidates.length / 2)];
        }
        
        build.os = selectedOS || osCandidates[0];
        console.log('Selected OS:', build.os.name || build.os.id);
      } else {
        if (parts.os.length > 0) {
          build.os = parts.os[0];
          console.log('Using first available OS:', parts.os[0].name || parts.os[0].id);
        } else {
          console.warn('No OS candidates found');
        }
      }
    }

    console.log('Final build object:', build);
    console.log('Build has parts:', Object.keys(build).filter(k => build[k] !== null && build[k] !== undefined));
    
    return build;
  }
};

