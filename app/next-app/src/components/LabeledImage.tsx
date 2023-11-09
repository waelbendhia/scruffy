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
        `ml-2 bg-dark-gray w-almost-4/10 h-almost-full bg-center bg-no-repeat bg-cover ` +
        `overflow-hidden after:content-[''] after:mix-blend-color after:absolute ` +
        `after:opacity-0 after:w-almost-4/10 ` +
        `after:h-almost-full after:bg-red after:transition-opacity`
      }
      style={{
        backgroundImage: `url('${imageUrl ?? "album-default.svg"}')`,
      }}
    />
    <div
      className={
        `flex flex-row justify-start items-center absolute top-0 left-4/10 w-6/10 h-full ` +
        `whitespace-nowrap text-ellipsis overflow-hidden text-2xl bottom-0`
      }
    >
      <div
        className={`h-7/10 w-px min-w-px ml-3 mr-4 ${
          whiteText ? "bg-white" : "bg-black"
        }`}
      />
      {children}
    </div>
    <span
      className={`absolute left-1/2 bottom-0 w-0 h-0.5 bg-red transition-all`}
    />
  </>
);

const LabeledImage = ({ url, ...props }: Props) => {
  const className = `flex flex-row items-center relative w-full ${
    !url ? "pointer-events-none" : "pointer-events-auto"
  } hover:[&>span]:left-0 hover:[&>span]:w-full hover:[&div]:after:opacity-1 ${
    props.whiteText ? "text-white" : "text-black"
  }`;

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
