import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SetupForm } from "./setup-form";

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 px-4 py-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading setup…
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
