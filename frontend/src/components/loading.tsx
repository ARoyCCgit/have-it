import React from 'react'
import HaveItLogo from './HaveItLogo';

const Loading = () => {
  return (
    <div className='flex flex-col gap-4 inset-0 items-center justify-center bg-[#0b141a] min-h-screen'>
      <HaveItLogo size={64} glow={true} />
      <div className='h-8 w-8 border-3 border-[#03cafc] border-t-transparent rounded-full animate-spin shadow-lg shadow-[#03cafc]/30' />
      <span className='text-xs font-semibold uppercase tracking-widest text-[#03cafc] animate-pulse'>
        Loading Have-it...
      </span>
    </div>
  )
}

export default Loading
