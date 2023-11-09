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
        `sticky top-0 flex items-center flex-row h-header bg-gradient-to-b ` +
        `from-white to-transparent text-black px-half-header z-10`
      }
    >
      <Link
        className={
          `left-1/2 absolute h-header-height font-display font-bold text-header-title ` +
          `-translate-x-1/2 ${
            pathname === "/" || open
              ? "pointer-events-none opacity-0"
              : "pointer-events-auto opacity-100"
          }`
        }
        href="/"
      >
        Scaruffi2.0
      </Link>
      <a onClick={() => toggleSearch()}>
        <i className="text-header hover:text-red material-icons cursor-pointer">
          {open ? "close" : "search"}
        </i>
      </a>
      <div className="flex-1" />
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
      <SearchBar open={open} toggleSearch={toggleSearch} />
    </div>
  );
};

export default Header;
