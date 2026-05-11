const SkeletonCard = () => {
  return (
    <div className="flex flex-col card-surface p-4 rounded-[2rem] animate-pulse">
      
      {/* Image Skeleton */}
      <div className="w-full aspect-[4/3] bg-zinc-200 rounded-[1.5rem] mb-5"></div>

      {/* Title Skeleton */}
      <div className="px-2 space-y-3">
        <div className="h-4 bg-zinc-200 rounded-full w-full"></div>
        <div className="h-4 bg-zinc-200 rounded-full w-3/4"></div>

        {/* Price Skeleton */}
        <div className="flex items-center gap-3 pt-1">
          <div className="h-6 bg-zinc-200 rounded-full w-20"></div>
          <div className="h-4 bg-zinc-200 rounded-full w-14"></div>
          <div className="h-5 bg-zinc-100 rounded-full w-16"></div>
        </div>
      </div>

    </div>
  );
};

export default SkeletonCard;