import { apiSuccess } from "@/lib/api/response";
import { readData } from "@/lib/server/datastore";

export async function GET() {
  const data = await readData();
  return apiSuccess({ proposals: data.governanceProposals });
}
