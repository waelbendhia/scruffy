"use client";
import { usePagination } from "@/hooks";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

type Props = {
  total: number;
  className?: string;
};

const Clicker = ({
  value,
  page,
  maxPage,
}: {
  page: number;
  value: number;
  maxPage: number;
}) => {
  const params = useSearchParams();
  const pathname = usePathname();
  const targetPage = Math.min(Math.max(page + value, 0), maxPage - 1);
  const newParams = React.useMemo(() => {
    const p = new URLSearchParams();
    params?.forEach((val, key) => {
      p.set(key, val);
    });
    p.set("page", `${targetPage}`);
    return p;
  }, [params, targetPage]);
  return (
    <Link
      className={`mx-2.5 text-3xl ${
        (value < 0 && page === 0) || (value > 0 && page + 1 === maxPage)
          ? "pointer-events-none"
          : ""
      }`}
      href={{ pathname, query: newParams.toString() }}
      scroll={false}
    >
      {value < 0 ? `${Math.abs(value)}<` : `>${value}`}
    </Link>
  );
};

const Paginator = ({ className = "", total }: Props) => {
  const [page] = usePagination();
  const maxPage = Math.ceil(total / 12);

  return (
    <div
      className={
        `${className} flex items-center justify-center select-none ` +
        `border-t-black-transparent border-t max-w-screen-xl mx-auto mt-3 pt-2`
      }
    >
      <Clicker maxPage={maxPage} page={page} value={-10} />
      <Clicker maxPage={maxPage} page={page} value={-1} />
      <h1 className={`w-52 text-center`}>
        {page + 1}/{maxPage}
      </h1>
      <Clicker maxPage={maxPage} page={page} value={1} />
      <Clicker maxPage={maxPage} page={page} value={10} />
    </div>
  );
};

export default Paginator;
