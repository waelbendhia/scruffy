"use client";
import { usePagination } from "@/hooks";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

type Props = {
  total: number;
  className?: string;
  dataLength?: number;
};

const Clicker = ({
  value,
  page,
  total,
  dataLength,
}: {
  page: number;
  value: number;
  total: number;
  dataLength?: number;
}) => {
  const maxPage = Math.ceil(total / 12);
  const params = useSearchParams();
  const pathname = usePathname();
  const targetPage = Math.min(Math.max(page + value, 0), maxPage - 1);
  const newParams = React.useMemo(() => {
    const p = new URLSearchParams();
    params?.forEach((val, key) => {
      p.set(key, val);
    });
    p.set("page", `${targetPage}`);
    p.set("prevTotal", `${total}`);
    if (dataLength !== undefined) {
      p.set("prevDataLength", `${dataLength}`);
    }
    return p;
  }, [params, targetPage, total, dataLength]);

  const isDisabled =
    (value < 0 && page === 0) || (value > 0 && page + 1 === maxPage);

  return isDisabled ? (
    <span
      className={`mx-2.5 text-3xl`}
    >
      {value < 0 ? `${Math.abs(value)}<` : `>${value}`}
    </span>
  ) : (
    <Link
      className={`mx-2.5 text-3xl`}
      href={{ pathname, query: newParams.toString() }}
      scroll={false}
    >
      {value < 0 ? `${Math.abs(value)}<` : `>${value}`}
    </Link>
  );
};

const Paginator = ({ className = "", total, dataLength }: Props) => {
  const [page] = usePagination();
  const maxPage = Math.ceil(total / 12);

  return (
    <div
      className={`
        ${className} flex items-center justify-center select-none
        border-t-black-transparent border-t max-w-screen-2xl mx-auto mt-3 pt-2
      `}
    >
      <Clicker dataLength={dataLength} total={total} page={page} value={-10} />
      <Clicker dataLength={dataLength} total={total} page={page} value={-1} />
      <h1 className={`w-52 text-center`}>
        {page + 1}/{maxPage}
      </h1>
      <Clicker dataLength={dataLength} total={total} page={page} value={1} />
      <Clicker dataLength={dataLength} total={total} page={page} value={10} />
    </div>
  );
};

export default Paginator;
