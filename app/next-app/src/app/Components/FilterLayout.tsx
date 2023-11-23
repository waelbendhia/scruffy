import Link from "next/link";

type OptionProps = React.PropsWithChildren<{
  active: boolean;
  href: React.ComponentProps<typeof Link>["href"];
}>;

export const FilterOption = ({ active, href, children }: OptionProps) => (
  <Link
    prefetch={false}
    className={`
      text-lg border-t-2 transition-all ${
        active
          ? "text-red pointer-events-none border-t-red"
          : "border-t-transparent"
      }
    `}
    href={href}
  >
    {children}
  </Link>
);

type Props = React.PropsWithChildren<{
  className?: string;
  label?: React.ReactNode;
}>;

const FilterLayout = ({ className, label, children }: Props) => (
  <div className={`${className} flex items-center gap-2 mb-2`}>
    <div>{label}: </div>
    {children}
  </div>
);

export default FilterLayout;
