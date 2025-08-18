// src/pages/FamePage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useTable, useSortBy, useGlobalFilter } from 'react-table';
import axios from 'axios';

function formatDDMMYYYY(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function parseMaybeDate(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    const m = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    }
  }
  const d = new Date(input);
  return isNaN(d) ? null : d;
}
function toNumberOrNull(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}
function secondsToHM(sec) {
  if (sec == null || isNaN(sec)) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
function normalizeMedal(val) {
  if (!val) return null;
  const s = String(val).toLowerCase();
  if (s.includes('gold') || s.includes('gouden') || s.includes('🥇')) return 'gold';
  if (s.includes('silver') || s.includes('zilveren') || s.includes('🥈')) return 'silver';
  if (s.includes('bronze') || s.includes('bronzen') || s.includes('🥉')) return 'bronze';
  return null;
}
function MedalCell({ value }) {
  const m = normalizeMedal(value);
  if (m === 'gold')   return <span title="Gold">🥇</span>;
  if (m === 'silver') return <span title="Silver">🥈</span>;
  if (m === 'bronze') return <span title="Bronze">🥉</span>;
  return <span>–</span>;
}

export default function FamePage() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    axios.get('/api/fame').then(res => {
      const normalized = res.data.map(row => {
        // Dates
        const rawIso = row.dateRaw || row.activity_date || row.activityDate || row.date;
        const dateObj = parseMaybeDate(rawIso);
        const displayDate = row.date || (dateObj ? formatDDMMYYYY(dateObj) : '');

        // Match %
        const matchPct = toNumberOrNull(row.matchPercentage ?? row.match_percentage);

        // Moving time
        const seconds =
          toNumberOrNull(row.movingTimeSeconds ?? row.moving_time_seconds) ?? null;
        const displayTime =
          seconds != null
            ? secondsToHM(seconds)
            : (row.movingTime ?? row.moving_time ?? row.moving_time_formatted ?? '');

        return {
          ...row,
          _dateObj: dateObj,                 // real Date for sorting
          date: displayDate,                 // "DD.MM.YYYY" for display
          matchPercentage: matchPct,         // number or null
          movingSeconds: seconds,            // number or null (for sorting)
          movingTimeDisplay: displayTime,    // string for display
          medal: row.medal ?? row.medal_override ?? null,
          externalComment: row.externalComment ?? row.external_comment ?? ''
        };
      });
      setData(normalized);
    });
  }, []);

  const columns = useMemo(() => [
    {
      Header: 'Date',
      accessor: '_dateObj',
      Cell: ({ row }) => row.original.date,
      sortType: 'datetime'
    },
    {
      Header: 'Name',
      accessor: 'name'
    },
    {
      Header: 'Time',
      accessor: 'movingSeconds',
      Cell: ({ row }) => row.original.movingTimeDisplay,
      sortType: 'basic' // numeric sort on movingSeconds
    },
    {
      Header: 'Match %',
      accessor: 'matchPercentage',
      Cell: ({ value }) => (value == null ? '–' : `${value.toFixed(1)}%`),
      sortType: (a, b, id) => {
        const va = a.values[id] ?? -Infinity;
        const vb = b.values[id] ?? -Infinity;
        return (va > vb) ? 1 : (va < vb) ? -1 : 0;
      }
    },
    {
      Header: 'Medal',
      accessor: 'medal',
      Cell: MedalCell
    },
    {
      Header: 'Comment',
      accessor: 'externalComment'
    }
  ], []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter,
  } = useTable({ columns, data }, useGlobalFilter, useSortBy);

  useEffect(() => {
    setGlobalFilter(filter || undefined);
  }, [filter, setGlobalFilter]);

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Hall of Fame</h1>
      <input
        placeholder="Search..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ marginBottom: '1rem', width: '100%', padding: '0.5rem' }}
      />
      <table {...getTableProps()} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {headerGroups.map(hg => {
            const { key, ...trProps } = hg.getHeaderGroupProps();
            return (
              <tr key={key} {...trProps}>
                {hg.headers.map(col => {
                  const thProps = col.getHeaderProps(col.getSortByToggleProps());
                  const { key: thKey, ...restTh } = thProps;
                  return (
                    <th
                      key={thKey}
                      {...restTh}
                      style={{
                        borderBottom: '1px solid #000',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        userSelect: 'none',
                        textAlign:
                          col.Header === 'Match %' || col.Header === 'Time' ? 'right' : 'left'
                      }}
                    >
                      {col.render('Header')}
                      <span>{col.isSorted ? (col.isSortedDesc ? ' 🔽' : ' 🔼') : ''}</span>
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            const { key, ...rowProps } = row.getRowProps();
            return (
              <tr key={key} {...rowProps}>
                {row.cells.map(cell => {
                  const { key: tdKey, ...tdProps } = cell.getCellProps();
                  return (
                    <td
                      key={tdKey}
                      {...tdProps}
                      style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid #eee',
                        textAlign:
                          cell.column.Header === 'Match %' || cell.column.Header === 'Time'
                            ? 'right'
                            : 'left'
                      }}
                    >
                      {cell.render('Cell')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}