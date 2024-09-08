'use client'
import { Button } from "@/components/ui/button"
import { getAurinkoAuthorizationUrl } from "@/lib/aurinko"
import { api } from "@/trpc/react"

export default function AuthoriseButton() {
    const authorize = api.mail.authorize.useMutation()
    return <Button onClick={async () => {
        // authorize.mutate(undefined, {
        //     onSuccess: ({ authUrl }) => {
        //         window.location.href = authUrl
        //     }
        // })
        const url = await getAurinkoAuthorizationUrl('Google')
        window.location.href = url
    }}>
        Authorize Email
    </Button>
}

// 0YC7WbDiYeszCs_5n3uv8iIZGiGbtiznH7X03akZmHI&requestId=e12deee1-f59c-485e-9f55-5cd6d5db0569