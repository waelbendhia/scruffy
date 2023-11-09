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
    <div className={`relative h-header w-24 mr-4 group`}>
      <Link
        className={
          `block w-full h-header text-header text-center font-light ` +
          `leading-header border-b-red ${
            [link, ...options.map((o) => o.link)].some((l) => l === pathname)
              ? "border-b-red border-b-4"
              : ""
          } group-hover:border-b-4`
        }
        href={link}
      >
        {text}
      </Link>
      <div
        className={
          `h-2-header overflow-hidden relative translate-y-4 opacity-0 ` +
          `invisible transition-all group-hover:translate-y-0 ` +
          `group-hover:opacity-100 group-hover:visible `
        }
      >
        <div
          className={`absolute t-header w-full bg-white-transparent z-10 overflow-hidden backdrop-blur-sm `}
        >
          {options.map((o) => (
            <Link
              key={o.link}
              className={`block w-full h-header text-header text-center font-light  leading-header`}
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
