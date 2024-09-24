import axios from 'axios'
import crypto from 'crypto'

export const getGravatar = async (email: string) => {
    const sha = crypto.createHash('sha256').update(email).digest('hex')
    try {
        const response = await axios.get(`https://api.gravatar.com/v3/profiles/${sha}`, {
            headers: {
                'Authorization': `Bearer ${process.env.GRAVATAR_API_KEY}`
            }
        })
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null
        }
        throw error
    }
}


console.log(await getGravatar('lukas@cascading.ai'))