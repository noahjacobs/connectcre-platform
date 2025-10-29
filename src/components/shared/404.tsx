import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Custom404() {
  return (
    <div className="relative z-20 min-h-[80vh] flex items-center justify-center">
      <div className="relative px-8 md:px-0 py-16 sm:py-20 md:py-25 mx-auto sm:max-w-150 md:max-w-162.5 lg:max-w-212.5 xl:max-w-280">
        <h1 className="font-bold text-[9.9vw] md:text-[4.5rem] sm:text-[3.4375rem] lg:text-[6rem] xl:text-[8rem] leading-[1.12]">
          Page not found
        </h1>
        <div className="mt-5 text-center">
          <Button size="lg" asChild>
            <Link href="/">Back to Home page</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
