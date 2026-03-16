import React from "react";
import { Link } from "react-router-dom";
import { getImageUrl } from "../api/client";

const columnsByCategory = {
  cpus: [
    { key: "name", label: "CPU" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "socket", label: "Socket" },
    { key: "tdp", label: "TDP", format: v => v ? `${v}W` : "—" }
  ],
  motherboards: [
    { key: "name", label: "Motherboard" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "socket", label: "Socket" },
    { key: "ramType", label: "RAM" },
    { key: "chipset", label: "Chipset" }
  ],
  gpus: [
    { key: "name", label: "GPU" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "pcieGen", label: "PCIe" },
    { key: "tdp", label: "TDP", format: v => v ? `${v}W` : "—" }
  ],
  memory: [
    { key: "name", label: "RAM" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "ramType", label: "Type" },
    { key: "speedMHz", label: "Speed", format: v => v ? `${v} MHz` : "—" },
    { key: "capacityGB", label: "Capacity", format: v => v ? `${v} GB` : "—" }
  ],
  storage: [
    { key: "name", label: "Storage" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "type", label: "Type" },
    { key: "capacityGB", label: "Capacity", format: v => v ? `${v} GB` : "—" }
  ],
  psus: [
    { key: "name", label: "PSU" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "wattage", label: "Watts", format: v => v ? `${v} W` : "—" },
    { key: "rating", label: "Rating" }
  ],
  coolers: [
    { key: "name", label: "Cooler" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "type", label: "Type" },
    { key: "tdpRating", label: "TDP", format: v => v ? `${v} W` : "—" }
  ],
  cases: [
    { key: "name", label: "Case" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "type", label: "Type" },
    { key: "color", label: "Color" }
  ],
  monitors: [
    { key: "name", label: "Monitor" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "screen_size", label: "Size", format: v => v ? `${v}"` : "—" },
    { key: "resolution", label: "Resolution" },
    { key: "refresh_rate", label: "Refresh", format: v => v ? `${v} Hz` : "—" }
  ],
  os: [
    { key: "name", label: "OS" },
    { key: "price", label: "Price", format: v => v ? `$${v.toFixed(2)}` : "—", className: "price" },
    { key: "version", label: "Version" },
    { key: "mode", label: "Mode" }
  ]
};

export default function PartTable({ categoryKey, parts, onAdd }) {
  const cols = columnsByCategory[categoryKey] || [{ key: "name", label: "Name" }];

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '80px' }}>Image</th>
            {cols.map(c => <th key={c.key}>{c.label}</th>)}
            <th className="col-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 ? (
            <tr>
              <td colSpan={cols.length + 2} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No parts found</div>
                <div style={{ fontSize: '14px' }}>
                  Try adjusting your filters or check back later for more options.
                </div>
              </td>
            </tr>
          ) : (
            parts.map((p) => {
              const imageUrl = p.image_path && categoryKey ? getImageUrl(p.image_path, categoryKey) : null;
              // Map category key to URL path
              const categoryPath = categoryKey === 'cpus' ? 'cpu' :
                                 categoryKey === 'motherboards' ? 'motherboards' :
                                 categoryKey === 'gpus' ? 'gpu' :
                                 categoryKey === 'memory' ? 'memory' :
                                 categoryKey === 'storage' ? 'storage' :
                                 categoryKey === 'psus' ? 'psu' :
                                 categoryKey === 'coolers' ? 'coolers' :
                                 categoryKey === 'cases' ? 'case' :
                                 categoryKey === 'monitors' ? 'monitor' :
                                 categoryKey === 'os' ? 'os' : '';
              const detailUrl = `/${categoryPath}/${p.id}`;
              
              return (
                <tr key={p.id ?? p.name}>
                  <td>
                    <Link to={detailUrl} style={{ display: 'inline-block', textDecoration: 'none' }}>
                      {imageUrl ? (
                        <div style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: '#ffffff',
                          borderRadius: '4px',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxSizing: 'border-box',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>
                          <img 
                            src={imageUrl} 
                            alt={p.name}
                            key={`${p.id}-${categoryKey}`} // Force re-render when category changes
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              borderRadius: '2px',
                              backgroundColor: '#ffffff',
                              display: 'block'
                            }}
                            onError={(e) => {
                              console.warn('Image failed to load:', imageUrl);
                              e.target.style.display = 'none';
                            }}
                            onLoad={() => {
                              // Image loaded successfully
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: '#ffffff',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: 'var(--muted)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxSizing: 'border-box',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>No image</div>
                      )}
                    </Link>
                  </td>
                  {cols.map(c => (
                    <td key={c.key} className={c.className || ''}>
                      <Link 
                        to={detailUrl} 
                        style={{ 
                          display: 'block', 
                          textDecoration: 'none', 
                          color: 'inherit',
                          padding: '8px 0'
                        }}
                      >
                        {c.format ? c.format(p[c.key]) : (p[c.key] ?? "—")}
                      </Link>
                    </td>
                  ))}
                  <td className="col-right">
                    <button 
                      className="btn sm primary" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAdd(p);
                      }}
                    >
                      Add
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
