import { SignUp } from "@clerk/nextjs";

// Invited users land here from their invitation email. Clerk reads the
// invitation ticket from the link and pre-fills their email.
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
    </div>
  );
}
