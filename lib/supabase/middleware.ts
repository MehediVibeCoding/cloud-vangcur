import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// 🚀 পারফরম্যান্স: লগইন-কুকি (`sb-…`) না থাকলে ভিজিটর নিশ্চিতভাবেই গেস্ট — তখন
// `supabase.auth.getUser()` (Supabase Auth-এ নেটওয়ার্ক কল, সিঙ্গাপুর পর্যন্ত) চালানোর কোনো
// মানে নেই। এতে প্রতিটা গেস্ট পেজ-রিকোয়েস্ট থেকে একটা অপ্রয়োজনীয় রাউন্ড-ট্রিপ বাদ যায়।
// লগইন করা ইউজারের আচরণ অপরিবর্তিত (সেশন আগের মতোই রিফ্রেশ হয়)।
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabaseAuthCookie(request)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
