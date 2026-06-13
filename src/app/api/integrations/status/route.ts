import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/integrations/credentials";
import { isIntegrationsSetupAllowed } from "@/lib/integrations/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    setupAllowed: isIntegrationsSetupAllowed(),
    ...getIntegrationStatus(),
  });
}
