import Link from "next/link";
import Image from "next/image";
import * as React from "react";

type BaseProps = {
  className?: string;
  adminURL?: string;
  url?: string;
  children: React.ReactNode;
  whiteText?: boolean;
  imageClassName?: string;
  layout?: "horizontal" | "vertical";
};

type Props = BaseProps &
  (
    | {
        loading: true;
        imageUrl?: string;
      }
    | ({
        loading?: false;
        imageUrl: string;
      } & (
        | { placeholder: "empty" }
        | { placeholder: "blur"; blurDaraURL: string }
      ))
  );

const Content = (props: Props) => (
  <>
    <div
      className={`${
        props.imageClassName ?? ""
      } relative max-h-full overflow-hidden flex flex-shrink-0`}
    >
      {props.loading ? (
        <div
          className="
            relative w-full overflow-hidden flex bg-dark-gray rounded-md
            max-h-full
          "
        />
      ) : (
        <Image
          className="
            block bg-dark-gray max-h-full object-center object-cover
            overflow-hidden relative w-full
          "
          width={300}
          height={300}
          placeholder={props.placeholder}
          blurDataURL={
            props.placeholder === "blur" ? props.blurDaraURL : undefined
          }
          src={props.imageUrl}
          alt="cover"
        />
      )}
      <div
        className="
          mix-blend-color absolute content-[''] opacity-0 w-full h-full bg-red
          transition-opacity group-hover:opacity-100 z-20
        "
      />
    </div>
    <div
      className={`
        flex justify-start items-center  h-full whitespace-nowrap
        text-ellipsis overflow-hidden text-xl bottom-0 ${
          props.layout === "horizontal" ? "flex-row" : "flex-col text-center"
        }
      `}
    >
      <div
        className={`${
          props.layout === "horizontal"
            ? `h-4/5 w-px min-w-px ml-3 mr-4`
            : `w-4/5 h-px min-h-px mt-3 mb-2`
        } ${props.whiteText ? "bg-white" : "bg-black"} group-hover:bg-red`}
      />
      {props.children}
    </div>
  </>
);

const AdminLink = ({ href }: { href: string }) => (
  <Link
    className="
      absolute top-2 left-2 z-30 bg-white-transparent rounded-full font-display
      drop-shadow-sm backdrop-blur w-8 h-8 leading-8 text-center text-xl
      font-bold hover:drop-shadow-md
    "
    href={href}
  >
    !
  </Link>
);

const LabeledImage = ({
  url,
  className: classNameProp,
  layout = "horizontal",
  adminURL,
  ...props
}: Props) => {
  const className = `relative w-full group flex ${
    layout === "horizontal" ? "flex-row" : "flex-col h-64"
  } ${!url ? "pointer-events-none" : "pointer-events-auto"} ${
    props.whiteText ? "text-white" : "text-black"
  } ${props.loading ? "animate-pulse" : ""} h-full w-full`;

  return (
    <div className={`${classNameProp ?? ""} relative`}>
      {adminURL && <AdminLink href={adminURL} />}
      {!!url ? (
        <Link
          prefetch={false}
          className={className}
          href={`/artists${url.split(".")[0]}`}
        >
          <Content layout={layout} {...props} />
        </Link>
      ) : (
        <div className={className}>
          <Content layout={layout} {...props} />
        </div>
      )}
    </div>
  );
};

export default LabeledImage;
