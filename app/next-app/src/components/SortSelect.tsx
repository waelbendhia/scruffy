import FilterLayout, { FilterOption } from "@/app/Components/FilterLayout";

type Props<T extends string | number> = {
  label?: string;
  labels: Record<T, string>;
  searchParams: Record<string, string>;
  coerceString: (x: string | undefined) => T;
  className?: string;
  queryKey?: string;
};

const SortSelect = <T extends string | number>({
  label = "Sort By",
  className,
  queryKey = "sort",
  labels,
  searchParams,
  coerceString,
}: Props<T>) => {
  const current = coerceString(searchParams[queryKey]);

  return (
    <FilterLayout className={className} label={label}>
      {(Object.keys(labels) as T[]).map((v) => (
        <FilterOption
          key={v}
          active={`${v}` === `${current}`}
          href={{ query: { ...searchParams, page: 0, [queryKey]: v } }}
        >
          {labels[v]}
        </FilterOption>
      ))}
    </FilterLayout>
  );
};

export default SortSelect;
