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
    <div className={"relative h-header w-32 mr-4"}>
      <Link
        className={
          "block w-full h-header text-3xl text-center font-light text-white"
        }
        href={link}
      >
        {text}
      </Link>
      <span
        className={
          "absolute l-1/2 bottom-0 w-0 h-0.5 -translate-x-1/2 bg-red " +
          [link, ...options.map((o) => o.link)].some((l) => l === pathname)
            ? "w-full"
            : ""
        }
      />
      <div
        className={
          "absolute h-0 t-header w-full bg-super-dark-grey z-10 overflow-hidden"
        }
      >
        {options.map((o) => (
          <Link
            key={o.link}
            className={
              "block w-full h-header text-3xl text-center font-light text-white " +
              "text-2xl h-header"
            }
            href={o.link}
          >
            {o.text}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default View;
