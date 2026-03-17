// API base URL - defaults to Django backend on port 8000, but can be set via env var
const API_BASE = process.env.REACT_APP_API_URL || 'http://cs.indstate.edu:9000'; //'https://testing-l0lu.onrender.com';

// Map frontend category keys to backend data folder names
const categoryToFolder = {
  'cpus': 'cpu',
  'motherboards': 'motherboard',
  'gpus': 'gpu',
  'memory': 'ram',
  'storage': 'storage',
  'psus': 'psu',
  'coolers': 'cpu_cooler',
  'cases': 'case',
  'monitors': 'monitor',
  'os': 'os'
};

// Helper to construct image URL from image_path
export function getImageUrl(imagePath, categoryKey = null) {
  if (!imagePath) return null;
  
  // Image paths in DB are like "cpu_images/file.jpg" but files are at "cpu/cpu_images/file.jpg"
  // So we need to prepend the category folder name
  let fullPath = imagePath;
  if (categoryKey && categoryToFolder[categoryKey]) {
    const folder = categoryToFolder[categoryKey];
    // Check if path already includes category folder (some might already have it)
    if (!imagePath.startsWith(`${folder}/`)) {
      // Prepend category folder: "cpu_images/file.jpg" -> "cpu/cpu_images/file.jpg"
      fullPath = `${folder}/${imagePath}`;
    }
  } else if (!categoryKey) {
    // If no category key, try to infer from image path
    // e.g., "cpu_images/..." -> "cpu/cpu_images/..."
    const pathMatch = imagePath.match(/^(\w+)_images\//);
    if (pathMatch) {
      const inferredFolder = pathMatch[1];
      fullPath = `${inferredFolder}/${imagePath}`;
    }
  }
  
  // Always use full API URL for media files to ensure CORS works
  const url = `${API_BASE}/media/${fullPath}`;
  return url;
}

export async function getParts(categoryKey, page = 1) {
  // Determine if we're in production (not localhost)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isProduction = !isLocalhost || (API_BASE && !API_BASE.includes('localhost'));
  
  // In production, prioritize full URL. In local dev, try relative first (proxy works)
  const candidates = isProduction && API_BASE
    ? [
        `${API_BASE}/api/${categoryKey}/?page=${page}`,  // Full URL with trailing slash (production)
        `${API_BASE}/api/${categoryKey}?page=${page}`,  // Full URL without trailing slash
        `/api/${categoryKey}/?page=${page}`,            // Relative with trailing slash (fallback)
        `/api/${categoryKey}?page=${page}`,            // Relative without trailing slash (fallback)
        `${process.env.PUBLIC_URL}/data/${categoryKey}.json`
      ]
    : [
        `/api/${categoryKey}/?page=${page}`,           // Relative with trailing slash (local dev)
        `/api/${categoryKey}?page=${page}`,            // Relative without trailing slash
        `${API_BASE || 'http://localhost:8000'}/api/${categoryKey}/?page=${page}`,  // Full URL with trailing slash
        `${API_BASE || 'http://localhost:8000'}/api/${categoryKey}?page=${page}`,  // Full URL without trailing slash
        `${process.env.PUBLIC_URL}/data/${categoryKey}.json`
      ];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        // Handle both new paginated format and old array format
        if (data.results) {
          if (data.has_next !== undefined && data.total_pages === null || data.total_pages === undefined) {
            data.total_pages = data.has_next ? data.page + 1 : data.page;
          }
          return data; // Paginated response
        } else if (Array.isArray(data)) {
          // Old format - return as paginated for compatibility
          return {
            results: data,
            count: data.length,
            page: 1,
            page_size: data.length,
            total_pages: 1
          };
        }
        return data;
      }
    } catch (error) {
      // Silently continue to next candidate
    }
  }
  return { results: [], count: 0, page: 1, page_size: 10, total_pages: 0 }; 
}

