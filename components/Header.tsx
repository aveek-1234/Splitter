"use client";
import { useStoreUser } from '@/hooks/use-store-user';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link';
import Image from 'next/image';
import splitterLogo from '../assets/images/splitter.png';
import React from 'react'
import {BarLoader} from "react-spinners"
import { usePathname } from 'next/navigation';
import { Authenticated, Unauthenticated } from 'convex/react';
import { Button } from './ui/button';
import { LayoutDashboard } from 'lucide-react';

function Header() {
  const { isLoading, isAuthenticated } = useStoreUser();
  const path= usePathname();
  return (
    <header className='fixed top-0 w-full border-b bg-white/10 backdrop-blur z-10 supports-backdrop-filter:bg-white/20'>
      <nav className='container mx-auto px-4 h-16 flex items-center justify-between relative'>
        <Link href="/" className='flex items-center gap-2'>
            <Image
              src={splitterLogo}
              alt="Splitter Logo"
              width={200}
              height={60}
              className='h-11 w-auto object-contain'
            />
        </Link>
        {path === '/' && (
          <div className='hidden md:flex items-center gap-5'>
            <Link 
              href="#features"
              className='text-sm font-medium hover:to-blue-600 transition'
            >
              Features
            </Link>
            <Link 
              href="#how-it-works"
              className='text-sm font-medium hover:to-blue-600 transition'
              >
              How It Works
            </Link>
          </div>
        )}
        <div className='flex items-center gap-2'>
          <Authenticated>
            <Link href="/dashboard">
              <Button 
                variant={"outline"}
                className="hidden md:inline-flex items-center gap-2 hover:text-blue-600"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Button>
              <Button 
                variant={"outline"}
                className="md:hidden w-13 h-10 p-0"
              >
                <LayoutDashboard className="h-2 w-5" />
              </Button>
            </Link>
            <UserButton />
          </Authenticated>
          <Unauthenticated>           
            <SignInButton>
              <Button variant={"ghost"}>Sign In </Button>
            </SignInButton>
            
            <SignUpButton>
              <Button className='bg-red-600 hover:bg-red-700 transition border-none' variant={"ghost"}>Sign Up</Button>
            </SignUpButton>
          </Unauthenticated>
        </div>
        {isLoading && (
          <div className='absolute inset-x-0 bottom-0'>
            <BarLoader width={"100%"} color='green'/>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header
