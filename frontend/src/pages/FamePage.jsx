// src/pages/FamePage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  useTable,
  useSortBy,
  useGlobalFilter
} from 'react-table';
import axios from 'axios';

export default function FamePage() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    axios.get('/api/fame').then(res => {
      // parse the incoming ISO date string into a Date object
      const transformed = res.data.map(row => ({
        ...row,
        dateRaw: new Date(row.dateRaw),       // real Date for sorting
        date: row.date                        // your "DD.MM.YYYY" for display
      }));
      setData(transformed);
    });
  }, []);

  const columns = useMemo(() => [
    {
      Header: 'Date',
      accessor: 'dateRaw',           // sort on the Date object
      Cell: ({ row }) => row.original.date,
      sortType: 'datetime'
    },
    {
      Header: 'Name',
      accessor: 'name'
    },
    {
      Header: 'Time',
      accessor: 'movingTime'
    },
    {
      Header: 'Match %',
      accessor: 'matchPercentage',
      Cell: ({ value }) =>
        value != null ? `${value.toFixed(1)}%` : '–'
    },
    {
      Header: 'Medal',
      accessor: 'medal'
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
  } = useTable(
    { columns, data },
    useGlobalFilter,
    useSortBy
  );

  // wire up the global filter
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
            // pull the key out so it isn't spread into the <tr>
            const { key, ...trProps } = hg.getHeaderGroupProps();
            return (
              <tr key={key} {...trProps}>
                {hg.headers.map(col => {
                  // same for each <th>
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
                        userSelect: 'none'
                      }}
                    >
                      {col.render('Header')}
                      <span>
                        {col.isSorted
                          ? col.isSortedDesc
                            ? ' 🔽'
                            : ' 🔼'
                          : ''}
                      </span>
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
                      style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}
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