import { SignUp } from '@clerk/nextjs';
import { Sign } from 'crypto';
import React from 'react'

function SignUppage() {
  return (
    <div>
      <SignUp />
    </div>
  )
}

export default SignUppage;
