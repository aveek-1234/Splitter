import Link from 'next/link'
import Image from 'next/image'
import { Button } from './ui/button'
import React from 'react'
import { ArrowRight } from 'lucide-react'
import  HeroImage from '../assets/images/hero.jpg'

function HeroComponent() {
  return (
    <div className='container mx-auto text-center px-4'>
      <div className='py-6'>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold md:text-6xl text-blue-700">
          SplitterHub
        </h1>
      </div>
      
      <div className='py-4'>
        <p className='mx-auto max-w-2xl text-gray-500 md:text-xl'>
          Easily split expenses with friends, family, or colleagues in just seconds—quick, fast, and effortless, turning shared spending into a seamless experience.
        </p>
      </div>
      
      <div className='py-8'>
        <Image 
          src={HeroImage} 
          className='rounded-lg mx-auto w-full max-w-4xl'
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
