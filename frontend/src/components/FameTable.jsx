import React, { useMemo } from 'react';
import {
  useTable,
  useSortBy,
  useGlobalFilter,
} from 'react-table';

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (h > 0 ? h + ':' : '') +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0');
}

export default function FameTable({ data }) {
  const columns = useMemo(() => [
    {
      Header: 'Date',
      accessor: 'date',
    },
    {
      Header: 'Name',
      accessor: row => `${row.firstName} ${row.lastName}`,
      id: 'name',
    },
    {
      Header: 'Moving Time',
      accessor: row => formatTime(row.movingTimeSeconds),
      id: 'movingTime',
    },
    {
      Header: 'Medal',
      accessor: row => {
        const fast = row.movingTimeSeconds < 11.5 * 60;
        const frik = Boolean(row.frikadelleProof);
        if (fast && frik) return '🥇 Gold';
        if (fast || frik) return '🥈 Silver';
        return '🥉 Bronze';
      },
      id: 'medal',
    },
  ], []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    setGlobalFilter,
  } = useTable(
    { columns, data },
    useGlobalFilter,
    useSortBy,
  );

  return (
    <>
      <input
        style={{ marginBottom: '0.5rem', padding: '0.25rem' }}
        placeholder="Search..."
        value={state.globalFilter || ''}
        onChange={e => setGlobalFilter(e.target.value)}
      />
      <table {...getTableProps()} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {headerGroups.map(hg => (
            <tr {...hg.getHeaderGroupProps()}>
              {hg.headers.map(col => (
                <th
                  {...col.getHeaderProps(col.getSortByToggleProps())}
                  style={{
                    borderBottom: '2px solid #333',
                    padding: '0.5rem',
                    textAlign: 'left',
                  }}
                >
                  {col.render('Header')}
                  <span>
                    {col.isSorted
                      ? (col.isSortedDesc ? ' 🔽' : ' 🔼')
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(r => {
            prepareRow(r);
            return (
              <tr {...r.getRowProps()}>
                {r.cells.map(cell => (
                  <td
                    {...cell.getCellProps()}
                    style={{
                      padding: '0.5rem',
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}