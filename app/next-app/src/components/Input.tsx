import * as React from "react";

type InputPropsBase = {
  className?: string;
  placeHolder?: string;
  whiteText?: boolean;
  icon?: string;
};

type TextInputProps = {
  type: "text";
  onChange: (_: string) => void;
  value: string;
};

type NumberInputProps = {
  type: "number";
  onChange: (_: number) => void;
  value: number;
  minValue: number;
  maxValue: number;
};

type Props = (TextInputProps | NumberInputProps) & InputPropsBase;

const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { className, icon, whiteText, placeHolder, ...props },
  ref,
) {
  return (
    <div className={`flex items-center ${className ?? ""}`}>
      {!!icon && <i className={`material-icons text-3xl mr-2`}>{icon}</i>}
      <div className={"flex-1 relative h-10 my-[5px]"}>
        <input
          ref={ref}
          className={`
            p-0 outline-none h-[38px] text-3xl w-full border-b-2 border-gray bg-transparent
            ${whiteText ? "text-white" : "text-black"}
          `}
          type={props.type}
          onChange={(e) =>
            props.type === "number"
              ? props.onChange(
                  Math.min(
                    Math.max(props.minValue, parseFloat(e.target.value) || 0),
                  ),
                )
              : props.onChange(e.target.value)
          }
          value={props.value}
          placeholder={placeHolder}
        />
        <span
          className={
            "absolute text-3xl bottom-0.5 left-0 block overflow-hidden h-0.5 whitespace-pre " +
            "max-w-full bg-red"
          }
        >
          {props.value}
        </span>
      </div>
    </div>
  );
});

export default Input;
