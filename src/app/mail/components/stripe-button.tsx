'use client'
import { Button } from '@/components/ui/button'
import { createBillingPortalSession, createCheckoutSession, getSubscriptionStatus } from '@/lib/stripe-actions'
import React from 'react'

const StripeButton = () => {
    const [isSubscribed, setIsSubscribed] = React.useState(false)
    React.useEffect(() => {
        (async () => {
            const isSubscribed = await getSubscriptionStatus()
            setIsSubscribed(isSubscribed)
        })()
    }, [])

    const handleClick = async () => {
        if (!isSubscribed) {
            await createCheckoutSession()
        } else {
            await createBillingPortalSession()
        }
    }
    return (
        <Button variant={'outline'} size='lg' onClick={handleClick}>{isSubscribed ? 'Manage Subscription' : 'Upgrade Plan'}</Button>
    )
}

export default StripeButton