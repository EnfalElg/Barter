/** Auth routes: no bottom padding for mobile nav (nav hidden on login). */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-1 flex-col">{children}</div>;
}
