import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBuild } from "../context/BuildContext";
import { CATEGORIES } from "../constants";
import { getCompatibility, getImageUrl } from "../api/client";
import jsPDF from "jspdf";

export default function Build() {
  const { selected, removePart, clearBuild } = useBuild();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const hasSelections = Object.values(selected).some(v => v !== null);
  const totalPrice = CATEGORIES.reduce((sum, c) => {
    const p = selected[c.key];
    return sum + (p?.price || 0);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const imageSize = 30;
    let yPos = margin;

    // Title
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('PC BUILD SUMMARY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Build components
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Components:', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    const buildData = CATEGORIES.map(c => {
      const p = selected[c.key];
      const imageUrl = p ? getImageUrl(p.image_path, c.key) : null;
      return {
        category: c.label,
        part: p ? p.name : null,
        price: p?.price || null,
        imageUrl: imageUrl
      };
    }).filter(item => item.part !== null);

    // If no parts selected, show a message
    if (buildData.length === 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('No parts selected yet.', pageWidth / 2, yPos, { align: 'center' });
      doc.save(`pc-build-${new Date().toISOString().split('T')[0]}.pdf`);
      return;
    }

    // Helper function to load image
    const loadImage = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    };

    // Process each component with image
    for (const item of buildData) {
      // Check if we need a new page
      if (yPos + imageSize > 250) {
        doc.addPage();
        yPos = margin;
      }

      const itemYStart = yPos;

      // Add image if available
      if (item.imageUrl) {
        try {
          const img = await loadImage(item.imageUrl);
          // Calculate aspect ratio to maintain image proportions
          const aspectRatio = img.width / img.height;
          const imgWidth = imageSize;
          const imgHeight = imageSize / aspectRatio;
          
          doc.addImage(img, 'JPEG', margin, yPos, imgWidth, imgHeight);
        } catch (error) {
          console.warn('Failed to load image for PDF:', error);
        }
      }

      // Add text next to image
      const textX = margin + imageSize + 10;
      const textWidth = pageWidth - textX - margin - 50; // Leave space for price

      doc.setFont(undefined, 'bold');
      doc.text(`${item.category}:`, textX, yPos + 5);
      
      const partName = doc.splitTextToSize(item.part || 'N/A', textWidth);
      doc.setFont(undefined, 'normal');
      doc.text(partName, textX, yPos + 12);
      
      // Price on the right
      if (item.price) {
        doc.setFont(undefined, 'bold');
        doc.text(`$${item.price.toFixed(2)}`, pageWidth - margin, yPos + 5, { align: 'right' });
      } else {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('N/A', pageWidth - margin, yPos + 5, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      }
      
      // Move to next item (use max of image height or text height)
      const imageHeight = item.imageUrl ? imageSize : 0;
      const textHeight = Math.max(15, partName.length * 5);
      yPos += Math.max(imageHeight, textHeight) + 10;
    }

    // Total
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Total:', pageWidth - margin - 40, yPos, { align: 'right' });
    doc.text(`$${totalPrice.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 20;

    // Compatibility Notes
    if (messages.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Compatibility Notes:', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      messages.forEach(msg => {
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }

        // Set color based on message level
        if (msg.level === 'ok') {
          doc.setTextColor(34, 197, 94);
        } else if (msg.level === 'warn') {
          doc.setTextColor(245, 158, 11);
        } else if (msg.level === 'error') {
          doc.setTextColor(239, 68, 68);
        } else {
          doc.setTextColor(0, 0, 0);
        }

        const levelText = `[${msg.level.toUpperCase()}]`;
        const messageText = doc.splitTextToSize(msg.message, pageWidth - margin * 2 - 30);
        
        doc.text(levelText, margin, yPos);
        doc.text(messageText, margin + 30, yPos);
        
        yPos += Math.max(8, messageText.length * 4);
        doc.setTextColor(0, 0, 0);
      });
    }

    // Save the PDF
    doc.save(`pc-build-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  useEffect(() => {
    const hasSelections = Object.values(selected).some(v => v !== null);
    if (!hasSelections) {
      setMessages([]);
      return;
    }
    
    setLoading(true);
    getCompatibility(selected).then(msgs => {
      setMessages(msgs);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [selected]);

  return (
    <main className="container main">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Your Build</div>
            <div className="panel-sub">One part per category. Replace by picking another.</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🖨️</span>
              <span>Print</span>
            </button>
            <button className="btn" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💾</span>
              <span>Download</span>
            </button>
          <button className="btn" onClick={clearBuild}>Clear</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Selection</th>
                <th>Price</th>
                <th className="col-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(c => {
                const p = selected[c.key];
                const imageUrl = p ? getImageUrl(p.image_path, c.key) : null;
                return (
                  <tr key={c.key}>
                    <td>{c.label}</td>
                    <td>
                      {p ? (
                        <Link 
                          to={`/${c.path}/${p.id}`}
                          style={{ 
                            textDecoration: 'none', 
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {imageUrl && (
                            <div style={{
                              width: '50px',
                              height: '50px',
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
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <span style={{ 
                            textDecoration: 'underline',
                            textDecorationColor: 'transparent',
                            transition: 'text-decoration-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.textDecorationColor = 'var(--text-200)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.textDecorationColor = 'transparent';
                          }}
                          >{p.name}</span>
                        </Link>
                      ) : (
                        <Link 
                          to={`/${c.path}`}
                          style={{ 
                            textDecoration: 'none',
                            color: 'var(--accent)'
                          }}
                        >
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>+</span>
                            <span>Choose a {c.label}</span>
                          </span>
                        </Link>
                      )}
                    </td>
                    <td>
                      {p && p.price ? (
                        <span>${p.price.toFixed(2)}</span>
                      ) : p ? (
                        <span className="muted">N/A</span>
                      ) : null}
                    </td>
                    <td className="col-right">
                      {p && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Link to={`/${c.path}`}>
                            <button className="btn sm">Change</button>
                          </Link>
                          <button className="btn sm" onClick={() => removePart(c.key)}>Remove</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--hair)' }}>
                <td colSpan="2" style={{ fontWeight: '700', padding: '16px' }}>
                  Total
                </td>
                <td style={{ fontWeight: '700', padding: '16px', fontSize: '18px' }}>
                  ${totalPrice.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <div className="panel-title">Compatibility</div>
        </div>
        <ul className="messages">
          {loading ? (
            <li className="muted">Checking compatibility...</li>
          ) : messages.length === 0 ? (
            <li className="muted">Add parts to see compatibility notes.</li>
          ) : (
            messages.map((m, i) => (
              <li key={i} className={`msg ${m.level}`}>{m.message}</li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
