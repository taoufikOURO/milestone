import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/nav/Sidebar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-4 sm:p-6 lg:p-8">
          <CardSkeleton className="h-32" />
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}

// Garde de toute la zone connectée : session valide, email validé (relus en
// base). Un utilisateur non validé est renvoyé vers /verifier-email.
async function Shell({ children }: { children: ReactNode }) {
  const user = await requireVerifiedUser();
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar userName={`${user.firstName} ${user.lastName}`} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <div className="mx-auto w-full max-w-page">{children}</div>
      </main>
    </div>
  );
}
