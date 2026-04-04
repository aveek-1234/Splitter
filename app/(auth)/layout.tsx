import React from 'react'
import layout from '../layout'

import { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

const Authlayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className='flex justify-center items-center min-h-screen'>
      <div className='w-full max-w-sm border border-border rounded-lg bg-card p-6 sm:p-8 shadow-sm'>
        {children}
      </div>
    </div>
  )
}

export default Authlayout
