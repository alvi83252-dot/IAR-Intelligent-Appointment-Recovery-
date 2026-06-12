import { NextResponse } from "next/server";
import { pasAdapter } from "@/services/pas-adapter";
import { PAS_LEDGER_NAME } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    ledger: PAS_LEDGER_NAME,
    snapshot: pasAdapter.getSnapshot(),
    writeLog: pasAdapter.getWriteLog(),
  });
}
