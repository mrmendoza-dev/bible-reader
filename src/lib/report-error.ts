import { toast } from "sonner";
export function reportError(
  error: unknown,
  options: { code: string; userMessage: string; expected?: boolean },
) {
  console.error(options.code, error);
  toast.error(options.userMessage);
}
