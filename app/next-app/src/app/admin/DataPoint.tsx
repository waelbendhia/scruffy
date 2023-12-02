const DataPoint = ({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) => (
  <div className={`${className ?? ""} contents text-xl`}>
    <span className="text-right text-dark-gray">{label}</span>
    <span>{value ?? "N/A"}</span>
  </div>
);

export default DataPoint;
