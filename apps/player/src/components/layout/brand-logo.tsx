import Link from "next/link";
import Image from "next/image";

export default function BrandLogo({ className = "" }: { className?: string }) {
return (
<Link href="/" className={`flex items-center shrink-0 ${className}`}>
<Image
src="/Main-logo.png"
alt="PiggyStar"
width={843}
height={321}
className="main-logo"
priority
quality={100}
/>
</Link>
);
}