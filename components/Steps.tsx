import React from 'react'
import { Badge } from './ui/badge';
import { STEPS } from '@/lib/constants/steps';
import { Card } from './ui/card';

function Steps() {
  return (
    <div>
       <div className='container ml-auto mr-auto text-center'>
        <Badge variant={'outline'} className='bg-blue-500 text-white block ml-auto mr-auto'>
            Steps
        </Badge>
        <h2 className="mx-auto max-w-4xl text-4xl font-bold md:text-7xl text-blue-700">
            Simple steps to split expenses
        </h2>
        <p className='mx-auto max-w-[300] text-gray-500 md:text-xl/relaxed'>
            Follow simple steps to split expenses
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6 p-10">
            {STEPS.map((step, index) => {
                return (
                    <Card key={step.title ?? index}>
                        <div className="items-start gap-4 p-4">
                            <div className='flex justify-center max-w-full'>
                                <div className={`bg-blue-500 rounded-full p-2 block w-10`}>
                                    {step.label}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{step.title}</h3>
                                <p className="text-sm text-gray-500">{step.description}</p>
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    </div>
    </div>
  )
}

export default Steps
