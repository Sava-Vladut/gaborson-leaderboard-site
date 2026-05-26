export default function LoadingState() {
  return (
    <div className="px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Podium skeleton */}
        <div className="flex items-end justify-center gap-4">
          <div className="skeleton rounded-xl w-[170px] h-[200px]" />
          <div className="skeleton rounded-xl w-[170px] h-[240px]" />
          <div className="skeleton rounded-xl w-[170px] h-[185px]" />
        </div>

        {/* Search skeleton */}
        <div className="skeleton rounded-xl h-12" />

        {/* Table skeleton */}
        <div className="card p-5 space-y-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="skeleton rounded-lg h-12"
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
