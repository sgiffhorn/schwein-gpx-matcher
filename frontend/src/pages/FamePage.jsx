// src/pages/FamePage.jsx
import React, { useEffect, useState } from 'react';
import { useTable, useSortBy, useGlobalFilter } from 'react-table';
import axios from 'axios';

export default function FamePage() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    axios.get('/api/fame').then(res => setData(res.data));
  }, []);

  const columns = React.useMemo(() => [
    { Header: 'First', accessor: 'firstName' },
    { Header: 'Last', accessor: 'lastName' },
    { Header: 'Date', accessor: 'date' },
    { Header: 'Time', accessor: 'movingTime' },
    { Header: 'Medal', accessor: 'medal' },
  ], []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter,
  } = useTable({ columns, data }, useGlobalFilter, useSortBy);

  useEffect(() => { setGlobalFilter(filter); }, [filter, setGlobalFilter]);

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Hall of Fame</h1>
      <input
        placeholder="Search..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />
      <table {...getTableProps()} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {headerGroups.map(hg => (
            <tr {...hg.getHeaderGroupProps()}>
              {hg.headers.map(col => (
                <th
                  {...col.getHeaderProps(col.getSortByToggleProps())}
                  style={{ borderBottom: '1px solid #000', padding: '0.5rem', cursor: 'pointer' }}
                >
                  {col.render('Header')}
                  <span>{col.isSorted ? (col.isSortedDesc ? ' 🔽' : ' 🔼') : ''}</span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}