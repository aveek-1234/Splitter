import React from 'react'
import layout from '../layout'

import { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

const Authlayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className='flex justify-center pt-40'>
      {children}
    </div>
  )
}

export default Authlayout
