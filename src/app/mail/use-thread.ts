import { atom, useAtom } from "jotai"


const configAtom = atom<string | null>(null)

export function useThread() {
  return useAtom(configAtom)
}
