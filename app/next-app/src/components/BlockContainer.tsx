const BlockContainer = ({
  className,
  children,
  title,
}: React.PropsWithChildren<{
  className?: string;
  title?: React.ReactNode;
}>) => {
  return (
    <div
      className={`
        ${
          className ?? ""
        } bg-white-transparent backdrop-blur-sm drop-shadow-sm p-4
        rounded-sm
      `}
    >
      {title ? <h3 className="text-lg mb-3">{title}</h3> : null}
      {children}
    </div>
  );
};

export default BlockContainer;
