import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * বর্তমানে চালু ডেপ্লয়মেন্টের build id (StaleTabReload এটা ব্রাউজারের বেক-করা id-র সাথে মেলায়)।
 * কোনো গোপন তথ্য নেই — শুধু কমিট SHA।
 */
export async function GET() {
  return NextResponse.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID || '' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
