"use client"
import { Authenticated } from 'convex/react'
import React, { ReactNode } from 'react'

function layout({ children }: { children: ReactNode }) {
  return (
    <Authenticated>
        <div className='container mx-auto mt-24 mb-20'>
            {children}
        </div>
    </Authenticated>
  )
}

export default layout
