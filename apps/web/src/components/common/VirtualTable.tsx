/**
 * VirtualTable — renders only visible rows, not all rows.
 * Dramatically improves performance when table has 500+ rows.
 *
 * SETUP (run once):
 *   pnpm add --filter @soyte/web @tanstack/react-virtual
 *
 * Then uncomment the implementation below and remove the fallback.
 */

import { cn } from '@/lib/utils'

// ─── Virtualized implementation (uncomment after installing @tanstack/react-virtual) ───
//
// import { useVirtualizer } from '@tanstack/react-virtual'
//
// interface VirtualTableProps<T> {
//   rows: T[]
//   estimateRowHeight?: number
//   renderRow: (row: T, index: number) => React.ReactNode
//   renderHeader: () => React.ReactNode
//   className?: string
// }
//
// export function VirtualTable<T>({ rows, estimateRowHeight = 48, renderRow, renderHeader, className }: VirtualTableProps<T>) {
//   const parentRef = useRef<HTMLDivElement>(null)
//   const virtualizer = useVirtualizer({
//     count: rows.length,
//     getScrollElement: () => parentRef.current,
//     estimateSize: () => estimateRowHeight,
//     overscan: 10,
//   })
//
//   return (
//     <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white', className)}>
//       <table className="min-w-full">
//         <thead className="bg-gray-50 sticky top-0 z-10">{renderHeader()}</thead>
//       </table>
//       <div ref={parentRef} className="max-h-[600px] overflow-y-auto">
//         <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
//           <table className="min-w-full">
//             <tbody>
//               {virtualizer.getVirtualItems().map((virtualRow) => (
//                 <tr
//                   key={virtualRow.key}
//                   style={{ position: 'absolute', top: 0, transform: `translateY(${virtualRow.start}px)`, width: '100%' }}
//                 >
//                   {renderRow(rows[virtualRow.index], virtualRow.index)}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   )
// }

// ─── Fallback (standard table, no virtualization) ─────────────────────────────

interface VirtualTableProps<T> {
  rows: T[]
  estimateRowHeight?: number
  renderRow: (row: T, index: number) => React.ReactNode
  renderHeader: () => React.ReactNode
  className?: string
}

export function VirtualTable<T>({
  rows,
  renderRow,
  renderHeader,
  className,
}: VirtualTableProps<T>) {
  // Fallback: standard rendering
  // Replace with virtualized version above after: pnpm add @tanstack/react-virtual
  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">{renderHeader()}</thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => renderRow(row, i))}
        </tbody>
      </table>
    </div>
  )
}
