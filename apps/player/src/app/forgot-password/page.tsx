"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { LANDING_ROUTE } from "@/lib/auth/config";
import { GuardLoader } from "@/components/auth/route-guard";

/**
* Auth now lives in a global modal. Visiting /forgot-password opens it in the
* same auth card used by login/register.
*/
export default function ForgotPasswordPage() {
const openAuth = useAuthStore((state) => state.openAuth);
const router = useRouter();

useEffect(() => {
openAuth("forgot");
router.replace(LANDING_ROUTE);
}, [openAuth, router]);

return <GuardLoader />;
}
