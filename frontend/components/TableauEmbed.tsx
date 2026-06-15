// Tableau Public embed. Pass a published-viz URL to render the iframe;
// without one it shows a labeled placeholder (workbooks get published in Phase 5).
export default function TableauEmbed({
  title,
  src,
  height = 480,
}: {
  title: string;
  src?: string;
  height?: number;
}) {
  if (!src) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface text-center"
        style={{ height }}
      >
        <span className="text-sm font-medium text-muted">{title}</span>
        <span className="text-xs text-muted">Tableau Public embed — publish workbook, then set its URL</span>
      </div>
    );
  }
  return (
    <iframe
      title={title}
      src={src}
      className="w-full rounded-lg border border-line"
      style={{ height }}
    />
  );
}
