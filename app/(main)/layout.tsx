"use client"
import { Authenticated } from 'convex/react'
import React, { ReactNode } from 'react'

function layout({ children }: { children: ReactNode }) {
  return (
    <Authenticated>
      <div className='w-full flex justify-center'>
        <div className='w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl border border-border rounded-lg bg-card p-4 sm:p-6 md:p-8 shadow-sm'>
          {children}
        </div>
      </div>
    </Authenticated>
  )
}

export default layout
