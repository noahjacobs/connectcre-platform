import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

import { BreadcrumbLink as BreadcrumbLinkType } from "@/lib/types/shared";

const BreadcrumbCustomItem = ({
  label,
  href,
  isCurrent,
}: BreadcrumbLinkType & { isCurrent?: boolean }) => {
  return (
    <>
      <BreadcrumbItem className="font-bold text-primary">
        {!isCurrent ? (
          <BreadcrumbLink className="hover:text-primary/70" asChild>
            <Link href={href}>{label}</Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage>{label}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {!isCurrent && <BreadcrumbSeparator className="text-primary" />}
    </>
  );
};

export default function Breadcrumbs({
  links,
}: {
  links: BreadcrumbLinkType[];
}) {

  // Generate BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": links.map((link, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": link.label,
      // Add item URL only if it's not the current page (last item)
      ...(index < links.length - 1 && { "item": `${process.env.NEXT_PUBLIC_SITE_URL}${link.href}` })
    }))
  };

  return (
    <>
      {/* Add Breadcrumb Schema Script */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}

      <Breadcrumb className="mb-3 lg:mb-6">
        <BreadcrumbList>
          {links.map((link, index) => (
            <BreadcrumbCustomItem
              key={link.label}
              {...link}
              isCurrent={index === links.length - 1}
            />
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
