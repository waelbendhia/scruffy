import Link from "next/link";

type Props<T extends string> = {
  labels: Record<T, string>;
  searchParams: Record<string, string>;
  coerceString: (x: string | undefined) => T;
  className?: string;
};

const SortSelect = <T extends string>({
  className,
  labels,
  searchParams,
  coerceString,
}: Props<T>) => {
  const current = coerceString(searchParams.sort);

  return (
    <div className={`${className} flex items-center gap-2 mb-2`}>
      <div>Sort by:</div>
      {(Object.keys(labels) as T[]).map((v) => (
        <Link
          key={v}
          className={`text-lg border-t-2 transition-all ${
            v === current
              ? "text-red pointer-events-none border-t-red"
              : "border-t-transparent"
          }`}
          href={{ query: { ...searchParams, sort: v } }}
        >
          {labels[v]}
        </Link>
      ))}
    </div>
  );
};

export default SortSelect;
