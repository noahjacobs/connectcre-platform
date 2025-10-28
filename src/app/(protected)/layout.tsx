import { Header } from '@/components/layout/header';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