export async function getAllParts(categoryKey) {
  const allParts = [];
  let page = 1;
  let hasMore = true;
  const pageSize = 10;
  const maxPages = 1000;
  let consecutiveEmptyPages = 0;
  
  while (hasMore && page <= maxPages) {
    try {
      const data = await getParts(categoryKey, page);
      
      if (data.results && data.results.length > 0) {
        allParts.push(...data.results);
        consecutiveEmptyPages = 0;
        
        if (data.has_next !== undefined && data.has_next !== null) {
          hasMore = data.has_next === true || data.has_next === 'true';
        } else if (data.total_pages !== null && data.total_pages !== undefined && data.total_pages > 0) {
          hasMore = page < data.total_pages;
        } else {
          const actualPageSize = data.page_size || pageSize;
          hasMore = data.results.length >= actualPageSize;
        }
        
        if (hasMore) {
          page++;
        }
      } else {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= 2) {
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      hasMore = false;
    }
  }
  
  return {
    results: allParts,
    count: allParts.length,
    page: 1,
    page_size: allParts.length,
    total_pages: 1
  };
}

async function apiFetch(path) {
  // Determine if we're in production (not localhost)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isProduction = !isLocalhost || (API_BASE && !API_BASE.includes('localhost'));
  
  // In production, prioritize full URL. In local dev, try relative first (proxy works)
  const candidates = isProduction && API_BASE
    ? [
        `${API_BASE}/api/${path}`,  // Full URL (production)
        `/api/${path}`              // Relative (fallback)
      ]
    : [
        `/api/${path}`,             // Relative (local dev with proxy)
        `${API_BASE || 'http://localhost:8000'}/api/${path}`  // Full URL (fallback)
      ];
  
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
    }
  }
  return null;
}

export async function getCompatibility(selected) {
  const messages = [];
  
  // CPU ↔ Motherboard
  if (selected.cpus && selected.motherboards) {
    try {
      const cpu = selected.cpus;
      const mb = selected.motherboards;
      const data = await apiFetch(`compatibility/motherboards-for-cpu/?cpu=${encodeURIComponent(cpu.name)}`);
      if (data) {
        if (data.error) {
          messages.push({ level: "warn", message: data.error });
        } else if (data.compatible_motherboards) {
          const isCompatible = data.compatible_motherboards.some(m => m.id === mb.id);
          if (isCompatible) {
            messages.push({ level: "ok", message: `CPU and motherboard sockets match (${cpu.socket || 'verified'}).` });
          } else {
            messages.push({ level: "error", message: `CPU socket ${cpu.socket} may not match motherboard socket ${mb.socket}.` });
          }
        }
      } else {
        messages.push({ level: "warn", message: "Could not verify CPU/motherboard compatibility (backend unavailable)." });
      }
    } catch (e) {
      messages.push({ level: "warn", message: "Could not verify CPU/motherboard compatibility." });
    }
  }
  
  // RAM ↔ Motherboard
  if (selected.memory && selected.motherboards) {
    try {
      const ram = selected.memory;
      const mb = selected.motherboards;
      const data = await apiFetch(`compatibility/motherboards-for-ram/?ram=${encodeURIComponent(ram.name)}`);
      if (data) {
        if (data.error) {
          messages.push({ level: "warn", message: data.error });
        } else if (data.compatible_motherboards) {
          const isCompatible = data.compatible_motherboards.some(m => m.id === mb.id);
          if (isCompatible) {
            messages.push({ level: "ok", message: `Memory type matches motherboard (${ram.ramType || 'verified'}).` });
          } else {
            messages.push({ level: "error", message: `Memory type ${ram.ramType} may not match motherboard.` });
          }
        }
      } else {
        messages.push({ level: "warn", message: "Could not verify RAM/motherboard compatibility (backend unavailable)." });
      }
    } catch (e) {
      messages.push({ level: "warn", message: "Could not verify RAM/motherboard compatibility." });
    }
  }
  
  // PSU headroom (wattage check)
  if (selected.psus && (selected.cpus || selected.gpus)) {
    const cpu = selected.cpus;
    const gpu = selected.gpus;
    const psu = selected.psus;
    const cpuT = cpu?.tdp ?? 0;
    const gpuT = gpu?.tdp ?? 0;
    const est = Math.round((cpuT + gpuT) * 1.5 || 350);
    if (psu.wattage) {
      if (psu.wattage >= est) {
        messages.push({ level: "ok", message: `PSU wattage (${psu.wattage}W) ≥ estimated need (~${est}W).` });
      } else {
        messages.push({ level: "error", message: `PSU wattage (${psu.wattage}W) < estimated need (~${est}W). Consider higher wattage.` });
      }
    }
  }
  
  // CPU ↔ Cooler
  if (selected.cpus && selected.coolers) {
    try {
      const cpu = selected.cpus;
      const cooler = selected.coolers;
      const data = await apiFetch(`compatibility/coolers-for-cpu/?cpu=${encodeURIComponent(cpu.name)}`);
      if (data) {
        if (data.error) {
          messages.push({ level: "warn", message: data.error });
        } else if (data.compatible_coolers) {
          const isCompatible = data.compatible_coolers.some(c => c.id === cooler.id);
          if (isCompatible) {
            messages.push({ level: "ok", message: `Cooler supports CPU socket ${cpu.socket || 'verified'}.` });
          } else {
            messages.push({ level: "error", message: `Cooler may not support CPU socket ${cpu.socket}.` });
          }
        }
      } else {
        messages.push({ level: "warn", message: "Could not verify CPU/cooler compatibility (backend unavailable)." });
      }
    } catch (e) {
      messages.push({ level: "warn", message: "Could not verify CPU/cooler compatibility." });
    }
  }
  
  // PSU ↔ GPU (connector check)
  if (selected.psus && selected.gpus) {
    try {
      const psu = selected.psus;
      const gpu = selected.gpus;
      const data = await apiFetch(`compatibility/gpus-for-psu/?psu=${encodeURIComponent(psu.name)}`);
      if (data) {
        if (data.error) {
          messages.push({ level: "warn", message: data.error });
        } else if (data.compatible_gpus) {
          const isCompatible = data.compatible_gpus.some(g => g.id === gpu.id);
          if (isCompatible) {
            messages.push({ level: "ok", message: `PSU has sufficient connectors for GPU.` });
          } else {
            messages.push({ level: "error", message: `PSU may not have sufficient connectors for this GPU.` });
          }
        }
      } else {
        messages.push({ level: "warn", message: "Could not verify PSU/GPU connector compatibility (backend unavailable)." });
      }
    } catch (e) {
      messages.push({ level: "warn", message: "Could not verify PSU/GPU connector compatibility." });
    }
  }
  
  return messages;
}

