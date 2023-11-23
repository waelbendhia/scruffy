import FilterLayout, { FilterOption } from "@/app/Components/FilterLayout";

type Decade =
  | "Any"
  | "50s"
  | "60s"
  | "70s"
  | "80s"
  | "90s"
  | "00s"
  | "10s"
  | "20s";

const decades: Decade[] = [
  "Any",
  "50s",
  "60s",
  "70s",
  "80s",
  "90s",
  "00s",
  "10s",
  "20s",
];

type Props = {
  className?: string;
  current?: string;
  searchParams: Record<string, string>;
};

const decadeFromParams = (yearMin?: string, yearMax?: string): Decade => {
  switch (`${yearMin}-${yearMax}`) {
    case "1950-1959":
      return "50s";
    case "1960-1969":
      return "60s";
    case "1970-1979":
      return "70s";
    case "1980-1989":
      return "80s";
    case "1990-1999":
      return "90s";
    case "2000-2009":
      return "00s";
    case "2010-2019":
      return "10s";
    case "2020-2029":
      return "20s";
    default:
      return "Any";
  }
};

const decadeToParams = (decade: Decade): Record<string, string> => {
  switch (decade) {
    case "50s":
      return { yearMin: "1950", yearMax: "1959" };
    case "60s":
      return { yearMin: "1960", yearMax: "1969" };
    case "70s":
      return { yearMin: "1970", yearMax: "1979" };
    case "80s":
      return { yearMin: "1980", yearMax: "1989" };
    case "90s":
      return { yearMin: "1990", yearMax: "1999" };
    case "00s":
      return { yearMin: "2000", yearMax: "2009" };
    case "10s":
      return { yearMin: "2010", yearMax: "2019" };
    case "20s":
      return { yearMin: "2020", yearMax: "2029" };
    case "Any":
      return {};
  }
};

const DecadeFitler = ({
  className,
  searchParams: { yearMin, yearMax, ...params },
}: Props) => {
  const current = decadeFromParams(yearMin, yearMax);

  return (
    <FilterLayout className={className} label="Decade">
      {decades.map((v) => (
        <FilterOption
          key={v}
          active={v === current}
          href={{ query: { ...params, page: 0, ...decadeToParams(v) } }}
        >
          {v}
        </FilterOption>
      ))}
    </FilterLayout>
  );
};

export default DecadeFitler;
