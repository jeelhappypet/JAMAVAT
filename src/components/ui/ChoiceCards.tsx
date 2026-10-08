import { cn } from "./cn";

interface ChoiceCardsProps<T extends string> {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** A row of big radio cards — "Paid by: Cash / UPI / Card". */
export function ChoiceCards<T extends string>({ name, legend, options, value, onChange, className }: ChoiceCardsProps<T>) {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px]",
                on ? "border-2 border-brand bg-orange-50 font-extrabold text-brand-dark" : "border border-border font-bold"
              )}
            >
              <input type="radio" name={name} checked={on} onChange={() => onChange(option.value)} className="m-0 accent-[#c2410c]" />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
