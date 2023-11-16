import Link from "next/link";

type Props<T extends string | number> = {
  label?: string;
  labels: Record<T, string>;
  searchParams: Record<string, string>;
  coerceString: (x: string | undefined) => T;
  className?: string;
  queryKey?: string;
};

const SortSelect = <T extends string | number>({
  label = "Sort By:",
  className,
  queryKey = "sort",
  labels,
  searchParams,
  coerceString,
}: Props<T>) => {
  const current = coerceString(searchParams[queryKey]);

  return (
    <div className={`${className} flex items-center gap-2 mb-2`}>
      <div>{label}</div>
      {(Object.keys(labels) as T[]).map((v) => (
        <Link
          key={v}
          className={`
            text-lg border-t-2 transition-all ${
              `${v}` === `${current}`
                ? "text-red pointer-events-none border-t-red"
                : "border-t-transparent"
            }
          `}
          href={{ query: { ...searchParams, [queryKey]: v } }}
        >
          {labels[v]}
        </Link>
      ))}
    </div>
  );
};

export default SortSelect;
