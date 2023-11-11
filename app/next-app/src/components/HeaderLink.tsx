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
  const linkBase = `block w-full text-lg text-center font-light`;
  const selected =
    link === pathname || options.map((o) => o.link).some((l) => l === pathname);

  return (
    <div className={`relative h-6 w-24 mr-4 group`}>
      <Link
        className={`h-full leading-6 group-hover:border-b-red border-b-2 ${linkBase} ${
          selected ? "border-b-red" : "border-b-transparent"
        }`}
        href={link}
      >
        {text}
      </Link>
      <div
        className={
          `h-16 overflow-hidden relative translate-y-2 opacity-0 ` +
          `invisible transition-all group-hover:translate-y-0 ` +
          `group-hover:opacity-100 group-hover:visible shadow-md`
        }
      >
        <div
          className={
            `absolute t-10 w-full bg-white-transparent z-10 overflow-hidden ` +
            `backdrop-blur-sm`
          }
        >
          {options.map((o) => (
            <Link
              key={o.link}
              className={`h-8 leading-8 ${linkBase}`}
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
