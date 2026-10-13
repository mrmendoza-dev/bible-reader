import type { Select } from "@base-ui/react/select";
import type { Slider } from "@base-ui/react/slider";

/**
 * Base UI's Select `onValueChange` is `(value, eventDetails) => void` and can hand back `null`
 * (the selection was cleared). Most app selects are non-clearable enums driven by a plain
 * `useState` setter, so the mismatch is always the same shape — adapt the setter once instead of
 * repeating the null guard at every call site.
 */
export function selectValueHandler<T extends string>(
  setValue: (value: T) => void,
): (value: T | null, eventDetails: Select.Root.ChangeEventDetails) => void {
  return (value) => {
    if (value !== null) setValue(value);
  };
}

/**
 * Base UI's Slider `onValueChange` is `(value, eventDetails) => void` with `value` typed as
 * `number | readonly number[]`; every slider in this repo is a range bound to `number[]` state,
 * so this narrows the union and drops the event details.
 */
export function sliderValueHandler(
  setValue: (value: number[]) => void,
): (
  value: number | readonly number[],
  eventDetails: Slider.Root.ChangeEventDetails,
) => void {
  return (value) => {
    setValue(Array.isArray(value) ? [...value] : [value]);
  };
}
