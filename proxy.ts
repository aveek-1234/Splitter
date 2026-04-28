import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/contacts(.*)',
  '/groups(.*)',
  '/person(.*)',
  '/settlements(.*)'
]);

const allowedRoutes = createRouteMatcher([
  '/api/inngest(.*)',
  '/api/auth(.*)',
  '/api/webhooks(.*)',
  '/api/trpc(.*)',
]);

export default clerkMiddleware(async(auth,req)=>{
  console.log("MIDDLEWARE HIT:", req.nextUrl.pathname);
  if (allowedRoutes(req)) {
    return NextResponse.next();
  }
  const {userId} = await auth();
  if(!userId && isProtectedRoute(req)) {
     const {redirectToSignIn} = await auth();
     return redirectToSignIn();
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip static + Next internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'
  ],
};