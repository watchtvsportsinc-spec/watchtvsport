// Route handler deliberately avoids the public page layout and analytics.
import { handleReviewRequest } from '../../../lib/private-review/server.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return handleReviewRequest(request); }
export async function POST(request: Request) { return handleReviewRequest(request); }
