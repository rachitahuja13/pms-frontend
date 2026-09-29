export default function Skeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c}>
              <div className="skeleton-bar" style={{ width: `${55 + ((r * 13 + c * 27) % 35)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
