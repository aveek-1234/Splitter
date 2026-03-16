import React from 'react'
import { Badge } from './ui/badge'
import { FEATURES } from '@/lib/constants/features'
import { Card } from './ui/card'

function Features() {
  return (
    <div className='container ml-auto mr-auto text-center'>
        <Badge variant={'outline'} className='bg-blue-500 text-white block ml-auto mr-auto'>
            Features
        </Badge>
        <h2 className="mx-auto max-w-4xl text-4xl font-bold md:text-7xl text-blue-700">
            Explore all the features
        </h2>
        <p className='mx-auto max-w-[300] text-gray-500 md:text-xl/relaxed'>
            Discover how our platform makes splitting expenses easy and efficient.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6 p-10">
            {FEATURES.map((feature, index) => {
                const FeatureIcon = feature.Icon;
                return (
                    <Card key={feature.title ?? index}>
                        <div className="flex items-start gap-4 p-4">
                            <div className={`${feature.bg} rounded-md p-2`}>
                                <FeatureIcon className={`h-6 w-6 ${feature.color}`} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{feature.title}</h3>
                                <p className="text-sm text-gray-500">{feature.description}</p>
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    </div>
  )
}

export default Features
