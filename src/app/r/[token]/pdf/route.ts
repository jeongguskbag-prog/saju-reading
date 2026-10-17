import { fileResponse } from "@/lib/report-file-route";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return fileResponse(request, (await params).token, "pdf");
}
