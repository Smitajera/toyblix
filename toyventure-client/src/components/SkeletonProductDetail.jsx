const SkeletonProductDetail = () => {
  return (
    <main className="pt-28 pb-24 min-h-screen bg-surface bg-hero-glow relative">
      <div className="max-w-[1200px] mx-auto px-6 relative z-10 animate-pulse">

        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-3 w-12 bg-zinc-200 rounded-full"></div>
          <div className="h-3 w-2 bg-zinc-200 rounded-full"></div>
          <div className="h-3 w-12 bg-zinc-200 rounded-full"></div>
          <div className="h-3 w-2 bg-zinc-200 rounded-full"></div>
          <div className="h-3 w-40 bg-zinc-200 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">

          {/* LEFT: Image Skeleton */}
          <div className="w-full aspect-square bg-zinc-200 rounded-[3rem]"></div>

          {/* RIGHT: Details Skeleton */}
          <div className="flex flex-col justify-center space-y-5">

            {/* Stars */}
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-4 h-4 bg-zinc-200 rounded-full"></div>
              ))}
            </div>

            {/* Title */}
            <div className="space-y-3">
              <div className="h-8 bg-zinc-200 rounded-full w-full"></div>
              <div className="h-8 bg-zinc-200 rounded-full w-4/5"></div>
              <div className="h-8 bg-zinc-200 rounded-full w-3/5"></div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4 py-6 border-y border-white">
              <div className="h-10 w-32 bg-zinc-200 rounded-full"></div>
              <div className="h-7 w-24 bg-zinc-200 rounded-full"></div>
              <div className="h-8 w-20 bg-zinc-100 rounded-full"></div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 bg-zinc-200 rounded-full w-full"></div>
              <div className="h-4 bg-zinc-200 rounded-full w-full"></div>
              <div className="h-4 bg-zinc-200 rounded-full w-3/4"></div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-2">
              <div className="flex-1 h-16 bg-zinc-200 rounded-[2rem]"></div>
              <div className="w-20 h-16 bg-zinc-200 rounded-[2rem]"></div>
            </div>

            {/* Trust Badges */}
            <div className="flex gap-3 flex-wrap">
              <div className="h-8 w-24 bg-zinc-100 rounded-full"></div>
              <div className="h-8 w-28 bg-zinc-100 rounded-full"></div>
              <div className="h-8 w-24 bg-zinc-100 rounded-full"></div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
};

export default SkeletonProductDetail;