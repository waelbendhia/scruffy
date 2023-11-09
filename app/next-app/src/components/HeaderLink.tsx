import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderLink = {
  text: string;
  link: string;
};

type Props = HeaderLink & {
  options: HeaderLink[];
};

const View = ({ text, link, options }: Props) => {
  const pathname = usePathname();

  return (
    <div
      className={
        "relative h-header w-36 mr-4 [&>div>div]:hover:translate-y-0 [&>a]:hover:border-b-4"
      }
    >
      <Link
        className={
          "block w-full h-header text-3xl text-center font-light text-white " +
          "leading-header border-b-red " +
          ([link, ...options.map((o) => o.link)].some((l) => l === pathname)
            ? "border-b-red border-b-4"
            : "")
        }
        href={link}
      >
        {text}
      </Link>
      <div className={"h-2-header overflow-hidden relative"}>
        <div
          className={
            "absolute -translate-y-full t-header w-full bg-super-dark-gray z-10 overflow-hidden transition-all"
          }
        >
          {options.map((o) => (
            <Link
              key={o.link}
              className={
                "block w-full h-header text-3xl text-center font-light text-white " +
                "text-2xl h-header leading-header"
              }
              href={o.link}
            >
              {o.text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default View;
