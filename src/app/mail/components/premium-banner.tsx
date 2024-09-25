'use client'
import { motion } from 'framer-motion'
import React from 'react'
import StripeButton from './stripe-button'
import { api } from '@/trpc/react'
import { FREE_CREDITS_PER_DAY } from '@/app/constants'
import { getSubscriptionStatus } from '@/lib/stripe-actions'

const PremiumBanner = () => {
    const [isSubscribed, setIsSubscribed] = React.useState(false)
    React.useEffect(() => {
        (async () => {
            const subscriptionStatus = await getSubscriptionStatus()
            setIsSubscribed(subscriptionStatus)
        })()
    }, [])

    const { data: chatbotInteraction } = api.mail.getChatbotInteraction.useQuery()
    const remainingCredits = chatbotInteraction?.remainingCredits || 0

    if (isSubscribed) return (
        <motion.div layout className="bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4">
            <img src='/bot.webp' className='md:absolute md:-bottom-6 md:-right-10 h-[180px] w-auto' />
            <div>
                <h1 className='text-white text-xl font-semibold'>Premium Plan</h1>
                <div className="h-2"></div>
                <p className='text-gray-400 text-sm md:max-w-[calc(100%-70px)]'>Ask as many questions as you want</p>
                <div className="h-4"></div>
                <StripeButton />
            </div>
        </motion.div>
    )

    return (
        <motion.div layout className="bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4">
            <img src='/bot.webp' className='md:absolute md:-bottom-6 md:-right-10 h-[180px] w-auto' />
            <div>
                <div className="flex items-center gap-2">
                    <h1 className='text-white text-xl font-semibold'>Basic Plan</h1>
                    <p className='text-gray-400 text-sm md:max-w-[calc(100%-0px)]'>{remainingCredits} / {FREE_CREDITS_PER_DAY} messages remaining</p>
                </div>
                <div className="h-4"></div>
                <p className='text-gray-400 text-sm md:max-w-[calc(100%-150px)]'>Upgrade to pro to ask as many questions as you want</p>
                <div className="h-4"></div>
                <StripeButton />
            </div>
        </motion.div>
    )
}

export default PremiumBanner