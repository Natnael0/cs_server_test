import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { useBuild } from "../context/BuildContext";
import { CATEGORY_BY_KEY, CATEGORY_BY_PATH } from "../constants";
import { getPartDetail, getImageUrl } from "../api/client";

export default function PartDetail() {
  const { partId } = useParams();
  const location = useLocation();
  
  // Extract category from URL path
  const pathParts = location.pathname.split('/');
  const categoryPath = pathParts[1]; // e.g., "cpu", "motherboards", etc.
  const category = CATEGORY_BY_PATH[`/${categoryPath}`];
  const categoryKey = category?.key;
  
  const { addPart, selected } = useBuild();
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const imageUrl = part && categoryKey ? getImageUrl(part.image_path, categoryKey) : null;
  const isInBuild = categoryKey && selected[categoryKey]?.id === parseInt(partId);

  useEffect(() => {
    if (!categoryKey || !partId) {
      setError("Invalid part ID or category");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    console.log(`[PartDetail] Fetching part: categoryKey=${categoryKey}, partId=${partId}, categoryPath=${categoryPath}`);
    
    getPartDetail(categoryKey, partId)
      .then((data) => {
        console.log(`[PartDetail] Response received:`, { hasError: !!data.error, hasData: !!data, keys: data ? Object.keys(data).slice(0, 5) : [] });
        if (data.error) {
          console.error(`[PartDetail] Error from API:`, data.error);
          setError(data.error);
        } else {
          setPart(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PartDetail] Error fetching part details:', err);
        setError("Failed to load part details");
        setLoading(false);
      });
  }, [categoryKey, partId, categoryPath]);

  const handleAddToBuild = () => {
    if (part) {
      addPart(categoryKey, part);
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.join(', ');
      return JSON.stringify(value);
    }
    return value;
  };

  if (loading) {
    return (
      <main className="container main">
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading part details...</div>
      </main>
    );
  }

  if (error || !part) {
    return (
      <main className="container main">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: 'var(--err)', marginBottom: '16px' }}>{error || 'Part not found'}</div>
          <Link to={`/${category?.path || ''}`} className="btn">Back to {category?.label || 'Category'}</Link>
        </div>
      </main>
    );
  }

  // Get all non-null fields for display
  const fields = Object.entries(part)
    .filter(([key, value]) => key !== 'id' && key !== 'image_path' && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: formatValue(value)
    }));

  return (
    <main className="container main">
      <section className="panel">
        <div className="panel-header">
          <div>
            <Link to={`/${category?.path || ''}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '14px' }}>
              ← Back to {category?.label || 'Category'}
            </Link>
            <div className="panel-title" style={{ marginTop: '8px' }}>{part.name}</div>
            {part.manufacturer && (
              <div className="panel-sub">{part.manufacturer}</div>
            )}
          </div>
          <div>
            {part.price && (
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                ${part.price.toFixed(2)}
              </div>
            )}
            {isInBuild ? (
              <button className="btn" disabled style={{ opacity: 0.5 }}>
                Already in Build
              </button>
            ) : (
              <button className="btn primary" onClick={handleAddToBuild}>
                Add to Build
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', padding: '24px', flexWrap: 'wrap' }}>
          {/* Image */}
          <div style={{ 
            flex: '0 0 300px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid var(--hair)'
          }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={part.name}
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: 'auto',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                maxWidth: '300px',
                aspectRatio: '1',
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)'
              }}>
                No image available
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Specifications</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '12px'
            }}>
              {fields.map((field, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent), var(--bg-800)',
                  border: '1px solid var(--hair)',
                  borderRadius: '8px',
                  transition: 'border-color .2s ease, background .2s ease'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {field.label}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-200)' }}>
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

