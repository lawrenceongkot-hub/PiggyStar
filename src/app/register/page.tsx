"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { LANDING_ROUTE } from "@/lib/auth/config";
import { GuardLoader } from "@/components/auth/route-guard";

/**
* Auth now lives in a global modal. Visiting /register opens it over the
* landing page so old links keep working.
*/
export default function RegisterPage() {
const openAuth = useAuthStore((state) => state.openAuth);
const router = useRouter();

useEffect(() => {
openAuth("register");
router.replace(LANDING_ROUTE);
}, [openAuth, router]);

return <GuardLoader />;
}
