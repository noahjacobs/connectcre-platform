import Link from "next/link";
import Logo from "@/components/logo";

const navItems = [
  {
    label: "Terms of Use",
    href: "/tou",
    target: false,
  },
  {
    label: "Privacy Policy",
    href: "/privacy-policy",
    target: false,
  },
];

export default function Footer() {
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  return (
    <footer>
      <div className="dark:bg-background pb-5 xl:pb-5 dark:text-gray-300">
        <Link
          className="block w-25 mx-auto font-sora group"
          href="/"
          aria-label="Home page"
        >
          <Logo />
        </Link>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-7 text-primary">
          {navItems.map((navItem) => (
            <Link
              key={navItem.label}
              href={navItem.href}
              target={navItem.target ? "_blank" : undefined}
              rel={navItem.target ? "noopener noreferrer" : undefined}
              className="transition-colors hover:text-foreground/80 text-foreground/60 text-sm"
            >
              {navItem.label}
            </Link>
          ))}
        </div>
        <div className="mt-5 flex flex-col lg:flex-row gap-6 justify-center text-center text-xs border-t pt-5">
          <p className="text-foreground/60">
            Copyright &copy; {getCurrentYear()} DevProjects, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
