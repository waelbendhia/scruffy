"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import HeaderLink from "./HeaderLink";

const Header = ({ toggleSearch = () => {} }) => {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <div
      className={
        "sticky top-0 flex items-center flex-row h-header bg-black text-white px-half-header z-10"
      }
    >
      <Link
        className={
          "left-1/2 absolute h-header-height font-display font-bold text-5xl -translate-x-1/2 " +
          "hover:text-red " +
          (pathname === "/" || open ? "opacity-0" : "opacity-1") +
          " " +
          (pathname === "/" || open
            ? "pointer-events-none"
            : "pointer-events-auto")
        }
        href="/"
      >
        Scaruffi2.0
      </Link>
      <a onClick={toggleSearch}>
        <i className="text-white text-3xl hover:text-red material-icons cursor-pointer">
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
              (open ? "opacity-0" : "opacity-1") +
              " " +
              (open ? "pointer-events-none" : "pointer-events-auto")
            }
            key={x.text}
          >
            <HeaderLink {...x} location={pathname?.substring(1)} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Header;
