import Link from "next/link";
import * as React from "react";

type Props = {
  imageUrl: string;
  className?: string;
  url?: string;
  children: React.ReactNode;
  whiteText?: boolean;
  imageClassName?: string;
  layout?: "horizontal" | "vertical";
};

const Content = ({
  imageUrl,
  children,
  whiteText,
  imageClassName,
  layout = "horizontal",
}: Props) => (
  <>
    <div
      className={
        `bg-dark-gray h-full bg-center bg-no-repeat bg-cover ` +
        `overflow-hidden after:content-[''] after:mix-blend-color after:absolute ` +
        `after:opacity-0 after:w-full after:h-full after:bg-red relative ` +
        `after:transition-opacity group-hover:after:opacity-100 after:z-20 ${
          imageClassName ?? ""
        }`
      }
      style={{
        backgroundImage: `url('${imageUrl ?? "album-default.svg"}')`,
      }}
    />
    <div
      className={
        `flex justify-start items-center  h-full whitespace-nowrap ` +
        `text-ellipsis overflow-hidden text-xl bottom-0 ${
          layout === "horizontal" ? "flex-row" : "flex-col"
        }`
      }
    >
      <div
        className={`${
          layout === "horizontal"
            ? `h-4/5 w-px min-w-px ml-3 mr-4`
            : `w-4/5 h-px min-h-px mt-3 mb-4`
        } ${whiteText ? "bg-white" : "bg-black"} group-hover:bg-red`}
      />
      {children}
    </div>
  </>
);

const LabeledImage = ({
  url,
  className: classNameProp,
  layout = "horizontal",
  ...props
}: Props) => {
  const className = `grid items-center relative w-full group ${
    layout === "horizontal" ? "grid-cols-labeled" : "grid-rows-labeled h-64"
  } ${!url ? "pointer-events-none" : "pointer-events-auto"} ${
    props.whiteText ? "text-white" : "text-black"
  } ${classNameProp ?? ""}`;

  return !!url ? (
    <Link className={className} href={`/artists${url.split(".")[0]}`}>
      <Content layout={layout} {...props} />
    </Link>
  ) : (
    <span className={className}>
      <Content layout={layout} {...props} />
    </span>
  );
};

export default LabeledImage;