export async function getPartDetail(categoryKey, partId) {
  // Map frontend category keys to backend API endpoints
  // Backend uses: cpus, motherboards, gpus, memory, storage, psus, coolers, cases, monitors, os
  const apiCategoryMap = {
    'cpus': 'cpus',
    'motherboards': 'motherboards',
    'gpus': 'gpus',
    'memory': 'memory',
    'storage': 'storage',
    'psus': 'psus',
    'coolers': 'coolers',
    'cases': 'cases',
    'monitors': 'monitors',
    'os': 'os'
  };
  
  const apiCategory = apiCategoryMap[categoryKey] || categoryKey;
  
  // Ensure partId is a valid number
  const numericPartId = parseInt(partId, 10);
  if (isNaN(numericPartId)) {
    console.error(`[getPartDetail] Invalid part ID: ${partId} (type: ${typeof partId})`);
    return { error: "Invalid part ID" };
  }
  
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isProduction = !isLocalhost || (API_BASE && !API_BASE.includes('localhost'));
  
  const candidates = isProduction && API_BASE
    ? [
        `${API_BASE}/api/${apiCategory}/${numericPartId}/`,
        `${API_BASE}/api/${apiCategory}/${numericPartId}`,
        `/api/${apiCategory}/${numericPartId}/`,
        `/api/${apiCategory}/${numericPartId}`
      ]
    : [
        `/api/${apiCategory}/${numericPartId}/`,
        `/api/${apiCategory}/${numericPartId}`,
        `${API_BASE || 'http://localhost:8000'}/api/${apiCategory}/${numericPartId}/`,
        `${API_BASE || 'http://localhost:8000'}/api/${apiCategory}/${numericPartId}`
      ];
  
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (r.ok) {
        try {
          const contentType = r.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await r.json();
            return data;
          } else {
            continue;
          }
        } catch (jsonError) {
          continue;
        }
      } else if (r.status === 404) {
        continue;
      } else {
        continue;
      }
    } catch (error) {
      continue;
    }
  }
  return { error: "Failed to load part details" };
}

