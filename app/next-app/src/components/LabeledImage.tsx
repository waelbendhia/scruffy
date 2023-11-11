import Link from "next/link";
import * as React from "react";

type Props = {
  imageUrl: string;
  className?: string;
  url?: string;
  children: React.ReactNode;
  whiteText?: boolean;
  imageClassName?: string;
};

const Content = ({ imageUrl, children, whiteText, imageClassName }: Props) => (
  <>
    <div
      className={
        `ml-2 bg-dark-gray h-full bg-center bg-no-repeat bg-cover ` +
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
        `flex flex-row justify-start items-center  h-full ` +
        `whitespace-nowrap text-ellipsis overflow-hidden text-xl bottom-0`
      }
    >
      <div
        className={`h-4/5 w-px min-w-px ml-3 mr-4 ${
          whiteText ? "bg-white" : "bg-black"
        } group-hover:bg-red`}
      />
      {children}
    </div>
  </>
);

const LabeledImage = ({ url, className: classNameProp, ...props }: Props) => {
  const className = `${
    classNameProp ?? ""
  } grid grid-cols-labeled items-center relative w-full group ${
    !url ? "pointer-events-none" : "pointer-events-auto"
  } ${props.whiteText ? "text-white" : "text-black"}`;

  return !!url ? (
    <Link className={className} href={`/artists${url.split(".")[0]}`}>
      <Content {...props} />
    </Link>
  ) : (
    <span className={className}>
      <Content {...props} />
    </span>
  );
};

export default LabeledImage;
