'use client'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { api } from "@/trpc/react"
import { Webhook } from "lucide-react"

import React from 'react'
import { useLocalStorage } from "usehooks-ts"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const WebhookDebugger = () => {
    const [accountId, setAccountId] = useLocalStorage('accountId', '')
    const { data, isLoading, refetch } = api.webhooks.getWebhooks.useQuery({
        accountId
    })

    const createWebhook = api.webhooks.createWebhook.useMutation()
    const deleteWebhook = api.webhooks.deleteWebhook.useMutation()

    const [newWebhookUrl, setNewWebhookUrl] = React.useState('')

    const handleCreateWebhook = async () => {
        toast.promise(
            createWebhook.mutateAsync({
                accountId,
                notificationUrl: newWebhookUrl
            }),
            {
                loading: 'Creating webhook...',
                success: () => {
                    setNewWebhookUrl('')
                    refetch()
                    return 'Webhook created!'
                },
                error: err => {
                    console.error(err)
                    return 'Error creating webhook'
                }
            }
        )
    }

    const handleDeleteWebhook = async (webhookId: string) => {
        toast.promise(
            deleteWebhook.mutateAsync({
                accountId,
                webhookId
            }),
            {
                loading: 'Deleting webhook...',
                success: () => {
                    refetch()
                    return 'Webhook deleted!'
                },
                error: 'Error deleting webhook'
            }
        )
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <Webhook className="size-4 mr-1" />
                    Debug Webhooks
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Webhook Debugger</DialogTitle>
                    <DialogDescription>
                        {data?.records?.map(record => (
                            <div key={record.id} className="mb-4 p-4 rounded-md bg-slate-100">
                                <div className="mb-2">
                                    <span className="font-semibold">Resource:</span> {record.resource}
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold">URL:</span> {record.notificationUrl}
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold">Status:</span> {record.active ? (
                                        <span className="text-green-600">Active</span>
                                    ) : (
                                        <span className="text-red-600">Inactive</span>
                                    )}
                                </div>
                                {record.failSince && (
                                    <div className="mb-2">
                                        <span className="font-semibold">Failing since:</span> {record.failSince}
                                    </div>
                                )}
                                {record.failDescription && (
                                    <div className="mb-2">
                                        <span className="font-semibold">Fail reason:</span> {record.failDescription}
                                    </div>
                                )}
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteWebhook(record.id.toString())}
                                >
                                    Delete
                                </Button>
                            </div>
                        ))}
                        <div className="mt-4">
                            <Input
                                type="text"
                                placeholder="Enter webhook URL"
                                value={newWebhookUrl}
                                onChange={(e) => setNewWebhookUrl(e.target.value)}
                            />
                            <Button
                                className="mt-2"
                                onClick={handleCreateWebhook}
                                disabled={!newWebhookUrl}
                            >
                                Create Webhook
                            </Button>
                        </div>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}

export default WebhookDebugger