export async function getCompatiblePartsList(categoryKey, selected) {
  if (!selected) return null;
  
  try {
    const compatibleIds = new Set();
    let hasAnyCheck = false;
    
    const compatibilityPromises = [];
    
    if (categoryKey === 'cpus') {
      if (selected.motherboards) {
        hasAnyCheck = true;
        compatibilityPromises.push(
          apiFetch(`compatibility/cpus-for-motherboard/?motherboard=${encodeURIComponent(selected.motherboards.name)}`)
            .then(res => {
              if (res && res.compatible_cpus) {
                res.compatible_cpus.forEach(cpu => compatibleIds.add(cpu.id));
              }
            })
        );
      }
      if (selected.coolers) {
        hasAnyCheck = true;
        compatibilityPromises.push(
          apiFetch(`compatibility/cpus-for-cooler/?cooler=${encodeURIComponent(selected.coolers.name)}`)
            .then(res => {
              if (res && res.compatible_cpus) {
                const coolerIds = new Set(res.compatible_cpus.map(c => c.id));
                if (compatibleIds.size === 0) {
                  coolerIds.forEach(id => compatibleIds.add(id));
                } else {
                  compatibleIds.forEach(id => {
                    if (!coolerIds.has(id)) compatibleIds.delete(id);
                  });
                }
              }
            })
        );
      }
    } else if (categoryKey === 'motherboards') {
      const motherboardChecks = [];
      if (selected.cpus) {
        hasAnyCheck = true;
        motherboardChecks.push(
          apiFetch(`compatibility/motherboards-for-cpu/?cpu=${encodeURIComponent(selected.cpus.name)}`)
            .then(res => res?.compatible_motherboards || [])
        );
      }
      if (selected.memory) {
        hasAnyCheck = true;
        motherboardChecks.push(
          apiFetch(`compatibility/motherboards-for-ram/?ram=${encodeURIComponent(selected.memory.name)}`)
            .then(res => res?.compatible_motherboards || [])
        );
      }
      if (selected.storage) {
        hasAnyCheck = true;
        motherboardChecks.push(
          apiFetch(`compatibility/motherboards-for-storage/?storage=${encodeURIComponent(selected.storage.name)}`)
            .then(res => res?.compatible_motherboards || [])
        );
      }
      if (motherboardChecks.length > 0) {
        compatibilityPromises.push(
          Promise.all(motherboardChecks).then(results => {
            if (results.length > 0) {
              const firstSet = new Set(results[0].map(m => m.id));
              results.slice(1).forEach(result => {
                const resultSet = new Set(result.map(m => m.id));
                firstSet.forEach(id => {
                  if (!resultSet.has(id)) firstSet.delete(id);
                });
              });
              firstSet.forEach(id => compatibleIds.add(id));
            }
          })
        );
      }
    } else if (categoryKey === 'gpus') {
      if (selected.psus) {
        hasAnyCheck = true;
        compatibilityPromises.push(
          apiFetch(`compatibility/gpus-for-psu/?psu=${encodeURIComponent(selected.psus.name)}`)
            .then(res => {
              if (res && res.compatible_gpus) {
                res.compatible_gpus.forEach(gpu => compatibleIds.add(gpu.id));
              }
            })
        );
      }
    } else if (categoryKey === 'memory') {
      if (selected.motherboards) {
        hasAnyCheck = true;
        const mbMemoryType = selected.motherboards.ramType || selected.motherboards.memory_type;
        if (mbMemoryType) {
          return { type: 'CLIENT_SIDE_FILTER', filterKey: 'ramType', filterValue: mbMemoryType };
        }
        return 'NEED_PER_PART_CHECK';
      }
    } else if (categoryKey === 'storage') {
      if (selected.motherboards) {
        hasAnyCheck = true;
        return 'NEED_PER_PART_CHECK';
      }
    } else if (categoryKey === 'psus') {
      if (selected.gpus) {
        hasAnyCheck = true;
        compatibilityPromises.push(
          apiFetch(`compatibility/psus-for-gpu/?gpu=${encodeURIComponent(selected.gpus.name)}`)
            .then(res => {
              if (res && res.compatible_psus) {
                res.compatible_psus.forEach(psu => compatibleIds.add(psu.id));
              }
            })
        );
      }
    } else if (categoryKey === 'coolers') {
      if (selected.cpus) {
        hasAnyCheck = true;
        compatibilityPromises.push(
          apiFetch(`compatibility/coolers-for-cpu/?cpu=${encodeURIComponent(selected.cpus.name)}`)
            .then(res => {
              if (res && res.compatible_coolers) {
                res.compatible_coolers.forEach(cooler => compatibleIds.add(cooler.id));
              }
            })
        );
      }
    }
    
    await Promise.all(compatibilityPromises);
    
    if (!hasAnyCheck) {
      return null;
    }
    
    return compatibleIds;
  } catch (error) {
    console.error('Error fetching compatibility lists:', error);
    return null; // On error, show all parts
  }
}

export async function isPartCompatible(part, categoryKey, selected) {
  if (!selected || !part) return true;
  
  const compatibleIds = await getCompatiblePartsList(categoryKey, selected);
  
  if (compatibleIds === null) {
    return true;
  }
  
  return compatibleIds.has(part.id);
}
