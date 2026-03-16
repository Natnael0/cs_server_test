import React, { useEffect, useState, useMemo, useRef } from "react";
import { useBuild } from "../context/BuildContext";
import { CATEGORY_BY_PATH } from "../constants";
import { getParts, getAllParts, isPartCompatible } from "../api/client";
import PartTable from "../components/PartTable";
import { useLocation } from "react-router-dom";

export default function Category() {
  const { addPart, selected } = useBuild();
  const { pathname } = useLocation();
  const cat = CATEGORY_BY_PATH[pathname]; // e.g., "/cpu" -> { key: "cpus", ...}
  const [parts, setParts] = useState([]);
  const [currentPageParts, setCurrentPageParts] = useState([]); // Current page parts (unfiltered)
  const [allParts, setAllParts] = useState([]); // Store all parts for filtering
  const [allPartsFetched, setAllPartsFetched] = useState(false); // Track if we've fetched all parts
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, total_pages: 0, page: 1 });
  const [compatibleOnly, setCompatibleOnly] = useState(false);
  const [filteredParts, setFilteredParts] = useState([]);
  const [filtering, setFiltering] = useState(false);
  const scrollPositionRef = useRef(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    socket: '',
    ramType: '',
    chipset: '',
    pcieGen: '',
    tdpMax: '',
    wattageMin: '',
    rating: '',
    type: '',
    capacityMin: '',
    speedMin: '',
    manufacturer: '',
    // Case filters
    caseType: '',
    caseColor: '',
    sidePanel: '',
    maxGpuLength: '',
    // Monitor filters
    screenSizeMin: '',
    screenSizeMax: '',
    resolution: '',
    refreshRateMin: '',
    panelType: '',
    curved: '',
    // OS filters
    osVersion: '',
    osMode: '',
    maxMemory: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [allPartsForFiltering, setAllPartsForFiltering] = useState([]);
  
  // Check if user has any parts selected (to show the checkbox)
  const hasSelectedParts = Object.values(selected).some(v => v !== null && v !== undefined);
  
  // Paginate filtered results
  const pageSize = 10;
  const paginatedFilteredParts = useMemo(() => {
    if (!compatibleOnly || !hasSelectedParts || filteredParts.length === 0) {
      return { results: [], total_pages: 0 };
    }
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      results: filteredParts.slice(start, end),
      total_pages: Math.ceil(filteredParts.length / pageSize)
    };
  }, [filteredParts, page, compatibleOnly, hasSelectedParts]);

  useEffect(() => {
    let mounted = true;
    if (!cat) {
      setParts([]);
      setLoading(false);
      setPage(1);
      return;
    }
    
    setLoading(true);
    setParts([]); // Clear previous parts immediately
    setCompatibleOnly(false); // Reset filter when category changes
    setFilters({ // Reset all filters when category changes
      priceMin: '',
      priceMax: '',
      socket: '',
      ramType: '',
      chipset: '',
      pcieGen: '',
      tdpMax: '',
      wattageMin: '',
      rating: '',
      type: '',
      capacityMin: '',
      speedMin: '',
      manufacturer: '',
      caseType: '',
      caseColor: '',
      sidePanel: '',
      maxGpuLength: '',
      screenSizeMin: '',
      screenSizeMax: '',
      resolution: '',
      refreshRateMin: '',
      panelType: '',
      curved: '',
      osVersion: '',
      osMode: '',
      maxMemory: ''
    });
    setAllPartsForFiltering([]);
    
    const currentPage = 1; // Always start at page 1 when category changes
    setPage(currentPage);
    
    getParts(cat.key, currentPage).then((data) => {
      if (mounted) {
        if (data.results) {
          setCurrentPageParts(data.results);
          setParts(data.results);
          setPagination({
            count: data.count || 0,
            total_pages: data.total_pages || 0,
            page: data.page || 1
          });
        } else {
          const partsArray = Array.isArray(data) ? data : [];
          setCurrentPageParts(partsArray);
          setParts(partsArray);
        }
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Error fetching parts:', error);
      if (mounted) {
        setParts([]);
        setCurrentPageParts([]);
        setLoading(false);
      }
    });
    
    return () => { mounted = false; };
  }, [cat, pathname]); // Add pathname to dependencies to ensure re-fetch on route change

  // Fetch all parts when compatible filter is enabled
  useEffect(() => {
    if (!compatibleOnly || !hasSelectedParts || !cat) {
      setAllPartsFetched(false);
      return;
    }
    
    // If filter is enabled, fetch all parts
    if (!allPartsFetched) {
      setFiltering(true);
      getAllParts(cat.key).then((data) => {
        setAllParts(data.results || []);
        setAllPartsFetched(true);
        setFiltering(false);
      }).catch((error) => {
        console.error('Error fetching all parts:', error);
        setFiltering(false);
      });
    }
  }, [compatibleOnly, hasSelectedParts, cat, allPartsFetched]);
  
  // Filter parts based on compatibility when checkbox is checked
  useEffect(() => {
    if (!compatibleOnly || !hasSelectedParts) {
      setFilteredParts([]);
      setPage(1);
      return;
    }
    
    if (allParts.length === 0) return;
    
    setFiltering(true);
    const filterParts = async () => {
      const compatible = [];
      
      // Process parts in parallel batches to speed up filtering
      const batchSize = 20; // Check 20 parts at a time
      const batches = [];
      
      for (let i = 0; i < allParts.length; i += batchSize) {
        batches.push(allParts.slice(i, i + batchSize));
      }
      
      // Process each batch in parallel
      for (const batch of batches) {
        // Check all parts in this batch in parallel
        const compatibilityChecks = batch.map(part => 
          isPartCompatible(part, cat.key, selected)
        );
        
        const results = await Promise.all(compatibilityChecks);
        
        // Add compatible parts from this batch
        batch.forEach((part, index) => {
          if (results[index]) {
            compatible.push(part);
          }
        });
      }
      
      setFilteredParts(compatible);
      setPage(1); // Reset to page 1 when filtering
      setFiltering(false);
    };
    
    filterParts();
  }, [compatibleOnly, allParts, selected, cat, hasSelectedParts]);
  
  // Fetch all parts for filtering when filters are active
  useEffect(() => {
    const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== null);
    if (hasActiveFilters && !allPartsForFiltering.length && cat) {
      getAllParts(cat.key).then((data) => {
        setAllPartsForFiltering(data.results || []);
      }).catch((error) => {
        console.error('Error fetching all parts for filtering:', error);
      });
    }
  }, [filters, cat, allPartsForFiltering.length]);

  // Apply filters to parts
  const applyFilters = useMemo(() => {
    return (partsList) => {
      let filtered = [...partsList];
      
      // Price filter - only apply to parts with prices, always include parts without prices
      if (filters.priceMin) {
        const min = parseFloat(filters.priceMin);
        if (!isNaN(min)) {
          filtered = filtered.filter(p => !p.price || p.price >= min);
        }
      }
      if (filters.priceMax) {
        const max = parseFloat(filters.priceMax);
        if (!isNaN(max)) {
          filtered = filtered.filter(p => !p.price || p.price <= max);
        }
      }
      
      // Category-specific filters
      if (cat?.key === 'cpus') {
        if (filters.socket) {
          filtered = filtered.filter(p => p.socket && p.socket.toLowerCase().includes(filters.socket.toLowerCase()));
        }
        if (filters.tdpMax) {
          const maxTdp = parseFloat(filters.tdpMax);
          if (!isNaN(maxTdp)) {
            filtered = filtered.filter(p => p.tdp && p.tdp <= maxTdp);
          }
        }
      } else if (cat?.key === 'motherboards') {
        if (filters.socket) {
          filtered = filtered.filter(p => p.socket && p.socket.toLowerCase().includes(filters.socket.toLowerCase()));
        }
        if (filters.ramType) {
          filtered = filtered.filter(p => p.ramType && p.ramType.toLowerCase().includes(filters.ramType.toLowerCase()));
        }
        if (filters.chipset) {
          filtered = filtered.filter(p => p.chipset && p.chipset.toLowerCase().includes(filters.chipset.toLowerCase()));
        }
      } else if (cat?.key === 'gpus') {
        if (filters.pcieGen) {
          filtered = filtered.filter(p => p.pcieGen && p.pcieGen.toString() === filters.pcieGen);
        }
        if (filters.tdpMax) {
          const maxTdp = parseFloat(filters.tdpMax);
          if (!isNaN(maxTdp)) {
            filtered = filtered.filter(p => p.tdp && p.tdp <= maxTdp);
          }
        }
      } else if (cat?.key === 'memory') {
        if (filters.ramType) {
          filtered = filtered.filter(p => p.ramType && p.ramType.toLowerCase().includes(filters.ramType.toLowerCase()));
        }
        if (filters.speedMin) {
          const minSpeed = parseFloat(filters.speedMin);
          if (!isNaN(minSpeed)) {
            filtered = filtered.filter(p => p.speedMHz && p.speedMHz >= minSpeed);
          }
        }
        if (filters.capacityMin) {
          const minCap = parseFloat(filters.capacityMin);
          if (!isNaN(minCap)) {
            filtered = filtered.filter(p => p.capacityGB && p.capacityGB >= minCap);
          }
        }
      } else if (cat?.key === 'storage') {
        if (filters.type) {
          filtered = filtered.filter(p => p.type && p.type.toLowerCase().includes(filters.type.toLowerCase()));
        }
        if (filters.capacityMin) {
          const minCap = parseFloat(filters.capacityMin);
          if (!isNaN(minCap)) {
            filtered = filtered.filter(p => p.capacityGB && p.capacityGB >= minCap);
          }
        }
      } else if (cat?.key === 'psus') {
        if (filters.wattageMin) {
          const minWatt = parseFloat(filters.wattageMin);
          if (!isNaN(minWatt)) {
            filtered = filtered.filter(p => p.wattage && p.wattage >= minWatt);
          }
        }
        if (filters.rating) {
          filtered = filtered.filter(p => p.rating && p.rating.toLowerCase().includes(filters.rating.toLowerCase()));
        }
      } else if (cat?.key === 'coolers') {
        if (filters.tdpMax) {
          const maxTdp = parseFloat(filters.tdpMax);
          if (!isNaN(maxTdp)) {
            filtered = filtered.filter(p => p.tdpRating && p.tdpRating <= maxTdp);
          }
        }
      } else if (cat?.key === 'cases') {
        if (filters.caseType) {
          filtered = filtered.filter(p => p.type && p.type.toLowerCase().includes(filters.caseType.toLowerCase()));
        }
        if (filters.caseColor) {
          filtered = filtered.filter(p => p.color && p.color.toLowerCase().includes(filters.caseColor.toLowerCase()));
        }
        if (filters.sidePanel) {
          filtered = filtered.filter(p => p.side_panel && p.side_panel.toLowerCase().includes(filters.sidePanel.toLowerCase()));
        }
        if (filters.maxGpuLength) {
          const minLength = parseFloat(filters.maxGpuLength);
          if (!isNaN(minLength)) {
            filtered = filtered.filter(p => p.maximum_video_card_length && p.maximum_video_card_length >= minLength);
          }
        }
      } else if (cat?.key === 'monitors') {
        if (filters.screenSizeMin) {
          const minSize = parseFloat(filters.screenSizeMin);
          if (!isNaN(minSize)) {
            filtered = filtered.filter(p => p.screen_size && p.screen_size >= minSize);
          }
        }
        if (filters.screenSizeMax) {
          const maxSize = parseFloat(filters.screenSizeMax);
          if (!isNaN(maxSize)) {
            filtered = filtered.filter(p => p.screen_size && p.screen_size <= maxSize);
          }
        }
        if (filters.resolution) {
          filtered = filtered.filter(p => p.resolution && p.resolution.toLowerCase().includes(filters.resolution.toLowerCase()));
        }
        if (filters.refreshRateMin) {
          const minRefresh = parseFloat(filters.refreshRateMin);
          if (!isNaN(minRefresh)) {
            filtered = filtered.filter(p => p.refresh_rate && p.refresh_rate >= minRefresh);
          }
        }
        if (filters.panelType) {
          filtered = filtered.filter(p => p.panel_type && p.panel_type.toLowerCase().includes(filters.panelType.toLowerCase()));
        }
        if (filters.curved) {
          const isCurved = filters.curved === 'true';
          filtered = filtered.filter(p => p.curved_screen === isCurved);
        }
      } else if (cat?.key === 'os') {
        if (filters.osVersion) {
          filtered = filtered.filter(p => p.version && p.version.toLowerCase().includes(filters.osVersion.toLowerCase()));
        }
        if (filters.osMode) {
          filtered = filtered.filter(p => p.mode && p.mode.toLowerCase().includes(filters.osMode.toLowerCase()));
        }
        if (filters.maxMemory) {
          const minMemory = parseFloat(filters.maxMemory);
          if (!isNaN(minMemory)) {
            filtered = filtered.filter(p => p.maximum_supported_memory && p.maximum_supported_memory >= minMemory);
          }
        }
      }
      
      // Manufacturer filter - applies to all categories
      if (filters.manufacturer) {
        filtered = filtered.filter(p => {
          // Check if part has manufacturer field
          if (p.manufacturer) {
            return p.manufacturer.toLowerCase().includes(filters.manufacturer.toLowerCase());
          }
          // Also check name for manufacturer if manufacturer field doesn't exist
          if (p.name) {
            return p.name.toLowerCase().includes(filters.manufacturer.toLowerCase());
          }
          return false;
        });
      }
      
      return filtered;
    };
  }, [filters, cat]);

  // Get unique values for filter dropdowns
  const getUniqueValues = useMemo(() => {
    return (field) => {
      const values = new Set();
      allPartsForFiltering.forEach(p => {
        if (p[field] && p[field] !== null && p[field] !== '') {
          values.add(p[field]);
        }
      });
      return Array.from(values).sort();
    };
  }, [allPartsForFiltering]);

  // Apply filters and paginate
  const filteredAndPaginatedParts = useMemo(() => {
    const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== null);
    
    if (!hasActiveFilters && !compatibleOnly) {
      return { results: currentPageParts, total_pages: pagination.total_pages, count: pagination.count };
    }
    
    let partsToFilter = [];
    if (compatibleOnly && hasSelectedParts) {
      partsToFilter = filteredParts;
    } else if (hasActiveFilters) {
      partsToFilter = applyFilters(allPartsForFiltering.length > 0 ? allPartsForFiltering : allParts);
    } else {
      partsToFilter = allParts;
    }
    
    // Apply both filters if both are active
    if (hasActiveFilters && compatibleOnly && hasSelectedParts) {
      partsToFilter = applyFilters(filteredParts);
    }
    
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      results: partsToFilter.slice(start, end),
      total_pages: Math.ceil(partsToFilter.length / pageSize),
      count: partsToFilter.length
    };
  }, [filters, compatibleOnly, hasSelectedParts, filteredParts, allPartsForFiltering, allParts, currentPageParts, pagination, page, applyFilters]);

  // Update displayed parts based on filter state
  useEffect(() => {
    setParts(filteredAndPaginatedParts.results);
  }, [filteredAndPaginatedParts]);
  
  // Calculate display count
  const displayCount = filteredAndPaginatedParts.count;
  const displayTotalPages = filteredAndPaginatedParts.total_pages;

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (pagination.total_pages && newPage > pagination.total_pages)) return;
    
    // Save current scroll position
    scrollPositionRef.current = window.scrollY || window.pageYOffset;
    
    setLoading(true);
    setPage(newPage);
    setCompatibleOnly(false); // Reset filter when changing pages
    
    getParts(cat.key, newPage).then((data) => {
      if (data.results) {
        setCurrentPageParts(data.results);
        setParts(data.results);
        setPagination({
          count: data.count || 0,
          total_pages: data.total_pages || 0,
          page: data.page || newPage
        });
      } else {
        const partsArray = Array.isArray(data) ? data : [];
        setCurrentPageParts(partsArray);
        setParts(partsArray);
      }
      setLoading(false);
      
      // Restore scroll position after a brief delay to ensure DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPositionRef.current);
        });
      });
    }).catch((error) => {
      console.error('Error fetching parts:', error);
      setLoading(false);
    });
  };

  if (!cat) return <main className="container main"><div className="panel"><div className="panel-header"><div className="panel-title">Unknown category</div></div></div></main>;

  return (
    <main className="container main">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{cat.label}</div>
            <div className="panel-sub">Select one {cat.label.toLowerCase()} for your build</div>
          </div>
        </div>
        
        {/* Total count, filters, and compatible filter */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid var(--hair)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
              {compatibleOnly && hasSelectedParts ? (
                <span>Showing <strong>{displayCount}</strong> compatible {displayCount === 1 ? 'part' : 'parts'} (of {pagination.count} total)</span>
              ) : (
                <span><strong>{displayCount}</strong> {displayCount === 1 ? 'part' : 'parts'} available</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn sm" 
                onClick={() => setShowFilters(!showFilters)}
                style={{ fontSize: '13px' }}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              {hasSelectedParts && (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  <input
                    type="checkbox"
                    checked={compatibleOnly}
                    onChange={(e) => {
                      setCompatibleOnly(e.target.checked);
                      setPage(1);
                      setAllPartsFetched(false);
                    }}
                    disabled={filtering}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Compatible parts only</span>
                </label>
              )}
            </div>
          </div>
          
          {/* Filter Panel */}
          {showFilters && (
            <div style={{
              padding: '16px',
              background: 'var(--bg-800)',
              border: '1px solid var(--hair)',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {/* Price Range - Always available */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                  Min Price ($)
                </label>
                <input
                  type="number"
                  value={filters.priceMin}
                  onChange={(e) => {
                    setFilters({...filters, priceMin: e.target.value});
                    setPage(1);
                  }}
                  placeholder="Min"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--panel)',
                    border: '1px solid var(--hair)',
                    borderRadius: '6px',
                    color: 'var(--text-100)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                  Max Price ($)
                </label>
                <input
                  type="number"
                  value={filters.priceMax}
                  onChange={(e) => {
                    setFilters({...filters, priceMax: e.target.value});
                    setPage(1);
                  }}
                  placeholder="Max"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--panel)',
                    border: '1px solid var(--hair)',
                    borderRadius: '6px',
                    color: 'var(--text-100)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              {/* Manufacturer Filter - Available for all categories */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={filters.manufacturer}
                  onChange={(e) => {
                    setFilters({...filters, manufacturer: e.target.value});
                    setPage(1);
                  }}
                  placeholder="e.g., AMD, Intel, NVIDIA"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--panel)',
                    border: '1px solid var(--hair)',
                    borderRadius: '6px',
                    color: 'var(--text-100)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              {/* CPU Filters */}
              {cat?.key === 'cpus' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Socket
                    </label>
                    <input
                      type="text"
                      value={filters.socket}
                      onChange={(e) => {
                        setFilters({...filters, socket: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., AM4, LGA1700"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Max TDP (W)
                    </label>
                    <input
                      type="number"
                      value={filters.tdpMax}
                      onChange={(e) => {
                        setFilters({...filters, tdpMax: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Max TDP"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* Motherboard Filters */}
              {cat?.key === 'motherboards' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Socket
                    </label>
                    <input
                      type="text"
                      value={filters.socket}
                      onChange={(e) => {
                        setFilters({...filters, socket: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., AM4, LGA1700"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      RAM Type
                    </label>
                    <input
                      type="text"
                      value={filters.ramType}
                      onChange={(e) => {
                        setFilters({...filters, ramType: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., DDR4, DDR5"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Chipset
                    </label>
                    <input
                      type="text"
                      value={filters.chipset}
                      onChange={(e) => {
                        setFilters({...filters, chipset: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., B550, Z690"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* GPU Filters */}
              {cat?.key === 'gpus' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      PCIe Generation
                    </label>
                    <input
                      type="text"
                      value={filters.pcieGen}
                      onChange={(e) => {
                        setFilters({...filters, pcieGen: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., 3, 4"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Max TDP (W)
                    </label>
                    <input
                      type="number"
                      value={filters.tdpMax}
                      onChange={(e) => {
                        setFilters({...filters, tdpMax: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Max TDP"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* Memory Filters */}
              {cat?.key === 'memory' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      RAM Type
                    </label>
                    <input
                      type="text"
                      value={filters.ramType}
                      onChange={(e) => {
                        setFilters({...filters, ramType: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., DDR4, DDR5"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min Speed (MHz)
                    </label>
                    <input
                      type="number"
                      value={filters.speedMin}
                      onChange={(e) => {
                        setFilters({...filters, speedMin: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min Speed"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min Capacity (GB)
                    </label>
                    <input
                      type="number"
                      value={filters.capacityMin}
                      onChange={(e) => {
                        setFilters({...filters, capacityMin: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min Capacity"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* Storage Filters */}
              {cat?.key === 'storage' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Type
                    </label>
                    <input
                      type="text"
                      value={filters.type}
                      onChange={(e) => {
                        setFilters({...filters, type: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., SSD, HDD, NVMe"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min Capacity (GB)
                    </label>
                    <input
                      type="number"
                      value={filters.capacityMin}
                      onChange={(e) => {
                        setFilters({...filters, capacityMin: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min Capacity"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* PSU Filters */}
              {cat?.key === 'psus' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min Wattage (W)
                    </label>
                    <input
                      type="number"
                      value={filters.wattageMin}
                      onChange={(e) => {
                        setFilters({...filters, wattageMin: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min Wattage"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Efficiency Rating
                    </label>
                    <input
                      type="text"
                      value={filters.rating}
                      onChange={(e) => {
                        setFilters({...filters, rating: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., 80+ Bronze, Gold"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* Cooler Filters */}
              {cat?.key === 'coolers' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                    Max TDP Rating (W)
                  </label>
                  <input
                    type="number"
                    value={filters.tdpMax}
                    onChange={(e) => {
                      setFilters({...filters, tdpMax: e.target.value});
                      setPage(1);
                    }}
                    placeholder="Max TDP"
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--panel)',
                      border: '1px solid var(--hair)',
                      borderRadius: '6px',
                      color: 'var(--text-100)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}
              
              {/* Case Filters */}
              {cat?.key === 'cases' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Case Type
                    </label>
                    <input
                      type="text"
                      value={filters.caseType}
                      onChange={(e) => {
                        setFilters({...filters, caseType: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., Mid Tower, Full Tower"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Color
                    </label>
                    <input
                      type="text"
                      value={filters.caseColor}
                      onChange={(e) => {
                        setFilters({...filters, caseColor: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., Black, White"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Side Panel
                    </label>
                    <input
                      type="text"
                      value={filters.sidePanel}
                      onChange={(e) => {
                        setFilters({...filters, sidePanel: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., Tempered Glass"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min GPU Length (mm)
                    </label>
                    <input
                      type="number"
                      value={filters.maxGpuLength}
                      onChange={(e) => {
                        setFilters({...filters, maxGpuLength: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min GPU Length"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* Monitor Filters */}
              {cat?.key === 'monitors' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min Screen Size (inches)
                    </label>
                    <input
                      type="number"
                      value={filters.screenSizeMin}
                      onChange={(e) => {
                        setFilters({...filters, screenSizeMin: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min Size"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Max Screen Size (inches)
                    </label>
                    <input
                      type="number"
                      value={filters.screenSizeMax}
                      onChange={(e) => {
                        setFilters({...filters, screenSizeMax: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Max Size"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Resolution
                    </label>
                    <input
                      type="text"
                      value={filters.resolution}
                      onChange={(e) => {
                        setFilters({...filters, resolution: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., 1920x1080, 2560x1440"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min Refresh Rate (Hz)
                    </label>
                    <input
                      type="number"
                      value={filters.refreshRateMin}
                      onChange={(e) => {
                        setFilters({...filters, refreshRateMin: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min Refresh Rate"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Panel Type
                    </label>
                    <input
                      type="text"
                      value={filters.panelType}
                      onChange={(e) => {
                        setFilters({...filters, panelType: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., IPS, VA, TN"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Curved Screen
                    </label>
                    <select
                      value={filters.curved}
                      onChange={(e) => {
                        setFilters({...filters, curved: e.target.value});
                        setPage(1);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Any</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </>
              )}
              
              {/* OS Filters */}
              {cat?.key === 'os' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Version
                    </label>
                    <input
                      type="text"
                      value={filters.osVersion}
                      onChange={(e) => {
                        setFilters({...filters, osVersion: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., Windows 11, Windows 10"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Mode
                    </label>
                    <input
                      type="text"
                      value={filters.osMode}
                      onChange={(e) => {
                        setFilters({...filters, osMode: e.target.value});
                        setPage(1);
                      }}
                      placeholder="e.g., 64-bit, 32-bit"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Min Max Memory (GB)
                    </label>
                    <input
                      type="number"
                      value={filters.maxMemory}
                      onChange={(e) => {
                        setFilters({...filters, maxMemory: e.target.value});
                        setPage(1);
                      }}
                      placeholder="Min Max Memory"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--hair)',
                        borderRadius: '6px',
                        color: 'var(--text-100)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* Clear Filters Button */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn sm"
                  onClick={() => {
                    setFilters({
                      priceMin: '',
                      priceMax: '',
                      socket: '',
                      ramType: '',
                      chipset: '',
                      pcieGen: '',
                      tdpMax: '',
                      wattageMin: '',
                      rating: '',
                      type: '',
                      capacityMin: '',
                      speedMin: '',
                      manufacturer: '',
                      caseType: '',
                      caseColor: '',
                      sidePanel: '',
                      maxGpuLength: '',
                      screenSizeMin: '',
                      screenSizeMax: '',
                      resolution: '',
                      refreshRateMin: '',
                      panelType: '',
                      curved: '',
                      osVersion: '',
                      osMode: '',
                      maxMemory: ''
                    });
                    setPage(1);
                  }}
                  style={{ width: '100%' }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
        
        {loading || filtering ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            {loading ? 'Loading parts...' : 'Filtering compatible parts...'}
          </div>
        ) : (
          <>
        <PartTable
              key={cat.key} // Force re-render when category changes
          categoryKey={cat.key}
          parts={parts}
          onAdd={(p) => addPart(cat.key, p)}
        />
            {/* Pagination - show for both filtered and unfiltered results */}
            {displayTotalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px',
                borderTop: '1px solid var(--hair)',
                marginTop: '16px',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <button 
                  className="btn" 
                  onClick={() => {
                    if (compatibleOnly && hasSelectedParts) {
                      scrollPositionRef.current = window.scrollY || window.pageYOffset;
                      setPage(Math.max(1, page - 1));
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          window.scrollTo(0, scrollPositionRef.current);
                        });
                      });
                    } else {
                      handlePageChange(page - 1);
                    }
                  }}
                  disabled={page === 1}
                  style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                
                {/* Fancy pagination with ellipsis - always show page 1, middle page, and last page */}
                {displayTotalPages > 1 && (() => {
                  const pages = [];
                  const showEllipsis = displayTotalPages > 7;
                  const middlePage = Math.ceil(displayTotalPages / 2);
                  const showMiddlePage = displayTotalPages >= 10 && middlePage !== 1 && middlePage !== displayTotalPages;
                  
                  // Always show page 1
                  pages.push(1);
                  
                  if (showEllipsis) {
                    if (page <= 4) {
                      // Near the beginning: 1, 2, 3, 4, 5, ..., middle, ..., last
                      for (let i = 2; i <= 5; i++) {
                        pages.push(i);
                      }
                      if (showMiddlePage && middlePage > 6) {
                        pages.push('ellipsis-end');
                        pages.push(middlePage);
                        pages.push('ellipsis-end-2');
                      } else {
                        pages.push('ellipsis-end');
                      }
                    } else if (page >= displayTotalPages - 3) {
                      // Near the end: 1, ..., middle, ..., (last-4), (last-3), (last-2), (last-1), last
                      if (showMiddlePage && middlePage < displayTotalPages - 5) {
                        pages.push('ellipsis-start');
                        pages.push(middlePage);
                        pages.push('ellipsis-start-2');
                      } else {
                        pages.push('ellipsis-start');
                      }
                      for (let i = displayTotalPages - 4; i <= displayTotalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // In the middle: 1, ..., (page-1), page, (page+1), ..., middle (if needed), ..., last
                      pages.push('ellipsis-start');
                      for (let i = page - 1; i <= page + 1; i++) {
                        pages.push(i);
                      }
                      
                      // Add middle page if it's not already shown and not too close
                      if (showMiddlePage && !pages.includes(middlePage) && 
                          Math.abs(page - middlePage) > 3 && 
                          middlePage > page + 1 && middlePage < displayTotalPages - 1) {
                        pages.push('ellipsis-end');
                        pages.push(middlePage);
                        pages.push('ellipsis-end-2');
                      } else {
                        pages.push('ellipsis-end');
                      }
                    }
                  } else {
                    // Show all pages if 7 or fewer
                    for (let i = 2; i < displayTotalPages; i++) {
                      pages.push(i);
                    }
                  }
                  
                  // Always show last page (if more than 1 page)
                  if (displayTotalPages > 1 && !pages.includes(displayTotalPages)) {
                    pages.push(displayTotalPages);
                  }
                  
                  return (
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      flex: 1
                    }}>
                      {pages.map((item, idx) => {
                        if (item === 'ellipsis-start' || item === 'ellipsis-end' || 
                            item === 'ellipsis-start-2' || item === 'ellipsis-end-2') {
                          return (
                            <span 
                              key={`ellipsis-${idx}`}
                              style={{ 
                                color: 'var(--muted)',
                                padding: '0 4px',
                                fontSize: '18px',
                                userSelect: 'none'
                              }}
                            >
                              ...
                            </span>
                          );
                        }
                        
                        const pageNum = item;
                        return (
                          <button
                            key={pageNum}
                            className={page === pageNum ? "btn primary" : "btn"}
                            onClick={() => {
                              if (compatibleOnly && hasSelectedParts) {
                                scrollPositionRef.current = window.scrollY || window.pageYOffset;
                                setPage(pageNum);
                                requestAnimationFrame(() => {
                                  requestAnimationFrame(() => {
                                    window.scrollTo(0, scrollPositionRef.current);
                                  });
                                });
                              } else {
                                handlePageChange(pageNum);
                              }
                            }}
                            style={{
                              minWidth: '40px',
                              padding: '8px 12px',
                              fontWeight: page === pageNum ? 'bold' : 'normal'
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
                
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  Page {page} of {displayTotalPages}
                </span>
                
                <button 
                  className="btn" 
                  onClick={() => {
                    if (compatibleOnly && hasSelectedParts) {
                      scrollPositionRef.current = window.scrollY || window.pageYOffset;
                      setPage(Math.min(displayTotalPages, page + 1));
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          window.scrollTo(0, scrollPositionRef.current);
                        });
                      });
                    } else {
                      handlePageChange(page + 1);
                    }
                  }}
                  disabled={page >= displayTotalPages}
                  style={{ opacity: page >= displayTotalPages ? 0.5 : 1, cursor: page >= displayTotalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
            
            {/* Show message when filtering and no compatible parts found */}
            {compatibleOnly && hasSelectedParts && !filtering && filteredParts.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                No compatible parts found for the current selection.
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
