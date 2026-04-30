import React from 'react'

import { STEPS } from '@/lib/constants/steps';
import { Card } from './ui/card';

function Steps() {
  return (
    <div className='container mx-auto text-center px-4'>
      <div className='py-6'>
        <h2 className="mx-auto max-w-3xl text-4xl font-bold md:text-6xl text-blue-700">
          Simple steps to split expenses
        </h2>
      </div>
      
      <div className='py-4'>
        <p className='mx-auto max-w-xl text-gray-500 md:text-xl'>
          Follow simple steps to split expenses
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {STEPS.map((step, index) => {
          return (
            <Card key={step.title ?? index}>
              <div className="flex flex-col items-center gap-4 p-6">
                <div className={`bg-blue-500 rounded-full p-3 w-12 flex items-center justify-center`}>
                  <span className="text-white font-bold">{step.label}</span>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default Steps
