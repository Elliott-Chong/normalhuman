'use client'
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Pencil } from "lucide-react"

import React from 'react'
import EmailEditor from "./email-editor"
import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import { toast } from "sonner"

const ComposeButton = () => {
    const [open, setOpen] = React.useState(false)
    const [accountId] = useLocalStorage('accountId', '')
    const [toValues, setToValues] = React.useState<{ label: string; value: string; }[]>([])
    const [ccValues, setCcValues] = React.useState<{ label: string; value: string; }[]>([])
    const [subject, setSubject] = React.useState<string>('')
    const { data: account } = api.mail.getMyAccount.useQuery({ accountId })


    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'c' && (event.ctrlKey || event.metaKey) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const sendEmail = api.mail.sendEmail.useMutation()

    const handleSend = async (value: string) => {
        console.log(account)
        console.log({ value })
        if (!account) return
        sendEmail.mutate({
            accountId,
            threadId: undefined,
            body: value,
            subject,
            from: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            to: toValues.map(to => ({ name: to.value, address: to.value })),
            cc: ccValues.map(cc => ({ name: cc.value, address: cc.value })),
            replyTo: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            inReplyTo: undefined,
        }, {
            onSuccess: () => {
                toast.success("Email sent")
                setOpen(false)
            },
            onError: (error) => {
                console.log(error)
                toast.error(error.message)
            }
        })
    }


    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button>
                    <Pencil className='size-4 mr-1' />
                    Compose
                </Button>
            </DrawerTrigger>
            <DrawerContent className="">
                <DrawerHeader>
                    <DrawerTitle>Compose Email</DrawerTitle>
                    <EmailEditor
                        toValues={toValues}
                        ccValues={ccValues}

                        onToChange={(values) => {
                            setToValues(values)
                        }}
                        onCcChange={(values) => {
                            setCcValues(values)
                        }}

                        subject={subject}
                        setSubject={setSubject}

                        to={toValues.map(to => to.value)}
                        handleSend={handleSend}
                        isSending={sendEmail.isPending}

                        defaultToolbarExpand
                    />
                </DrawerHeader>
            </DrawerContent>

        </Drawer>
    )
}

export default ComposeButton