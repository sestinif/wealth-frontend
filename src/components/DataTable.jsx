import React, { useState, useMemo } from 'react';

export default function DataTable({ columns, data, defaultSort, actions }) {
  const [sortKey, setSortKey] = useState(defaultSort?.key || null);
  const [sortDir, setSortDir] = useState(defaultSort?.direction || 'desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      let diff;
      if (sortKey === 'date' || sortKey === 'created_at') {
        diff = new Date(aVal) - new Date(bVal);
      } else if (typeof aVal === 'number') {
        diff = aVal - bVal;
      } else {
        diff = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === 'desc' ? -diff : diff;
    });
  }, [data, sortKey, sortDir]);

  if (!data || data.length === 0) {
    return <div className="no-data">Nessun dato disponibile</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th
              key={col.key}
              className={[
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
                col.sortable ? 'sortable' : '',
                sortKey === col.key ? 'sorted' : '',
              ].filter(Boolean).join(' ')}
              onClick={col.sortable ? () => handleSort(col.key) : undefined}
            >
              {col.label}
              {col.sortable && sortKey === col.key && (
                <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
          ))}
          {actions && <th className="text-center">Azioni</th>}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row, idx) => (
          <tr key={row.id || idx}>
            {columns.map(col => (
              <td
                key={col.key}
                className={[
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
                  col.muted ? 'text-muted' : '',
                ].filter(Boolean).join(' ')}
              >
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
            {actions && <td className="text-center">{actions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
