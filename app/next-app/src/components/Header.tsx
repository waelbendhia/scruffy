"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import HeaderLink from "./HeaderLink";
import SearchBar from "./SearchBar";

const Header = () => {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const toggleSearch = (open?: boolean) => {
    setOpen((o) => (open !== undefined ? open : !o));
  };

  return (
    <div
      className={
        `sticky top-0 flex items-end flex-row h-10 bg-gradient-to-b ` +
        `bg-white-transparent backdrop-blur-sm text-black px-5 z-20 shadow-md`
      }
    >
      <Link
        className={`text-xl h-8 leading-8 font-display font-bold ${
          pathname === "/" || open
            ? "pointer-events-none"
            : "pointer-events-auto"
        }`}
        href="/"
      >
        Scaruffi2.0
      </Link>
      <div className="flex-1 h-10" />
      <div className="overflow-visible flex flex-row">
        {[
          {
            text: "Music",
            link: "/artists",
            options: [
              { text: "Artists", link: "/artists" },
              { text: "Albums", link: "/albums" },
            ],
          },
          {
            text: "Film",
            link: "/films",
            options: [
              { text: "Directors", link: "/directors" },
              { text: "Films", link: "/films" },
            ],
          },
        ].map((x) => (
          <div
            className={
              open
                ? "pointer-events-none opacity-0"
                : "pointer-events-auto opacity-100"
            }
            key={x.text}
          >
            <HeaderLink {...x} />
          </div>
        ))}
      </div>
      <a
        className={`w-8 h-6 text-center leading-8`}
        onClick={() => toggleSearch()}
      >
        <i className="text-6 h-6 w-8 leading-6 text-lg hover:text-red material-icons cursor-pointer">
          {open ? "close" : "search"}
        </i>
      </a>
      <SearchBar open={open} toggleSearch={toggleSearch} />
    </div>
  );
};

export default Header;
