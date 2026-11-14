import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Only a path on this site: "/x", never "//host" or a backslash trick. The
 * login page checks it again before redirecting.
 */
function safePath(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  return v;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const returnTo = safePath((await searchParams).returnTo);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
              {/* Arrived from a page that asked for an account (a talk open
                  to everyone, for example): once confirmed, signing in from
                  here brings the person back to it. */}
              {returnTo && (
                <div className="mt-5">
                  <p className="text-sm text-muted-foreground">
                    Once your email is confirmed, sign in to pick up where you
                    left off.
                  </p>
                  <Link
                    href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
                    className="btn-primary mt-3"
                    style={{ width: "100%", textAlign: "center", justifyContent: "center" }}
                  >
                    Sign in and continue
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
