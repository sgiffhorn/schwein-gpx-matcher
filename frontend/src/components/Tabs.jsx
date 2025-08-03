// src/components/Tabs.jsx
import React from 'react';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}                // ← use the unique id as the key
          onClick={() => onChange(tab.id)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: 4,
            background: tab.id === activeTab ? '#eee' : '#fff',
            cursor: 'pointer'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}