import React from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme-toggle"
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

const LandingPage = async () => {
    const { userId } = auth()
    if (userId) {
        return redirect('/mail')
    }
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h1 className="text-5xl font-bold mb-6">Welcome to MailMaster</h1>
            <p className="text-xl mb-8">Your intelligent email companion</p>
            <div className="space-x-4">
                <Button>
                    <Link href="/mail">Get Started</Link>
                </Button>
                <Button variant="outline">Learn More</Button>
            </div>
            <div className="mt-12 flex items-center space-x-4">
                <Link href="/sign-in" className="text-sm hover:underline">Sign In</Link>
                <Link href="/sign-up" className="text-sm hover:underline">Sign Up</Link>
                <ModeToggle />
            </div>
        </div>
    )
}

export default LandingPage