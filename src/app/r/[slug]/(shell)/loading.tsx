import { Skeleton, SkeletonCards } from "@/components/ui/Skeleton";

/** Shown under the staff header the moment a tab is tapped, until the page's server render arrives. */
export default function ShellLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonCards count={4} minWidth={260} />
    </>
  );
}
