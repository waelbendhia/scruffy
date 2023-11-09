import Link from "next/link";
import * as React from "react";

type Props = {
  imageUrl: string;
  url?: string;
  children: React.ReactNode;
  whiteText?: boolean;
};

const Content = ({ imageUrl, children, whiteText }: Props) => (
  <>
    <div
      className={
        `ml-2 bg-dark-gray h-almost-full bg-center bg-no-repeat bg-cover ` +
        `overflow-hidden after:content-[''] after:mix-blend-color after:absolute ` +
        `after:opacity-0 after:w-full after:h-almost-full after:bg-red ` +
        `after:transition-opacity group-hover:after:opacity-100`
      }
      style={{
        backgroundImage: `url('${imageUrl ?? "album-default.svg"}')`,
      }}
    />
    <div
      className={
        `flex flex-row justify-start items-center  h-full ` +
        `whitespace-nowrap text-ellipsis overflow-hidden text-2xl bottom-0`
      }
    >
      <div
        className={`h-7/10 w-px min-w-px ml-3 mr-4 ${
          whiteText ? "bg-white" : "bg-black"
        } group-hover:bg-red`}
      />
      {children}
    </div>
    <span
      className={
        `group-hover:left-0 group-hover:w-full absolute left-1/2 bottom-0 w-0 ` +
        `h-0.5 bg-red transition-all`
      }
    />
  </>
);

const LabeledImage = ({ url, ...props }: Props) => {
  const className = `grid grid-cols-labeled items-center relative w-full group ${
    !url ? "pointer-events-none" : "pointer-events-auto"
  } ${props.whiteText ? "text-white" : "text-black"}`;

  return !!url ? (
    <Link className={className} href={`/bands/${url.split(".")[0]}`}>
      <Content {...props} />
    </Link>
  ) : (
    <span className={className}>
      <Content {...props} />
    </span>
  );
};

export default LabeledImage;
