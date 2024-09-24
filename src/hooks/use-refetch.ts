import { useQueryClient } from '@tanstack/react-query'

const useRefetch = () => {
    // refetches all active trpc queries
    const queryClient = useQueryClient()
    return async () => {
        await queryClient.refetchQueries({ type: 'active' })
    }
}

export default useRefetch
