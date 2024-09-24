//@ts-ignore
import { createKeybindingsHandler } from "tinykeys"
import { api, type RouterOutputs } from '@/trpc/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRegisterActions } from 'kbar'
import React, { useMemo } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { useThread } from "../../use-thread"
import { atom, useAtom } from "jotai"
import { toast } from "sonner"
import { getQueryKey } from "@trpc/react-query"
import useRefetch from "@/hooks/use-refetch"
import useThreads from "../../use-threads"
import { isSearchingAtom } from "../search-bar"

export const visualModeAtom = atom(false)
export const visualModeStartIdAtom = atom<string | null>(null)

const useVim = () => {

    const queryClient = useQueryClient()
    const [threadId, setThreadId] = useThread()
    const [accountId] = useLocalStorage('accountId', '')
    const [tab] = useLocalStorage('normalhuman-tab', 'inbox')
    const [done] = useLocalStorage('normalhuman-done', false)
    const { threads: data, queryKey, refetch } = useThreads()

    const setUndone = api.mail.setUndone.useMutation({
        onMutate: async (payload) => {
            if (!payload.threadId && !payload.threadIds) return
            if (!done) return
            toast.success('Undone!')
            await queryClient.cancelQueries({ queryKey })
            const previousData = queryClient.getQueryData<RouterOutputs['mail']['getThreads']>(queryKey)
            queryClient.setQueryData(queryKey, (data: RouterOutputs['mail']['getThreads'] | undefined) => {
                if (!data) return data
                const threadIds = visualMode ? selectedThreadIds : [payload.threadId]
                const newData = data.filter(t => !threadIds.includes(t.id))

                if (visualMode) {
                    setVisualMode(false)
                    setVisualModeStartId(null)
                    const currentIndex = data.findIndex(t => t.id === threadIds.at(-1))
                    setThreadId(newData[currentIndex - threadIds.length + 1]?.id ?? null)
                } else {
                    const currentIndex = data.findIndex(t => t.id === threadId)
                    if (currentIndex !== -1 && threadIds.includes(threadId ?? '')) {
                        const nextThreadId = newData[currentIndex]?.id ?? newData[currentIndex - 1]?.id ?? null
                        setThreadId(nextThreadId)
                    }
                }

                return newData
            })
            return previousData
        },
        onSettled: () => {
            refetch()
        }
    })

    const setDone = api.mail.setDone.useMutation({
        onMutate: async (payload) => {
            if (done) return
            if (!payload.threadId && !payload.threadIds) return
            toast.success('Done!')
            await queryClient.cancelQueries({ queryKey })
            const previousData = queryClient.getQueryData<RouterOutputs['mail']['getThreads']>(queryKey)
            queryClient.setQueryData(queryKey, (data: RouterOutputs['mail']['getThreads'] | undefined) => {
                if (!data) return data
                const threadIds = visualMode ? selectedThreadIds : [payload.threadId]
                const newData = data.filter(t => !threadIds.includes(t.id))

                if (visualMode) {
                    setVisualMode(false)
                    setVisualModeStartId(null)
                    const currentIndex = data.findIndex(t => t.id === threadIds.at(-1))
                    setThreadId(newData[currentIndex - threadIds.length + 1]?.id ?? null)
                } else {
                    const currentIndex = data.findIndex(t => t.id === threadId)
                    if (currentIndex !== -1 && threadIds.includes(threadId ?? '')) {
                        const nextThreadId = newData[currentIndex]?.id ?? newData[currentIndex - 1]?.id ?? null
                        setThreadId(nextThreadId)
                    }
                }

                return newData
            })
            return previousData
        },
        onSettled: () => {
            refetch()
        }
    })

    const [visualMode, setVisualMode] = useAtom(visualModeAtom)
    const [visualModeStartId, setVisualModeStartId] = useAtom(visualModeStartIdAtom)

    const selectedThreadIds = useMemo(() => {
        if (!visualMode || !visualModeStartId || !threadId || !data) return []

        const startIndex = data.findIndex(t => t.id === visualModeStartId)
        const endIndex = data.findIndex(t => t.id === threadId)

        if (startIndex === -1 || endIndex === -1) return []

        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)

        return data.slice(start, end + 1).map(t => t.id)
    }, [visualMode, visualModeStartId, threadId, data])

    const numberRef = React.useRef(0)

    React.useEffect(() => {
        numberRef.current = selectedThreadIds.length
    }, [selectedThreadIds])

    React.useEffect(() => {
        if (visualMode) {
            toast.info(`${numberRef.current} thread${numberRef.current !== 1 ? 's' : ''} selected`, {
                id: 'visual-mode-toast',
                duration: Infinity,
                position: 'bottom-center'
            });
        } else {
            toast.dismiss('visual-mode-toast');
        }
    }, [visualMode, selectedThreadIds]);


    React.useEffect(() => {
        if (!threadId) return
        // move thread it into view 
        const element = document.getElementById(`thread-${threadId}`)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [threadId])


    const isInputElement = (element: Element | null): boolean => {
        return !!(element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement ||
            element?.hasAttribute('contenteditable'));
    };

    let handler = (event: KeyboardEvent) => {
        if (isInputElement(document.activeElement)) {
            return;
        }

        return createKeybindingsHandler({
            "j": () => {
                // Move cursor down
                if (data && data.length > 0) {
                    if (!threadId) {
                        setThreadId(data[0]!.id)
                        return
                    }
                    const currentIndex = data.findIndex(t => t.id === threadId);
                    if (currentIndex < data.length - 1) {
                        const nextId = data[currentIndex + 1]!.id
                        setThreadId(nextId)
                    }
                }
            },
            "k": () => {
                // Move cursor up
                if (data && data.length > 0) {
                    if (!threadId) {
                        setThreadId(data[0]!.id)
                        return
                    }
                    const currentIndex = data.findIndex(t => t.id === threadId);
                    if (currentIndex > 0) {
                        const prevId = data[currentIndex - 1]!.id
                        setThreadId(prevId)
                    }
                }
            },
            "g g": () => {
                // Move to the first thread
                if (data && data.length > 0) {
                    const firstId = data[0]!.id
                    setThreadId(firstId)
                }
            },
            "Shift+G": () => {
                // Move to the last thread
                if (data && data.length > 0) {
                    const lastId = data[data.length - 1]!.id
                    setThreadId(lastId)
                }
            },
            "Shift+V": () => {
                setVisualMode(true)
                if (!threadId) return
                setVisualModeStartId(threadId)
            },
            "Escape": () => {
                setVisualMode(false)
                setVisualModeStartId(null)
            },
            "d": () => {
                if (done) return
                if (!threadId || !selectedThreadIds) return
                if (visualMode) {
                    setDone.mutate({ accountId, threadIds: selectedThreadIds })
                } else {
                    setDone.mutate({ accountId, threadId })
                }
            },
            "u": () => {
                if (!done) return
                if (!threadId || !selectedThreadIds) return
                if (visualMode) {
                    setUndone.mutate({ accountId, threadIds: selectedThreadIds })
                } else {
                    setUndone.mutate({ accountId, threadId })
                }
            }
        })(event);
    };

    React.useEffect(() => {
        if (typeof window == 'undefined') return
        window.addEventListener("keydown", handler)
        return () => {
            window.removeEventListener("keydown", handler)
        }
    }, [handler, threadId, data, visualMode, visualModeStartId])

    return { selectedThreadIds, visualMode }
}

export default useVim