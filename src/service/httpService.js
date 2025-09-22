export const httpRequest = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    throw error
  }
}

