import Link from 'next/link'
import Image from 'next/image'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import React from 'react'
import { ArrowRight } from 'lucide-react'
import  HeroImage from '../assets/images/hero.jpg'

function HeroComponent() {
  return (
    <div className='container ml-auto mr-auto text-center'>
       <Badge variant={'outline'} className='bg-blue-500 text-white block ml-auto mr-auto'>
            Split your expenses
        </Badge>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold md:text-7xl text-blue-700">Split expenses with anyone</h1>
        <p className='mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed'>
            Easily split expenses with friends, family, or colleagues in just seconds—quick, fast, and effortless, turning shared spending into a seamless experience.
        </p>
        <div className='flex justify-center'>
            <Button
                asChild
                size={"lg"}
                className='bg-blue-500 hover:bg-blue-900'
            >
                <Link href="/dashboard">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
             <Button
                asChild
                size={"lg"}
                className='bg-white border-blue-800 text-blue-800 hover:bg-blue-900 hover:text-white border-width-2'
            >
                <Link href="#howitworks">
                    How It Works
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
        <div className='flex justify-center m-1.5'>
            <Image 
            src={HeroImage} 
            className='rounded-lg max-auto'
            alt="Hero" 
            width={1280} 
            height={720} 
            priority
            />
        </div>
    </div>
  )
}

export default HeroComponent
