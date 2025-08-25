// src/components/Tabs.jsx
import React from 'react';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}                // ← use the unique id as the key
          onClick={() => onChange(tab.id)}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}